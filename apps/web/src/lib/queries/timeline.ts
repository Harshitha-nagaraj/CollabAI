/**
 * @file lib/queries/timeline.ts
 *
 * React Query hooks for Project Timeline, Dependencies, Critical Path & Delay Predictions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface TimelineTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours: number;
  progress: number;
  isMilestone: boolean;
  isCriticalPath: boolean;
  slackHours: number;
  assignee?: { id: string; name?: string; email: string; avatarUrl?: string } | null;
  predecessors: Array<{ id: string; predecessorId: string; title: string; type: string }>;
  successors: Array<{ id: string; successorId: string; title: string; type: string }>;
}

export interface MilestoneForecast {
  id: string;
  title: string;
  originalDueDate: string | null;
  predictedDueDate: string;
  delayDays: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
}

export interface TimelineRecommendation {
  id: string;
  type: 'REASSIGN_TASK' | 'SPLIT_TASK' | 'ADJUST_DEADLINE' | 'REORDER_WORK';
  title: string;
  description: string;
  targetTaskId: string;
  targetTaskTitle: string;
  suggestedAction: {
    fromAssigneeId?: string;
    toAssigneeId?: string;
    toAssigneeName?: string;
    newDueDate?: string;
    subtaskTitles?: string[];
  };
  impactScore: number;
}

export interface ProjectTimelineData {
  projectId: string;
  projectName: string;
  tasks: TimelineTask[];
  milestones: TimelineTask[];
  criticalPath: {
    projectDurationDays: number;
    criticalPathTaskIds: string[];
    taskMetrics: Record<string, any>;
  };
  delayPrediction: {
    delayRiskScore: number;
    overallStatus: 'ON_TRACK' | 'AT_RISK' | 'HIGH_DELAY_RISK';
    originalTargetDate: string;
    predictedCompletionDate: string;
    delayDays: number;
    criticalPathLengthDays: number;
    delayedMilestones: MilestoneForecast[];
    sprintRisks: string[];
    recommendations: TimelineRecommendation[];
  };
  projectCompletionPercentage: number;
}

export function useProjectTimeline(projectId: string | null, workspaceId: string | null) {
  return useQuery<ProjectTimelineData>({
    queryKey: ['timeline', projectId, workspaceId],
    queryFn: async () => {
      if (!projectId || !workspaceId) throw new Error('Missing parameters');
      return api<ProjectTimelineData>(`/projects/${projectId}/timeline?workspaceId=${workspaceId}`);
    },
    enabled: !!projectId && !!workspaceId,
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      predecessorId,
      successorId,
      type,
    }: {
      predecessorId: string;
      successorId: string;
      type?: string;
      projectId: string;
      workspaceId: string;
    }) => {
      return api('/projects/dependencies', {
        method: 'POST',
        body: JSON.stringify({ predecessorId, successorId, type }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.projectId, variables.workspaceId] });
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dependencyId, projectId, workspaceId }: { dependencyId: string; projectId: string; workspaceId: string }) => {
      return api(`/projects/dependencies/${dependencyId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.projectId, variables.workspaceId] });
    },
  });
}

export function useAutoDetectDependencies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, workspaceId }: { projectId: string; workspaceId: string }) => {
      return api(`/projects/${projectId}/auto-detect-dependencies`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.projectId, variables.workspaceId] });
    },
  });
}

export function useApplyMitigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      workspaceId: string;
      recommendationId: string;
      targetTaskId: string;
      type: string;
      suggestedAction: any;
    }) => {
      return api(`/projects/${payload.projectId}/apply-mitigation`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.projectId, variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
