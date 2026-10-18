/**
 * @file services/integration.service.ts
 *
 * Enterprise Integrations Hub Service.
 * Provides live connection verification, provider diagnostics,
 * and developer console setup guides for CollabAI.
 */

import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export type IntegrationStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'SETUP_REQUIRED';

export interface SetupGuide {
  providerName: string;
  consoleName: string;
  consoleUrl: string;
  requiredScopes: string[];
  redirectUri: string;
  steps: string[];
  environmentVariables: {
    key: string;
    description: string;
    isSet: boolean;
  }[];
  phaseNote: string;
}

export interface WorkspaceIntegration {
  id: string;
  name: string;
  icon: string;
  category: 'Video Conferencing' | 'Calendar' | 'Communication' | 'Development';
  desc: string;
  status: IntegrationStatus;
  isVerified: boolean;
  summary: string;
  serverConfigured: boolean;
  missingEnvVars: string[];
  capabilities: string[];
  setupGuide: SetupGuide;
  connectedAccount?: {
    email?: string | null;
    name?: string | null;
    connectedAt?: string;
  } | null;
  connectedItems?: Array<{
    id: string;
    name: string;
    url?: string;
    createdAt?: string;
  }>;
}

export interface VerificationResult {
  providerId: string;
  status: IntegrationStatus;
  isVerified: boolean;
  title: string;
  message: string;
  missingEnvVars?: string[];
  details?: Record<string, any>;
  timestamp: string;
}

