/**
 * @file lib/queries/integrations.ts
 *
 * React Query hooks for Enterprise Integrations Hub status, verification,
 * Google OAuth 2.0 authorization, and disconnect operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

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
    expiresAt?: string | null;
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

/**
 * Fetch verified integration statuses for a specific workspace.
 */
export function useIntegrationsStatus(workspaceId: string | null) {
  return useQuery<WorkspaceIntegration[]>({
    queryKey: ['integrations-status', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return api<WorkspaceIntegration[]>(`/integrations?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

/**
 * Run real-time verification and diagnostic check for a provider.
 */
export function useVerifyIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      workspaceId,
    }: {
      providerId: string;
      workspaceId: string;
    }): Promise<VerificationResult> => {
      return api<VerificationResult>(`/integrations/${providerId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integrations-status', variables.workspaceId],
      });
    },
  });
}

/**
 * Initiate Google Calendar OAuth flow and obtain Google authorization URL.
 */
export function useInitiateGoogleAuth() {
  return useMutation({
    mutationFn: async ({
      workspaceId,
      returnTo,
    }: {
      workspaceId: string;
      returnTo?: string;
    }): Promise<{ authUrl: string; state: string }> => {
      const queryParams = new URLSearchParams({ workspaceId });
      if (returnTo) queryParams.set('returnTo', returnTo);
      return api<{ authUrl: string; state: string }>(
        `/integrations/google/auth?${queryParams.toString()}`
      );
    },
  });
}

/**
 * Disconnect Google Calendar integration for active workspace.
 */
export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
    }: {
      workspaceId: string;
    }): Promise<{ success: boolean; message: string }> => {
      return api<{ success: boolean; message: string }>(
        '/integrations/google-calendar/disconnect',
        {
          method: 'POST',
          body: JSON.stringify({ workspaceId }),
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integrations-status', variables.workspaceId],
      });
    },
  });
}
