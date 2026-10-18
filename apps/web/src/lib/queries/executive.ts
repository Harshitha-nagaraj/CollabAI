/**
 * @file lib/queries/executive.ts
 *
 * React Query hooks for Executive AI Command Center, Portfolio Dashboard, Team Health, and OKRs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface PortfolioProject {
  id: string;
  name: string;
  description?: string;
  status: 'IN_PROGRESS' | 'AT_RISK' | 'COMPLETED';
  progress: number;
  totalTasks: number;
  completedTasks: number;
  membersCount: number;
}

export interface GoalItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  targetMetric?: string;
  currentProgress: number;
  status: string;
  startDate?: string;
  targetDate?: string;
}

export interface ExecutiveDashboardData {
  workspaceId: string;
  workspaceName: string;
  portfolioSummary: {
    activeProjectsCount: number;
    completedProjectsCount: number;
    delayedProjectsCount: number;
    totalMembersCount: number;
    activeSprintsCount: number;
    totalTasksCount: number;
    overallProgress: number;
  };
  portfolioProjects: PortfolioProject[];
  executiveSummary: {
    greeting: string;
    statusMetrics: {
      activeProjects: number;
      atRiskProjects: number;
      sprintCompletionRate: number;
      tasksCompletedYesterday: number;
      criticalBlockersCount: number;
    };
    executiveSummary: string;
    aiRecommendations: string[];
  };
  predictiveAnalytics: {
    sprintCompletionProbability: number;
    deliveryConfidenceScore: number;
    forecastedCompletionDate: string;
    productivityTrend: string;
    riskTrend: string;
    riskFactors: string[];
  };
  teamHealth: {
    teamHealthScore: number;
    productivityScore: number;
    burnoutRiskScore: number;
    collaborationScore: number;
    healthSummary: string;
    memberMetrics: Array<{
      userId: string;
      name: string;
      assignedTasksCount: number;
      workloadPercentage: number;
      meetingHoursWeekly: number;
      burnoutRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
  };
  crossProjectInsights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    affectedProjects: string[];
    recommendedAction: string;
  }>;
}

export function usePortfolioDashboard(workspaceId: string | null) {
  return useQuery<ExecutiveDashboardData>({
    queryKey: ['executive-portfolio', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<ExecutiveDashboardData>(`/executive/portfolio?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useExecutiveGoals(workspaceId: string | null) {
  return useQuery<GoalItem[]>({
    queryKey: ['executive-goals', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api<GoalItem[]>(`/executive/goals?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      type?: string;
      targetMetric?: string;
      currentProgress?: number;
      workspaceId: string;
    }) => {
      return api('/executive/goals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['executive-goals', variables.workspaceId] });
    },
  });
}

export function useExportExecutiveReport() {
  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      title?: string;
      format: 'MARKDOWN' | 'PDF' | 'EXCEL' | 'LINK';
    }) => {
      return api<{ reportId: string; title: string; format: string; content: string; shareableUrl: string }>('/executive/reports/export', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
}

export function useActionRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { recommendationId: string; action: 'ACCEPT' | 'DISMISS'; workspaceId: string }) => {
      return api(`/executive/recommendations/${payload.recommendationId}/action`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['executive-portfolio', variables.workspaceId] });
    },
  });
}
