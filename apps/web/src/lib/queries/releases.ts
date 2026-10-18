import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ReleaseDashboardData {
  workspaceId: string;
  releaseId: string;
  releaseName: string;
  releaseVersion: string;
  targetDate: string;
  confidenceScore: number;
  status: string;
  completedFeaturesCount: number;
  pendingFeaturesCount: number;
  blockedFeaturesCount: number;
  resolvedBugsCount: number;
  completedFeaturesSummary: Array<{ id: string; title: string; assignee: string }>;
  pendingFeaturesSummary: Array<{ id: string; title: string; assignee: string }>;
  blockedFeaturesSummary: Array<{ id: string; title: string; assignee: string }>;
  sprintProgressList: Array<{
    sprintId: string;
    sprintName: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
    completionPct: number;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
  }>;
  deploymentStatus: {
    environment: string;
    lastDeployedAt: string;
    buildVersion: string;
    status: string;
    automatedTestsPassing: string;
    securityVulnerabilities: number;
  };
  openRisks: string[];
}

export function useReleases(workspaceId: string | null) {
  return useQuery<{ releases: any[] }>({
    queryKey: ['releases', workspaceId],
    queryFn: () => api<{ releases: any[] }>(`/releases?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useReleaseDashboard(workspaceId: string | null, releaseId?: string) {
  return useQuery<{ dashboard: ReleaseDashboardData }>({
    queryKey: ['release-dashboard', workspaceId, releaseId],
    queryFn: () => api<{ dashboard: ReleaseDashboardData }>(`/releases/dashboard?workspaceId=${workspaceId}${releaseId ? `&releaseId=${releaseId}` : ''}`),
    enabled: !!workspaceId,
  });
}

export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; version: string; targetDate: string; notes?: string; workspaceId: string }) =>
      api<{ release: any }>('/releases', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['releases'] });
      qc.invalidateQueries({ queryKey: ['release-dashboard'] });
    },
  });
}
