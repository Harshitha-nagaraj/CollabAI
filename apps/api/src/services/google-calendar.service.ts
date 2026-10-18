/**
 * @file services/google-calendar.service.ts
 *
 * Service for Google Calendar OAuth 2.0 authorization, callback processing,
 * token lifecycle management, and connection revocation.
 */

import { google } from 'googleapis';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import {
  encryptToken,
  decryptToken,
  generateSecureNonce,
  createOAuthState,
  verifyOAuthState,
} from '../utils/crypto.js';

// Minimal required scopes for Google Calendar integration in CollabAI
const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export class GoogleCalendarService {
  /**
   * Instantiate an official Google OAuth2 Client using server credentials.
   */
  static getOAuth2Client() {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      env.GOOGLE_REDIRECT_URI ||
      `http://localhost:${env.PORT}/api/v1/integrations/google/callback`;

    if (!clientId || !clientSecret) {
      throw new BadRequestError(
        'Google OAuth credentials are not configured on the server. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to apps/api/.env.'
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate an authorization URL with signed, tamper-proof state for CSRF protection.
   */
  static async getAuthorizationUrl(
    userId: string,
    workspaceId: string,
    returnTo?: string
  ): Promise<{ url: string; state: string }> {
    // 1. Verify workspace membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedError('Access denied: You are not a member of this workspace.');
    }

    const oauth2Client = this.getOAuth2Client();
    const nonce = generateSecureNonce();

    // 2. Generate signed, expiring state token
    const state = createOAuthState({
      workspaceId,
      userId,
      provider: 'google-calendar',
      nonce,
      returnTo: returnTo || '/dashboard/meetings',
    });

    // 3. Generate authorization URL
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh_token
      prompt: 'consent', // Force consent prompt to guarantee refresh_token
      scope: GOOGLE_CALENDAR_SCOPES,
      state,
      include_granted_scopes: true,
    });

    return { url, state };
  }

  /**
   * Process OAuth callback from Google:
   * Validates state, exchanges code for tokens, retrieves user profile,
   * encrypts tokens at rest, and persists to database.
   */
  static async handleOAuthCallback(code: string, stateToken: string) {
    // 1. Verify and unpack state
    const state = verifyOAuthState(stateToken);

    if (state.provider !== 'google-calendar') {
      throw new BadRequestError('Invalid provider in OAuth state.');
    }

    const { workspaceId, userId } = state;

    // 2. Verify user still belongs to workspace
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedError('Access denied: User is no longer a member of this workspace.');
    }

    const oauth2Client = this.getOAuth2Client();

    // 3. Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) {
      throw new BadRequestError('Failed to obtain access token from Google.');
    }

    oauth2Client.setCredentials(tokens);

    // 4. Retrieve Google user profile for display and verification
    let accountEmail: string | null = null;
    let accountName: string | null = null;

    try {
      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2Api.userinfo.get();
      accountEmail = userInfo.data.email || null;
      accountName = userInfo.data.name || null;
    } catch {
      // Fallback if userinfo is unavailable
      accountEmail = null;
    }

    // 5. Encrypt tokens at rest using AES-256-GCM
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // 6. Save or update credential record in PostgreSQL
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    const credential = await prisma.integrationCredential.upsert({
      where: {
        provider_workspaceId_userId: {
          provider: 'google-calendar',
          workspaceId,
          userId,
        },
      },
      create: {
        provider: 'google-calendar',
        workspaceId,
        userId,
        accountEmail,
        accountName,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || null,
        expiresAt,
        status: 'CONNECTED',
      },
      update: {
        accountEmail,
        accountName,
        encryptedAccessToken,
        ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || null,
        expiresAt,
        status: 'CONNECTED',
        updatedAt: new Date(),
      },
    });

    return {
      credentialId: credential.id,
      workspaceId,
      userId,
      accountEmail,
      accountName,
      returnTo: state.returnTo || '/dashboard/meetings',
    };
  }

  /**
   * Get active connection details for a workspace/user (without exposing secrets).
   */
  static async getConnectionStatus(workspaceId: string, userId: string) {
    const credential = await prisma.integrationCredential.findUnique({
      where: {
        provider_workspaceId_userId: {
          provider: 'google-calendar',
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        provider: true,
        workspaceId: true,
        userId: true,
        accountEmail: true,
        accountName: true,
        expiresAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!credential || credential.status !== 'CONNECTED') {
      return {
        isConnected: false,
        accountEmail: null,
        accountName: null,
        connectedAt: null,
        status: 'NOT_CONNECTED',
      };
    }

    return {
      isConnected: true,
      accountEmail: credential.accountEmail,
      accountName: credential.accountName,
      connectedAt: credential.createdAt.toISOString(),
      expiresAt: credential.expiresAt ? credential.expiresAt.toISOString() : null,
      status: credential.status,
    };
  }

  /**
   * Disconnect and revoke Google Calendar credentials for a user in a workspace.
   */
  static async disconnect(workspaceId: string, userId: string) {
    // 1. Verify workspace membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedError('Access denied: You are not a member of this workspace.');
    }

    // 2. Find credential record
    const credential = await prisma.integrationCredential.findUnique({
      where: {
        provider_workspaceId_userId: {
          provider: 'google-calendar',
          workspaceId,
          userId,
        },
      },
    });

    if (!credential) {
      throw new NotFoundError('No active Google Calendar connection found for this user.');
    }

    // 3. Attempt token revocation with Google (graceful error handling)
    try {
      const accessToken = decryptToken(credential.encryptedAccessToken);
      const oauth2Client = this.getOAuth2Client();
      await oauth2Client.revokeToken(accessToken);
    } catch {
      // If token is already expired or revoked at Google, proceed with DB cleanup
    }

    // 4. Delete the credential record from PostgreSQL
    await prisma.integrationCredential.delete({
      where: {
        id: credential.id,
      },
    });

    return {
      success: true,
      message: 'Google Calendar has been disconnected successfully.',
    };
  }

  /**
   * Get an authenticated Google Calendar API client with automatic token refresh.
   */
  static async getCalendarClient(workspaceId: string, userId: string) {
    const credential = await prisma.integrationCredential.findUnique({
      where: {
        provider_workspaceId_userId: {
          provider: 'google-calendar',
          workspaceId,
          userId,
        },
      },
    });

    if (!credential) {
      throw new NotFoundError('Google Calendar is not connected for this workspace.');
    }

    const oauth2Client = this.getOAuth2Client();
    const accessToken = decryptToken(credential.encryptedAccessToken);
    const refreshToken = credential.encryptedRefreshToken
      ? decryptToken(credential.encryptedRefreshToken)
      : undefined;

    const credentialsPayload: any = {
      access_token: accessToken,
    };
    if (refreshToken) {
      credentialsPayload.refresh_token = refreshToken;
    }
    if (credential.expiresAt) {
      credentialsPayload.expiry_date = credential.expiresAt.getTime();
    }
    oauth2Client.setCredentials(credentialsPayload);

    // Handle token refresh event: re-encrypt and update database
    oauth2Client.on('tokens', async (newTokens) => {
      try {
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (newTokens.access_token) {
          updateData.encryptedAccessToken = encryptToken(newTokens.access_token);
        }
        if (newTokens.refresh_token) {
          updateData.encryptedRefreshToken = encryptToken(newTokens.refresh_token);
        }
        if (newTokens.expiry_date) {
          updateData.expiresAt = new Date(newTokens.expiry_date);
        }

        await prisma.integrationCredential.update({
          where: { id: credential.id },
          data: updateData,
        });
      } catch {
        // Silently handle refresh persistence errors
      }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }
}
