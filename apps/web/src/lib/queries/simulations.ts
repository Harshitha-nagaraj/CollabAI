/**
 * @file lib/queries/simulations.ts
 *
 * React Query hooks for AI Project Simulator backend integration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export type SimulationActionType =
  | 'DELAY_TASK'
  | 'ADD_DEVELOPER'
  | 'REMOVE_MEMBER'
  | 'SPRINT_DURATION'
  | 'MOVE_TASK'
  | 'PRIORITY_CHANGE'
  | 'ADD_FEATURE'
  | 'CRITICAL_BUG'
  | 'EMPLOYEE_LEAVE'
  | 'SCOPE_CHANGE';

export interface SimulationAction {
  id: string;
  type: SimulationActionType;
  description: string;
  taskId?: string;
  taskTitle?: string;
  days?: number;
  developerName?: string;
  developerRole?: string;
  userId?: string;
  targetMemberName?: string;
  sprintDeltaDays?: number;
  newPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  featureTitle?: string;
  estimatedHours?: number;
  scopePercentage?: number;
  leaveStartDate?: string;
}

export interface SimulatedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number;
  progress: number;
  assigneeId: string | null;
  assigneeName: string;
  isMilestone: boolean;
  predecessorIds: string[];
  successorIds: string[];
  delayDays: number;
  isBlocked: boolean;
  isCritical: boolean;
  slackDays: number;
  isSimulatedNew?: boolean;
}

export interface WorkloadMember {
  userId: string;
  userName: string;
  role?: string;
  baselineHours: number;
  simulatedHours: number;
  capacityHours: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  assignedTaskCount: number;
}

export interface ImpactAnalysis {
  sprintCompletionDate: string;
  baselineSprintCompletionDate: string;
  projectCompletionDate: string;
  baselineProjectCompletionDate: string;
  sprintDelayDays: number;
  projectDelayDays: number;
  criticalPathTaskIds: string[];
  criticalPathTaskTitles: string[];
  criticalPathChanged: boolean;
  workloadDistribution: Record<string, WorkloadMember>;
  blockedTasksCount: number;
  resourceUtilizationPercentage: number;
  deliveryConfidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  costEstimation: {
    baselineCost: number;
    simulatedCost: number;
    costDelta: number;
    currency: string;
    breakdown: { label: string; amount: number }[];
  };
  impactExplanations: string[];
}

export interface TimelineDiff {
  delayedMilestones: Array<{
    id: string;
    title: string;
    originalDate: string;
    newDate: string;
    delayDays: number;
  }>;
  improvedMilestones: Array<{
    id: string;
    title: string;
    originalDate: string;
    newDate: string;
    advanceDays: number;
  }>;
  baselineCompletionDate: string;
  simulatedCompletionDate: string;
  affectedTasks: Array<{
    id: string;
    title: string;
    impactType: 'DELAYED' | 'ADVANCED' | 'REASSIGNED' | 'BLOCKED' | 'CREATED';
    detail: string;
  }>;
}

export interface SimulationRecommendation {
  id: string;
  title: string;
  action: string;
  reason: string;
  expectedImprovement: string;
  confidenceScore: number;
  actionPayload?: any;
}

export interface AIExecutiveSummary {
  scenarioTitle: string;
  summaryText: string;
  bulletPoints: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  recommendations: string[];
}

export interface SimulationResult {
  scenarioName: string;
  actions: SimulationAction[];
  tasks: SimulatedTask[];
  impact: ImpactAnalysis;
  timeline: TimelineDiff;
  recommendations: SimulationRecommendation[];
  executiveSummary: AIExecutiveSummary;
  generatedAt: string;
}

export interface ScenarioComparisonItem {
  id: string;
  name: string;
  completionDate: string;
  delayDays: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  workloadPercentage: number;
  cost: number;
  costDelta: number;
  successProbability: number;
  keyTradeoffs: string[];
  actionsCount: number;
}

export interface ScenarioComparisonMatrix {
  scenarios: ScenarioComparisonItem[];
  recommendedScenarioId: string;
  recommendationReason: string;
}

export interface NLScenarioParseResult {
  parsedActions: SimulationAction[];
  originalPrompt: string;
  explanation: string;
}

// ── React Query Hooks ─────────────────────────────────────────────────────────

export function useRunSimulation() {
  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      actions: SimulationAction[];
      scenarioName?: string;
      projectId?: string;
    }) => {
      return api<SimulationResult>(`/workspaces/${payload.workspaceId}/simulations/run`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}

export function useParseNLPrompt() {
  return useMutation({
    mutationFn: async (payload: { workspaceId: string; prompt: string }) => {
      return api<NLScenarioParseResult>(`/workspaces/${payload.workspaceId}/simulations/parse-nl`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}

export function useCompareScenarios() {
  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      scenarios: Array<{ id: string; name: string; actions: SimulationAction[] }>;
    }) => {
      return api<ScenarioComparisonMatrix>(`/workspaces/${payload.workspaceId}/simulations/compare`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}

export function useSaveScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      name: string;
      description?: string;
      projectId?: string;
      modifications: SimulationAction[];
    }) => {
      return api(`/workspaces/${payload.workspaceId}/simulations`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-simulations', variables.workspaceId] });
    },
  });
}

export function useSavedScenarios(workspaceId: string | null) {
  return useQuery<any[]>({
    queryKey: ['saved-simulations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<any[]>(`/workspaces/${workspaceId}/simulations`);
    },
    enabled: !!workspaceId,
  });
}

export function useApplyRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { workspaceId: string; actionPayload: any }) => {
      return api<{ success: boolean; message: string }>(`/workspaces/${payload.workspaceId}/simulations/apply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['executive-portfolio', variables.workspaceId] });
    },
  });
}
