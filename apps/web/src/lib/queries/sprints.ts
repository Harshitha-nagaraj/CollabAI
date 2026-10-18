import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  completionPercentage: number;
  workspaceId: string;
  projectId?: string;
  tasks?: any[];
  sprintTasks?: any[];
}

export interface CapacityData {
  sprintId: string;
  sprintName: string;
  workingDays: number;
  availableTeamMembers: number;
  totalAvailableHours: number;
  totalStoryPointCapacity: number;
  totalCommittedPoints: number;
  totalCommittedHours: number;
  overallCapacityLoadPercentage: number;
  isOverCapacityWarning: boolean;
  warningMessage: string;
  memberWorkloads: Array<{
    userId: string;
    name: string;
    email: string;
    assignedTasksCount: number;
    totalStoryPoints: number;
    totalEstimatedHours: number;
    capacityHours: number;
    loadPercentage: number;
    isOverCapacity: boolean;
  }>;
}

export interface DependencyData {
  sprintId: string;
  totalTasksCount: number;
  blockedTasksCount: number;
  blockedTasks: Array<{
    taskId: string;
    taskTitle: string;
    blockedByTaskId: string;
    blockedByTaskTitle: string;
    predecessorStatus: string;
    reason: string;
  }>;
  parentChildLinks: Array<{
    predecessorId: string;
    predecessorTitle: string;
    successorId: string;
    successorTitle: string;
    type: string;
  }>;
  circularDependenciesCount: number;
  circularDependencies: Array<{
    cyclePath: string[];
    warning: string;
  }>;
  criticalPathTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    estimatedHours: number;
    storyPoints: number;
    slackHours: number;
  }>;
}

export interface BurndownData {
  sprintId: string;
  sprintName: string;
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  completionPercentage: number;
  currentVelocity: number;
  averageVelocity: number;
  velocityExplanation: string;
  burndownData: Array<{ day: number; date: string; idealPoints: number; actualPoints: number }>;
  velocityTrend: Array<{ sprintName: string; velocityPoints: number }>;
}

export interface SprintHealthData {
  sprintId: string;
  sprintName: string;
  healthScore: number;
  healthCategory: 'EXCELLENT' | 'MODERATE_RISK' | 'HIGH_RISK';
  overallProgress: number;
  daysRemaining: number;
  deadlineRisk: 'LOW' | 'HIGH';
  workloadBalance: 'OPTIMAL' | 'UNBALANCED';
  blockedTasksCount: number;
  meetingFrequency: string;
  teamActivity: string;
  metricsBreakdown: {
    deadlineRiskScore: number;
    workloadBalanceScore: number;
    blockedTasksScore: number;
    meetingFrequencyScore: number;
    teamActivityScore: number;
  };
}

export interface AIRecommendation {
  id: string;
  title: string;
  recommendationType: 'MOVE_TASK' | 'SPLIT_TASK' | 'REDUCE_SCOPE' | 'REASSIGN_WORK';
  reason: string;
  expectedImpact: string;
  confidenceScore: number;
  actionPayload: any;
}

export function useSprints(workspaceId: string | null, projectId?: string) {
  return useQuery<{ sprints: Sprint[] }>({
    queryKey: ['sprints', workspaceId, projectId],
    queryFn: () => api<{ sprints: Sprint[] }>(`/sprints?workspaceId=${workspaceId}${projectId ? `&projectId=${projectId}` : ''}`),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useSprintDetails(sprintId: string | null) {
  return useQuery<{ sprint: Sprint }>({
    queryKey: ['sprint', sprintId],
    queryFn: () => api<{ sprint: Sprint }>(`/sprints/${sprintId}`),
    enabled: !!sprintId,
  });
}

export function useCapacityPlan(sprintId: string | null) {
  return useQuery<{ capacity: CapacityData }>({
    queryKey: ['sprint-capacity', sprintId],
    queryFn: () => api<{ capacity: CapacityData }>(`/sprints/${sprintId}/capacity`),
    enabled: !!sprintId,
  });
}

export function useSprintDependencies(sprintId: string | null) {
  return useQuery<{ dependencies: DependencyData }>({
    queryKey: ['sprint-dependencies', sprintId],
    queryFn: () => api<{ dependencies: DependencyData }>(`/sprints/${sprintId}/dependencies`),
    enabled: !!sprintId,
  });
}

export function useBurndownAndVelocity(sprintId: string | null) {
  return useQuery<{ burndown: BurndownData }>({
    queryKey: ['sprint-burndown', sprintId],
    queryFn: () => api<{ burndown: BurndownData }>(`/sprints/${sprintId}/burndown`),
    enabled: !!sprintId,
  });
}

export function useSprintHealth(sprintId: string | null) {
  return useQuery<{ health: SprintHealthData }>({
    queryKey: ['sprint-health', sprintId],
    queryFn: () => api<{ health: SprintHealthData }>(`/sprints/${sprintId}/health`),
    enabled: !!sprintId,
  });
}

export function useAIRecommendations(sprintId: string | null) {
  return useQuery<{ recommendations: { recommendations: AIRecommendation[] } }>({
    queryKey: ['sprint-recommendations', sprintId],
    queryFn: () => api<{ recommendations: { recommendations: AIRecommendation[] } }>(`/sprints/${sprintId}/recommendations`),
    enabled: !!sprintId,
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; goal?: string; startDate: string; endDate: string; workspaceId: string; projectId?: string }) =>
      api<{ sprint: Sprint }>('/sprints', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] });
    },
  });
}

export function useUpdateSprint(sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; goal?: string; startDate?: string; endDate?: string; status?: string }) =>
      api<{ sprint: Sprint }>(`/sprints/${sprintId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] });
      qc.invalidateQueries({ queryKey: ['sprint', sprintId] });
      qc.invalidateQueries({ queryKey: ['sprint-health', sprintId] });
    },
  });
}

export function useAISprintPlan() {
  return useMutation({
    mutationFn: (payload: { workspaceId: string; projectId?: string; sprintDurationDays?: number; teamSize?: number }) =>
      api<{ plan: any }>('/sprints/ai-plan', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useApplyRecommendation(sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { recommendationId: string; actionPayload: any }) =>
      api<{ success: boolean; message: string }>(`/sprints/${sprintId}/recommendations/apply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] });
      qc.invalidateQueries({ queryKey: ['sprint', sprintId] });
      qc.invalidateQueries({ queryKey: ['sprint-capacity', sprintId] });
      qc.invalidateQueries({ queryKey: ['sprint-dependencies', sprintId] });
      qc.invalidateQueries({ queryKey: ['sprint-health', sprintId] });
      qc.invalidateQueries({ queryKey: ['sprint-recommendations', sprintId] });
    },
  });
}
