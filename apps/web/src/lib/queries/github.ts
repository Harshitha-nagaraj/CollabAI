/**
 * @file lib/queries/github.ts
 *
 * React Query hooks for GitHub Integration, PR Intelligence, Engineering Metrics, and Release Notes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface GitHubRepo {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface PullRequestItem {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  headBranch: string;
  baseBranch: string;
  author: string;
  url: string;
  aiSummary?: string;
  securityNotes?: string;
  repository?: { id: string; name: string; fullName: string };
  task?: { id: string; title: string; status: string } | null;
}

export interface ReleaseNoteItem {
  id: string;
  version: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface EngineeringAnalyticsData {
  connectedRepositoriesCount: number;
  openPullRequestsCount: number;
  mergedPullRequestsCount: number;
  reviewQueueCount: number;
  deploymentStatus: string;
  codeHealthScore: number;
  sprintCompletionPercentage: number;
  codeDependencyAnalysis: {
    openPRCount: number;
    conflictRiskScore: number;
    potentialConflicts: Array<{ prA: string; prB: string; file: string; risk: string }>;
    blockedTasksCount: number;
    projectImpact: string;
  };
}

export function useGitHubRepositories(workspaceId: string | null) {
  return useQuery<GitHubRepo[]>({
    queryKey: ['github-repos', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<GitHubRepo[]>(`/github/repositories?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useConnectRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      owner: string;
      fullName: string;
      url: string;
      isPrivate?: boolean;
      workspaceId: string;
      projectId?: string | null;
    }) => {
      return api('/github/repositories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['github-repos', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['github-analytics', variables.workspaceId] });
    },
  });
}

export function usePullRequests(workspaceId: string | null) {
  return useQuery<PullRequestItem[]>({
    queryKey: ['github-prs', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<PullRequestItem[]>(`/github/pull-requests?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useSummarizePR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ prId, workspaceId }: { prId: string; workspaceId: string }) => {
      return api(`/github/pull-requests/${prId}/summarize`, {
        method: 'POST',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['github-prs', variables.workspaceId] });
    },
  });
}

export function useReleaseNotes(workspaceId: string | null) {
  return useQuery<ReleaseNoteItem[]>({
    queryKey: ['release-notes', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<ReleaseNoteItem[]>(`/github/release-notes?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateReleaseNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { version: string; workspaceId: string; projectId?: string | null }) => {
      return api('/github/release-notes/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['release-notes', variables.workspaceId] });
    },
  });
}

export function useEngineeringAnalytics(workspaceId: string | null) {
  return useQuery<EngineeringAnalyticsData>({
    queryKey: ['github-analytics', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<EngineeringAnalyticsData>(`/github/analytics?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}
