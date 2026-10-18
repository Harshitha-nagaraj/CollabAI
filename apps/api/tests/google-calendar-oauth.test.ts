/**
 * @file tests/google-calendar-oauth.test.ts
 *
 * Automated test suite for Google Calendar Phase 2:
 * - OAuth state token generation and CSRF validation
 * - Workspace authorization and membership access control
 * - AES-256-GCM token encryption at rest
 * - Database credential persistence and status updates
 * - Disconnection and token revocation handling
 * - Error cases (tampered state, expired state, non-member access)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import {
  encryptToken,
  decryptToken,
  createOAuthState,
  verifyOAuthState,
  generateSecureNonce,
} from '../src/utils/crypto.js';
import { GoogleCalendarService } from '../src/services/google-calendar.service.js';
import { IntegrationService } from '../src/services/integration.service.js';

describe('Google Calendar Phase 2 Integration Test Suite', () => {
  let memberUser: any;
  let nonMemberUser: any;
  let testWorkspace: any;
  let otherWorkspace: any;

  before(async () => {
    const ts = Date.now();

    // 1. Create test user who will be workspace member
    memberUser = await prisma.user.create({
      data: {
        email: `gcal_member_${ts}@collabai.internal`,
        name: 'GCal Member User',
        password: 'hashed-password-123',
      },
    });

    // 2. Create test user who is NOT a workspace member
    nonMemberUser = await prisma.user.create({
      data: {
        email: `gcal_non_member_${ts}@collabai.internal`,
        name: 'GCal Non Member User',
        password: 'hashed-password-123',
      },
    });

    // 3. Create primary workspace with memberUser
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `GCal Workspace ${ts}`,
        memberships: {
          create: {
            userId: memberUser.id,
            role: 'MEMBER',
          },
        },
      },
    });

    // 4. Create secondary workspace where nonMemberUser belongs
    otherWorkspace = await prisma.workspace.create({
      data: {
        name: `Isolated Workspace ${ts}`,
        memberships: {
          create: {
            userId: nonMemberUser.id,
            role: 'MEMBER',
          },
        },
      },
    });
  });

  after(async () => {
    // Cleanup any created credentials
    await prisma.integrationCredential.deleteMany({
      where: {
        workspaceId: { in: [testWorkspace.id, otherWorkspace.id] },
      },
    });

    // Cleanup memberships and workspaces
    await prisma.membership.deleteMany({
      where: {
        workspaceId: { in: [testWorkspace.id, otherWorkspace.id] },
      },
    });

    await prisma.workspace.deleteMany({
      where: {
        id: { in: [testWorkspace.id, otherWorkspace.id] },
      },
    });

    // Cleanup users
    await prisma.user.deleteMany({
      where: {
        id: { in: [memberUser.id, nonMemberUser.id] },
      },
    });
  });

  describe('1. AES-256-GCM Token Encryption at Rest', () => {
    it('encrypts access and refresh tokens into authenticated ciphertext format', () => {
      const rawAccessToken = 'ya29.a0AfH6SMB_sample_google_access_token_1234567890';
      const rawRefreshToken = '1//0gM7X_sample_google_refresh_token_abcdefghij';

      const encryptedAccess = encryptToken(rawAccessToken);
      const encryptedRefresh = encryptToken(rawRefreshToken);

      assert.notEqual(encryptedAccess, rawAccessToken, 'Ciphertext must not equal plaintext');
      assert.ok(!encryptedAccess.includes(rawAccessToken), 'Plaintext must not appear in encrypted string');

      // Verify format: iv:authTag:ciphertext
      const accessParts = encryptedAccess.split(':');
      assert.equal(accessParts.length, 3, 'Encrypted format must be iv:authTag:ciphertext');
      assert.equal(accessParts[0]?.length, 24, 'IV length must be 12 bytes (24 hex characters)');
      assert.equal(accessParts[1]?.length, 32, 'Auth tag length must be 16 bytes (32 hex characters)');

      // Verify clean decryption
      const decryptedAccess = decryptToken(encryptedAccess);
      const decryptedRefresh = decryptToken(encryptedRefresh);

      assert.equal(decryptedAccess, rawAccessToken, 'Decrypted token must match original access token');
      assert.equal(decryptedRefresh, rawRefreshToken, 'Decrypted token must match original refresh token');
    });

    it('rejects tampered or forged ciphertexts with authentication error', () => {
      const rawToken = 'ya29.valid_token_test';
      const encrypted = encryptToken(rawToken);
      const parts = encrypted.split(':');

      // Tamper with the ciphertext byte
      const tamperedCiphertext = (parts[2] || '').slice(0, -2) + 'ff';
      const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

      assert.throws(
        () => decryptToken(tampered),
        /Unsupported state or unable to authenticate data/,
        'GCM authentication tag must fail on tampered ciphertext'
      );
    });
  });

  describe('2. OAuth State Validation & CSRF Protection', () => {
    it('generates signed state and decodes valid parameters', () => {
      const nonce = generateSecureNonce();
      const stateToken = createOAuthState({
        workspaceId: testWorkspace.id,
        userId: memberUser.id,
        provider: 'google-calendar',
        nonce,
        returnTo: '/dashboard/meetings',
      });

      assert.ok(stateToken, 'Signed state token must be generated');

      const verified = verifyOAuthState(stateToken);
      assert.equal(verified.workspaceId, testWorkspace.id);
      assert.equal(verified.userId, memberUser.id);
      assert.equal(verified.provider, 'google-calendar');
      assert.equal(verified.nonce, nonce);
      assert.equal(verified.returnTo, '/dashboard/meetings');
    });

    it('rejects forged, tampered, or invalid state tokens', () => {
      // 1. Random string
      assert.throws(
        () => verifyOAuthState('random-invalid-string'),
        /Invalid or forged OAuth state token/,
        'Should reject random invalid strings'
      );

      // 2. Tampered JWT signature
      const validState = createOAuthState({
        workspaceId: testWorkspace.id,
        userId: memberUser.id,
        provider: 'google-calendar',
        nonce: generateSecureNonce(),
      });
      const tamperedState = validState.slice(0, -5) + 'abcde';

      assert.throws(
        () => verifyOAuthState(tamperedState),
        /Invalid or forged OAuth state token/,
        'Should reject tampered token signatures'
      );
    });
  });

  describe('3. Workspace Authorization & Membership Access Control', () => {
    it('blocks non-members from initiating Google OAuth for a workspace', async () => {
      await assert.rejects(
        async () => {
          await GoogleCalendarService.getAuthorizationUrl(
            nonMemberUser.id,
            testWorkspace.id // nonMemberUser does not belong to testWorkspace
          );
        },
        /Access denied: You are not a member of this workspace/,
        'Non-member user must be blocked from initiating OAuth'
      );
    });

    it('blocks non-members from disconnecting another workspace Google Calendar', async () => {
      await assert.rejects(
        async () => {
          await GoogleCalendarService.disconnect(
            testWorkspace.id,
            nonMemberUser.id
          );
        },
        /Access denied: You are not a member of this workspace/,
        'Non-member user must be blocked from disconnecting credentials'
      );
    });
  });

  describe('4. Token Storage, Status Verification & Disconnection Lifecycle', () => {
    it('correctly updates connection status from NOT_CONNECTED to CONNECTED and back on disconnect', async () => {
      // Step A: Initial state -> NOT_CONNECTED
      const initialIntegrations = await IntegrationService.getWorkspaceIntegrations(
        testWorkspace.id,
        memberUser.id
      );
      const gcalInitial = initialIntegrations.find((i) => i.id === 'google-calendar');

      assert.ok(gcalInitial);
      assert.notEqual(gcalInitial.status, 'CONNECTED', 'Status must not be CONNECTED before authorization');
      assert.equal(gcalInitial.isVerified, false);
      assert.equal(gcalInitial.connectedAccount, null);

      // Step B: Simulate successful OAuth callback persistence with encrypted tokens
      const simulatedRawAccessToken = 'ya29.simulated_active_google_token_777';
      const simulatedRawRefreshToken = '1//0gM7X_simulated_refresh_token_888';
      const testAccountEmail = 'developer@collabai.internal';
      const testAccountName = 'CollabAI Tester';

      await prisma.integrationCredential.create({
        data: {
          provider: 'google-calendar',
          workspaceId: testWorkspace.id,
          userId: memberUser.id,
          accountEmail: testAccountEmail,
          accountName: testAccountName,
          encryptedAccessToken: encryptToken(simulatedRawAccessToken),
          encryptedRefreshToken: encryptToken(simulatedRawRefreshToken),
          tokenType: 'Bearer',
          scope: 'https://www.googleapis.com/auth/calendar.events openid email',
          expiresAt: new Date(Date.now() + 3600 * 1000),
          status: 'CONNECTED',
        },
      });

      // Step C: Verify raw database contents are encrypted at rest
      const rawStoredCred = await prisma.integrationCredential.findFirst({
        where: {
          provider: 'google-calendar',
          workspaceId: testWorkspace.id,
          userId: memberUser.id,
        },
      });

      assert.ok(rawStoredCred);
      assert.notEqual(rawStoredCred.encryptedAccessToken, simulatedRawAccessToken);
      assert.ok(rawStoredCred.encryptedAccessToken.includes(':'));
      assert.equal(decryptToken(rawStoredCred.encryptedAccessToken), simulatedRawAccessToken);

      // Step D: Verify IntegrationService reports CONNECTED & verified
      const updatedIntegrations = await IntegrationService.getWorkspaceIntegrations(
        testWorkspace.id,
        memberUser.id
      );
      const gcalUpdated = updatedIntegrations.find((i) => i.id === 'google-calendar');

      assert.ok(gcalUpdated);
      assert.equal(gcalUpdated.status, 'CONNECTED', 'Status must now be CONNECTED');
      assert.equal(gcalUpdated.isVerified, true, 'isVerified must be true');
      assert.equal(gcalUpdated.connectedAccount?.email, testAccountEmail);
      assert.equal(gcalUpdated.connectedAccount?.name, testAccountName);

      // Step E: Run provider diagnostic verification
      const verifyResult = await IntegrationService.verifyProvider(
        testWorkspace.id,
        'google-calendar',
        memberUser.id
      );
      assert.equal(verifyResult.status, 'CONNECTED');
      assert.equal(verifyResult.isVerified, true);
      assert.equal(verifyResult.details?.accountEmail, testAccountEmail);

      // Step F: Test disconnect endpoint
      const disconnectResult = await GoogleCalendarService.disconnect(
        testWorkspace.id,
        memberUser.id
      );
      assert.equal(disconnectResult.success, true);

      // Step G: Confirm credential is deleted from database
      const credAfterDelete = await prisma.integrationCredential.findFirst({
        where: {
          provider: 'google-calendar',
          workspaceId: testWorkspace.id,
          userId: memberUser.id,
        },
      });
      assert.equal(credAfterDelete, null, 'Credential record must be removed from database');

      // Step H: Confirm status reverts back to NOT_CONNECTED
      const finalIntegrations = await IntegrationService.getWorkspaceIntegrations(
        testWorkspace.id,
        memberUser.id
      );
      const gcalFinal = finalIntegrations.find((i) => i.id === 'google-calendar');
      assert.notEqual(gcalFinal?.status, 'CONNECTED');
      assert.equal(gcalFinal?.isVerified, false);
      assert.equal(gcalFinal?.connectedAccount, null);
    });
  });
});
