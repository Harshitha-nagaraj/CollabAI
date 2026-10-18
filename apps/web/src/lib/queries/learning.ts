/**
 * @file lib/queries/learning.ts
 *
 * React Query hooks for AI Learning Engine API endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface ProjectRetrospectiveData {
  id?: string;
  projectId: string;
  projectName: string;
  whatWentWell: string[];
  whatCausedDelays: string[];
  biggestBlockers: string[];
  teamAchievements: string[];
  lessonsLearned: string[];
  futureRecommendations: string[];
  summary: string;
  status: string;
  createdAt?: string;
}

export interface AIEstimationResult {
  taskTitle: string;
  estimatedHours: number;
  estimatedDurationDays: number;
  deliveryConfidenceScore: number;
  rationale: string;
  similarHistoricalTasks: Array<{
    title: string;
    actualHours: number;
    status: string;
    completionDate?: string;
  }>;
}

export interface TeamPerformanceInsight {
  avgTaskCompletionDays: number;
  sprintVelocity: number;
  collaborationScore: number;
  meetingEffectivenessScore: number;
  reviewTurnaroundHours: number;
  teamStrengths: string[];
  areasForImprovement: string[];
  skillDistribution: Array<{
    skill: string;
    count: number;
    coveragePercentage: number;
  }>;
  productivityTrends: Array<{
    sprint: string;
    completedTasks: number;
    velocity: number;
  }>;
  coachingNotes: string[];
}

export interface ProjectTemplateData {
  id?: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  tasks: Array<{
    title: string;
    priority: string;
    estimatedHours: number;
    dependencies?: string[];
  }>;
}

export interface LearningPatternData {
  id?: string;
  title: string;
  category: 'BEST_PRACTICE' | 'RECURRING_RISK' | 'ESTIMATION_PATTERN' | 'WORKFLOW';
  description: string;
  impactMetric: string;
  confidenceScore: number;
  occurrences: number;
}

export interface PreFlightRecommendation {
  similarProjectName: string;
  resemblancePercentage: number;
  recommendations: string[];
  suggestedDevAllocation: Array<{ role: string; count: number }>;
  historicalTaskBenchmarks: Array<{ taskTitle: string; avgDays: number }>;
}

export interface ImprovementDashboardMetrics {
  projectSuccessRate: number;
  avgSprintVelocity: number;
  mostCommonRisks: Array<{ risk: string; frequency: number }>;
  recurringBlockers: Array<{ blocker: string; count: number }>;
  improvementTrends: Array<{ month: string; velocity: number; qualityScore: number }>;
  knowledgeGrowthCount: number;
}

// ── React Query Hooks ─────────────────────────────────────────────────────────

export function useProjectRetrospective(workspaceId: string | null, projectId: string | null) {
  return useQuery<ProjectRetrospectiveData>({
    queryKey: ['project-retrospective', workspaceId, projectId],
    queryFn: async () => {
      if (!workspaceId || !projectId) throw new Error('Missing workspaceId or projectId');
      return api<ProjectRetrospectiveData>(
        `/workspaces/${workspaceId}/learning/retrospectives/project/${projectId}`
      );
    },
    enabled: !!workspaceId && !!projectId,
  });
}

export function useUpdateProjectRetrospective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; workspaceId: string; data: Partial<ProjectRetrospectiveData> }) => {
      return api(`/workspaces/${payload.workspaceId}/learning/retrospectives/project/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload.data),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-retrospective', variables.workspaceId] });
    },
  });
}

export function useEstimateTask() {
  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      taskTitle: string;
      description?: string;
      tags?: string[];
    }) => {
      return api<AIEstimationResult>(`/workspaces/${payload.workspaceId}/learning/estimate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}

export function useTeamPerformance(workspaceId: string | null) {
  return useQuery<TeamPerformanceInsight>({
    queryKey: ['team-performance', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<TeamPerformanceInsight>(`/workspaces/${workspaceId}/learning/team-performance`);
    },
    enabled: !!workspaceId,
  });
}

export function useProjectTemplates(workspaceId: string | null) {
  return useQuery<ProjectTemplateData[]>({
    queryKey: ['project-templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<ProjectTemplateData[]>(`/workspaces/${workspaceId}/learning/templates`);
    },
    enabled: !!workspaceId,
  });
}

export function useInstantiateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      templateId: string;
      projectName: string;
      projectDescription?: string;
    }) => {
      return api(`/workspaces/${payload.workspaceId}/learning/templates/instantiate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['executive-portfolio', variables.workspaceId] });
    },
  });
}

export function useBestPractices(workspaceId: string | null) {
  return useQuery<LearningPatternData[]>({
    queryKey: ['best-practices', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<LearningPatternData[]>(`/workspaces/${workspaceId}/learning/best-practices`);
    },
    enabled: !!workspaceId,
  });
}

export function usePreFlightRecommendations(workspaceId: string | null, projectName: string) {
  return useQuery<PreFlightRecommendation>({
    queryKey: ['pre-flight', workspaceId, projectName],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<PreFlightRecommendation>(`/workspaces/${workspaceId}/learning/pre-flight`, {
        method: 'POST',
        body: JSON.stringify({ projectName }),
      });
    },
    enabled: !!workspaceId && !!projectName,
  });
}

export function useImprovementMetrics(workspaceId: string | null) {
  return useQuery<ImprovementDashboardMetrics>({
    queryKey: ['improvement-benchmarks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<ImprovementDashboardMetrics>(`/workspaces/${workspaceId}/learning/benchmarks`);
    },
    enabled: !!workspaceId,
  });
}

export function useSearchOrganizationalLibrary() {
  return useMutation({
    mutationFn: async (payload: { workspaceId: string; query: string }) => {
      return api<any>(`/workspaces/${payload.workspaceId}/learning/library/search`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}