export class IntegrationService {
  /**
   * Get honest, verified integration statuses for a specific workspace.
   */
  static async getWorkspaceIntegrations(
    workspaceId: string,
    userId?: string
  ): Promise<WorkspaceIntegration[]> {
    // 1. Audit GitHub Repositories (real database records)
    const githubRepos = await prisma.gitHubRepository.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        fullName: true,
        url: true,
        createdAt: true,
      },
    });

    const isGitHubConnected = githubRepos.length > 0;

    // 2. Audit Google Calendar Credentials in PostgreSQL
    const googleCredential = await prisma.integrationCredential.findFirst({
      where: {
        provider: 'google-calendar',
        workspaceId,
        ...(userId ? { userId } : {}),
        status: 'CONNECTED',
      },
    });
    const isGoogleCalendarConnected = Boolean(googleCredential);

    // 3. Audit Server Environment Variables for Third-Party Providers
    const isGoogleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
    const isMicrosoftConfigured = Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
    const isSlackConfigured = Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET);
    const isZoomConfigured = Boolean(env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET);

    const redirectBase =
      env.GOOGLE_REDIRECT_URI || `http://localhost:${env.PORT}/api/v1/integrations/google/callback`;

    const integrations: WorkspaceIntegration[] = [
      // 1. Google Meet
      {
        id: 'google-meet',
        name: 'Google Meet',
        icon: '📹',
        category: 'Video Conferencing',
        desc: 'Sync live video calls, capture attendance, and ingest real-time transcripts for AI decision extraction.',
        status: isGoogleConfigured ? 'SETUP_REQUIRED' : 'NOT_CONNECTED',
        isVerified: false,
        serverConfigured: isGoogleConfigured,
        missingEnvVars: [
          ...(!env.GOOGLE_CLIENT_ID ? ['GOOGLE_CLIENT_ID'] : []),
          ...(!env.GOOGLE_CLIENT_SECRET ? ['GOOGLE_CLIENT_SECRET'] : []),
        ],
        summary: isGoogleConfigured
          ? 'Google Cloud credentials present on server. OAuth account authorization pending Phase 2.'
          : 'Not connected. Requires Google Cloud Console OAuth 2.0 configuration.',
        capabilities: [
          'Generate Google Meet join links directly from Meeting scheduler',
          'Import participant attendance records into CollabAI Meeting Hub',
          'Stream audio closed captions to AI Meeting Intelligence service',
        ],
        setupGuide: {
          providerName: 'Google Meet',
          consoleName: 'Google Cloud Console',
          consoleUrl: 'https://console.cloud.google.com/apis/credentials',
          requiredScopes: [
            'https://www.googleapis.com/auth/meetings.space.created',
            'https://www.googleapis.com/auth/calendar.events',
          ],
          redirectUri: `${redirectBase}/google/callback`,
          steps: [
            'Create or select a project in Google Cloud Console (e.g. "CollabAI").',
            'Enable Google Meet API & Google Calendar API under "APIs & Services > Library".',
            'Configure your OAuth Consent Screen with User Type "External" (or Internal for Google Workspace org).',
            'Add developer scopes and test users (your Google email address).',
            'Navigate to "Credentials > Create Credentials > OAuth client ID > Web application".',
            `Add Authorized Redirect URI: ${redirectBase}/google/callback`,
            'Copy Client ID and Client Secret into apps/api/.env (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).',
          ],
          environmentVariables: [
            {
              key: 'GOOGLE_CLIENT_ID',
              description: 'OAuth 2.0 Client ID from Google Cloud Console',
              isSet: Boolean(env.GOOGLE_CLIENT_ID),
            },
            {
              key: 'GOOGLE_CLIENT_SECRET',
              description: 'OAuth 2.0 Client Secret from Google Cloud Console',
              isSet: Boolean(env.GOOGLE_CLIENT_SECRET),
            },
          ],
          phaseNote:
            'Phase 1 provides configuration verification & credential validation. OAuth token exchange and live meeting sync will be enabled in Phase 2.',
        },
      },

      // 2. Microsoft Teams
      {
        id: 'microsoft-teams',
        name: 'Microsoft Teams',
        icon: '🟦',
        category: 'Video Conferencing',
        desc: 'Capture Microsoft Teams meeting recordings, auto-transcribe discussions, and sync agenda notes.',
        status: isMicrosoftConfigured ? 'SETUP_REQUIRED' : 'NOT_CONNECTED',
        isVerified: false,
        serverConfigured: isMicrosoftConfigured,
        missingEnvVars: [
          ...(!env.MICROSOFT_CLIENT_ID ? ['MICROSOFT_CLIENT_ID'] : []),
          ...(!env.MICROSOFT_CLIENT_SECRET ? ['MICROSOFT_CLIENT_SECRET'] : []),
        ],
        summary: isMicrosoftConfigured
          ? 'Azure credentials present on server. Microsoft Graph authorization pending Phase 2.'
          : 'Not connected. Requires Microsoft Entra ID (Azure Portal) App Registration.',
        capabilities: [
          'Create Microsoft Teams online meetings automatically on schedule',
          'Ingest Teams meeting transcripts and AI summary notes',
          'Sync team presence and participant metadata',
        ],
        setupGuide: {
          providerName: 'Microsoft Teams',
          consoleName: 'Microsoft Entra ID (Azure Portal)',
          consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
          requiredScopes: ['OnlineMeetings.ReadWrite', 'User.Read', 'offline_access'],
          redirectUri: `${redirectBase}/microsoft/callback`,
          steps: [
            'Register a new application in Microsoft Entra admin center / Azure Portal.',
            'Choose "Accounts in any organizational directory (Multitenant) and personal accounts".',
            `Set Redirect URI (Web): ${redirectBase}/microsoft/callback`,
            'Under "Certificates & secrets", generate a new Client Secret.',
            'Under "API permissions", add delegated Microsoft Graph permissions: OnlineMeetings.ReadWrite.',
            'Save MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in apps/api/.env.',
          ],
          environmentVariables: [
            {
              key: 'MICROSOFT_CLIENT_ID',
              description: 'Application (client) ID from Azure App Registration',
              isSet: Boolean(env.MICROSOFT_CLIENT_ID),
            },
            {
              key: 'MICROSOFT_CLIENT_SECRET',
              description: 'Client Secret value from Certificates & Secrets',
              isSet: Boolean(env.MICROSOFT_CLIENT_SECRET),
            },
          ],
          phaseNote:
            'Phase 1 provides architecture readiness and tenant check. Microsoft Graph token exchange is scheduled for Phase 2.',
        },
      },

      // 3. Zoom Meetings
      {
        id: 'zoom',
        name: 'Zoom Meetings',
        icon: '🎥',
        category: 'Video Conferencing',
        desc: 'Auto-import Zoom cloud recordings, parse spoken audio transcripts, and extract action items.',
        status: isZoomConfigured ? 'SETUP_REQUIRED' : 'NOT_CONNECTED',
        isVerified: false,
        serverConfigured: isZoomConfigured,
        missingEnvVars: [
          ...(!env.ZOOM_CLIENT_ID ? ['ZOOM_CLIENT_ID'] : []),
          ...(!env.ZOOM_CLIENT_SECRET ? ['ZOOM_CLIENT_SECRET'] : []),
        ],
        summary: isZoomConfigured
          ? 'Zoom credentials present on server. App Marketplace authorization pending Phase 2.'
          : 'Not connected. Requires Zoom App Marketplace OAuth registration.',
        capabilities: [
          'Schedule Zoom meetings with passcode and waiting room controls',
          'Webhook listener for meeting.ended and recording.completed events',
          'Automated import of Zoom Cloud Transcripts into CollabAI Intelligence',
        ],
        setupGuide: {
          providerName: 'Zoom Meetings',
          consoleName: 'Zoom App Marketplace',
          consoleUrl: 'https://marketplace.zoom.us/develop/create',
          requiredScopes: ['meeting:write:admin', 'meeting:read:admin', 'recording:read:admin'],
          redirectUri: `${redirectBase}/zoom/callback`,
          steps: [
            'Log into Zoom App Marketplace and click "Develop > Build App".',
            'Select "OAuth" (or Server-to-Server OAuth for workspace-wide sync).',
            `Add OAuth Redirect URL for CollabAI: ${redirectBase}/zoom/callback`,
            'Add scopes: meeting:write, meeting:read, recording:read.',
            'Save ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in apps/api/.env.',
          ],
          environmentVariables: [
            {
              key: 'ZOOM_CLIENT_ID',
              description: 'Client ID from Zoom Marketplace App',
              isSet: Boolean(env.ZOOM_CLIENT_ID),
            },
            {
              key: 'ZOOM_CLIENT_SECRET',
              description: 'Client Secret from Zoom Marketplace App',
              isSet: Boolean(env.ZOOM_CLIENT_SECRET),
            },
          ],
          phaseNote:
            'Phase 1 displays verified status and credential verification. Webhook endpoint and token pipeline to follow in Phase 2.',
        },
      },

      // 4. Google Calendar (POSTPONED - COMING SOON)
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        icon: '📅',
        category: 'Calendar',
        desc: 'Google Calendar integration is coming soon. Meeting schedules, attendee RSVPs, and AI notes are managed natively in CollabAI.',
        status: isGoogleCalendarConnected
          ? 'CONNECTED'
          : isGoogleConfigured
          ? 'NOT_CONNECTED'
          : 'SETUP_REQUIRED',
        isVerified: isGoogleCalendarConnected,
        serverConfigured: isGoogleConfigured,
        missingEnvVars: [
          ...(!env.GOOGLE_CLIENT_ID ? ['GOOGLE_CLIENT_ID'] : []),
          ...(!env.GOOGLE_CLIENT_SECRET ? ['GOOGLE_CLIENT_SECRET'] : []),
        ],
        summary: isGoogleCalendarConnected
          ? `Connection record found for ${googleCredential?.accountEmail || 'Google Account'}. Calendar sync is paused.`
          : 'Integration postponed (Coming Soon). External Google Cloud OAuth setup is currently on hold.',
        capabilities: [
          'Coming soon: Two-way sync between CollabAI Scheduled Meetings and Google Calendar',
          'Coming soon: Automatic RSVP tracking and calendar invite updates',
          'Active now: Native CollabAI meeting scheduling, attendance tracking, and AI intelligence',
        ],
        connectedAccount: googleCredential
          ? {
              email: googleCredential.accountEmail,
              name: googleCredential.accountName,
              connectedAt: googleCredential.createdAt.toISOString(),
            }
          : null,
        setupGuide: {
          providerName: 'Google Calendar',
          consoleName: 'Google Cloud Console',
          consoleUrl: 'https://console.cloud.google.com/apis/credentials',
          requiredScopes: [
            'https://www.googleapis.com/auth/calendar.events',
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ],
          redirectUri: redirectBase,
          steps: [
            'External account setup is currently postponed.',
            'Google Calendar OAuth integration is paused pending account configuration.',
          ],
          environmentVariables: [
            {
              key: 'GOOGLE_CLIENT_ID',
              description: 'Google Cloud OAuth 2.0 Client ID',
              isSet: Boolean(env.GOOGLE_CLIENT_ID),
            },
            {
              key: 'GOOGLE_CLIENT_SECRET',
              description: 'Google Cloud OAuth 2.0 Client Secret',
              isSet: Boolean(env.GOOGLE_CLIENT_SECRET),
            },
          ],
          phaseNote:
            'Integration Postponed: External Google Cloud OAuth setup is on hold. OAuth connect controls are paused.',
        },
      },

      // 5. Microsoft Outlook
      {
        id: 'microsoft-outlook',
        name: 'Microsoft Outlook',
        icon: '📧',
        category: 'Calendar',
        desc: 'Sync Outlook calendar events, meeting invites, and automated email action digests.',
        status: isMicrosoftConfigured ? 'SETUP_REQUIRED' : 'NOT_CONNECTED',
        isVerified: false,
        serverConfigured: isMicrosoftConfigured,
        missingEnvVars: [
          ...(!env.MICROSOFT_CLIENT_ID ? ['MICROSOFT_CLIENT_ID'] : []),
          ...(!env.MICROSOFT_CLIENT_SECRET ? ['MICROSOFT_CLIENT_SECRET'] : []),
        ],
        summary: isMicrosoftConfigured
          ? 'Azure credentials present on server. Outlook Calendar authorization pending Phase 2.'
          : 'Not connected. Requires Microsoft Graph Calendar permissions.',
        capabilities: [
          'Sync CollabAI meetings with Outlook personal and work calendars',
          'Send executive summary and decision digests via Outlook Mail API',
        ],
        setupGuide: {
          providerName: 'Microsoft Outlook',
          consoleName: 'Microsoft Azure Portal',
          consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
          requiredScopes: ['Calendars.ReadWrite', 'Mail.Send', 'offline_access'],
          redirectUri: `${redirectBase}/microsoft/callback`,
          steps: [
            'Use the same Azure App Registration as Microsoft Teams.',
            'Add Microsoft Graph API permissions: Calendars.ReadWrite and Mail.Send.',
            'Ensure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are populated in apps/api/.env.',
          ],
          environmentVariables: [
            {
              key: 'MICROSOFT_CLIENT_ID',
              description: 'Application (client) ID from Azure Portal',
              isSet: Boolean(env.MICROSOFT_CLIENT_ID),
            },
            {
              key: 'MICROSOFT_CLIENT_SECRET',
              description: 'Client Secret from Azure Portal',
              isSet: Boolean(env.MICROSOFT_CLIENT_SECRET),
            },
          ],
          phaseNote: 'Phase 1 verification active. Calendar sync logic to run in Phase 2.',
        },
      },

      // 6. Slack Workspace
      {
        id: 'slack',
        name: 'Slack Workspace',
        icon: '💬',
        category: 'Communication',
        desc: 'Dispatch meeting summary notifications, action item assignments, and sprint alerts to Slack channels.',
        status: isSlackConfigured ? 'SETUP_REQUIRED' : 'NOT_CONNECTED',
        isVerified: false,
        serverConfigured: isSlackConfigured,
        missingEnvVars: [
          ...(!env.SLACK_CLIENT_ID ? ['SLACK_CLIENT_ID'] : []),
          ...(!env.SLACK_CLIENT_SECRET ? ['SLACK_CLIENT_SECRET'] : []),
        ],
        summary: isSlackConfigured
          ? 'Slack App credentials present on server. Workspace channel install pending Phase 2.'
          : 'Not connected. Requires Slack Developer App credentials.',
        capabilities: [
          'Broadcast post-meeting decision summaries to selected #channels',
          'Notify assignees directly when action items are approved',
          'Slash command /collabai in Slack for instant sprint queries',
        ],
        setupGuide: {
          providerName: 'Slack Workspace',
          consoleName: 'Slack API Dashboard',
          consoleUrl: 'https://api.slack.com/apps',
          requiredScopes: ['chat:write', 'channels:read', 'incoming-webhook', 'commands'],
          redirectUri: `${redirectBase}/slack/callback`,
          steps: [
            'Go to api.slack.com/apps and click "Create New App > From scratch".',
            'Name the app "CollabAI" and select your development workspace.',
            `Add Redirect URL: ${redirectBase}/slack/callback under "OAuth & Permissions".`,
            'Add Bot Token Scopes: chat:write, channels:read, commands.',
            'Copy "Client ID" and "Client Secret" from "Basic Information" to apps/api/.env.',
          ],
          environmentVariables: [
            {
              key: 'SLACK_CLIENT_ID',
              description: 'Client ID from Slack App Basic Information',
              isSet: Boolean(env.SLACK_CLIENT_ID),
            },
            {
              key: 'SLACK_CLIENT_SECRET',
              description: 'Client Secret from Slack App Basic Information',
              isSet: Boolean(env.SLACK_CLIENT_SECRET),
            },
          ],
          phaseNote:
            'Phase 1 monitors configuration status. Slack bot dispatch triggers will be wired in Phase 2.',
        },
      },

      // 7. GitHub Integration (GENUINELY IMPLEMENTED IN DATABASE)
      {
        id: 'github',
        name: 'GitHub Integration',
        icon: '🐙',
        category: 'Development',
        desc: 'Link meeting action items directly to GitHub pull requests, commits, and engineering releases.',
        status: isGitHubConnected ? 'CONNECTED' : 'NOT_CONNECTED',
        isVerified: isGitHubConnected,
        serverConfigured: true,
        missingEnvVars: [],
        summary: isGitHubConnected
          ? `Verified & Connected: ${githubRepos.length} repository${githubRepos.length === 1 ? '' : 'ies'} linked to this workspace.`
          : 'Not connected. Link a GitHub repository to verify and activate integration.',
        capabilities: [
          'Connect GitHub repositories to current workspace with webhook ingestion',
          'AI-powered PR diff summarization and security risk assessment',
          'Link meeting action items directly to pull requests',
          'Generate automated release notes from merged PRs and closed tasks',
        ],
        setupGuide: {
          providerName: 'GitHub Integration',
          consoleName: 'CollabAI GitHub Management',
          consoleUrl: '/dashboard/github',
          requiredScopes: ['repo', 'read:org', 'webhook'],
          redirectUri: `${redirectBase}/github/callback`,
          steps: [
            'Enter repository owner and name (e.g. "collabai/api" or "collabai/web").',
            'Click "Connect Repository" to register repository in workspace database.',
            'Configure GitHub Webhook in your repo settings pointing to: http://localhost:4000/api/v1/github/webhooks.',
            'Incoming pull request events will automatically be recorded and tracked.',
          ],
          environmentVariables: [],
          phaseNote:
            'Genuinely implemented in Phase 1! Database models (GitHubRepository, PullRequest, CommitRecord) and API routes are live.',
        },
        connectedItems: githubRepos.map((r) => ({
          id: r.id,
          name: r.fullName || r.name,
          url: r.url,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    ];

    return integrations;
  }

  /**
   * Run real-time diagnostic / verification test on a specific provider.
   */
  static async verifyProvider(
    workspaceId: string,
    providerId: string,
    userId?: string
  ): Promise<VerificationResult> {
    const integrations = await this.getWorkspaceIntegrations(workspaceId, userId);
    const item = integrations.find((i) => i.id === providerId);

    if (!item) {
      return {
        providerId,
        status: 'NOT_CONNECTED',
        isVerified: false,
        title: 'Unknown Provider',
        message: `Provider "${providerId}" is not recognized in the Enterprise Integrations Hub.`,
        timestamp: new Date().toISOString(),
      };
    }

    if (item.id === 'github') {
      const repos = item.connectedItems || [];
      if (repos.length > 0) {
        return {
          providerId,
          status: 'CONNECTED',
          isVerified: true,
          title: 'GitHub Connection Verified',
          message: `Successfully verified ${repos.length} active repository connection${repos.length === 1 ? '' : 's'} in workspace database.`,
          details: {
            connectedCount: repos.length,
            repositories: repos.map((r) => r.name),
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          providerId,
          status: 'NOT_CONNECTED',
          isVerified: false,
          title: 'No Repositories Linked',
          message: 'GitHub integration service is ready, but no repositories are currently linked to this workspace.',
          details: { connectedCount: 0 },
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (item.id === 'google-calendar') {
      if (item.isVerified && item.status === 'CONNECTED') {
        return {
          providerId,
          status: 'CONNECTED',
          isVerified: true,
          title: 'Google Calendar Connection Record Found',
          message: `Connection record found for ${item.connectedAccount?.email || 'authenticated user'}. Note: Calendar synchronization is currently postponed.`,
          details: {
            accountEmail: item.connectedAccount?.email,
            connectedAt: item.connectedAccount?.connectedAt,
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          providerId,
          status: 'NOT_CONNECTED',
          isVerified: false,
          title: 'Integration Postponed (Coming Soon)',
          message: 'Google Calendar integration is currently postponed while external account setup is on hold. CollabAI native meetings, notes, and attendance remain fully operational.',
          details: {
            serverConfigured: item.serverConfigured,
            postponed: true,
          },
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Third-party providers verification
    if (item.serverConfigured) {
      return {
        providerId,
        status: 'SETUP_REQUIRED',
        isVerified: false,
        title: 'Backend Credentials Detected',
        message: `Server credentials for ${item.name} are present in environment variables. OAuth authorization callback pipeline is pending Phase 2 activation.`,
        details: {
          serverConfigured: true,
          phase: 'Phase 2 Implementation Pending',
        },
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        providerId,
        status: 'NOT_CONNECTED',
        isVerified: false,
        title: 'Missing Developer Credentials',
        message: `Configuration check failed: Missing ${item.missingEnvVars.join(', ')} in apps/api/.env. Please follow the setup guide to generate credentials in the developer console.`,
        missingEnvVars: item.missingEnvVars,
        details: {
          serverConfigured: false,
          missingVariables: item.missingEnvVars,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
