/**
 * React Query hooks for all AI endpoints.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types (mirrored from backend) ──────────────────────────────────────────

export interface MeetingSummary {
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  risks: string[];
  pendingQuestions: string[];
  suggestedFollowUps: string[];
}

export interface ActionItem {
  id?: string;
  title: string;
  description: string;
  assignee: string | null;
  suggestedAssigneeId?: string | null;
  assignmentJustification?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  estimatedEffort?: string;
  confidence: number;
  approved?: boolean;
  labels?: string[];
  dependencies?: string[];
}

export interface AITaskProposal {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  assigneeName: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string[];
  confidence: number;
}

export interface SprintPlan {
  sprintGoal: string;
  selectedTasks: { taskId: string; title: string; priority: string; assignee: string | null; estimatedEffort: string }[];
  estimatedCompletion: string;
  potentialRisks: string[];
  blockedTasks: string[];
  capacityUsed: number;
}

export interface RiskItem {
  id: string;
  category: 'deadline_miss' | 'milestone_delay' | 'sprint_risk' | 'team_bottleneck' | 'critical_blocker';
  title: string;
  explanation: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number;
  suggestedSolution: string;
  affectedTaskId?: string;
  affectedTaskTitle?: string;
}

export interface WorkloadRedistributionProposal {
  id: string;
  taskId: string;
  taskTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  estimatedEffort: string;
  reason: string;
}

export interface ExpectedWorkloadImprovement {
  loadBalanceScoreBefore: number;
  loadBalanceScoreAfter: number;
  burnoutRiskReduction: string;
  summary: string;
}

export interface WorkloadAnalysis {
  members: MemberWorkload[];
  recommendations: { type: string; message: string; fromUser?: string; toUser?: string }[];
  redistributionProposals: WorkloadRedistributionProposal[];
  expectedImprovement: ExpectedWorkloadImprovement;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

export interface MemberWorkload {
  userId: string;
  name: string;
  totalTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
  loadPercentage: number;
  status: 'underloaded' | 'balanced' | 'overloaded' | 'critical';
}

export interface ProjectHealth {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  upcomingDeadlines: { taskTitle: string; dueDate: string; assignee: string | null; priority: string; daysRemaining: number }[];
  riskPredictions: RiskItem[];
  productivityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: string[];
  criticalIssues: string[];
}

export interface StandupReport {
  date: string;
  members: { userId: string; name: string; yesterday: string[]; today: string[]; blockers: string[] }[];
}

export interface WeeklyReport {
  weekRange: string;
  completedWork: string[];
  pendingWork: string[];
  sprintProgress: { completed: number; total: number; percentage: number };
  risks: string[];
  upcomingGoals: string[];
  markdownContent: string;
}

export interface TaskMatchCandidate {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName?: string;
}

export interface TaskMatchInfo {
  status: 'exact' | 'partial' | 'multiple' | 'none';
  message: string;
  matches: TaskMatchCandidate[];
}

export interface ParsedCommand {
  action: string;
  confidence: number;
  parameters: Record<string, string | null>;
  originalText: string;
  explanation: string;
  executablePayload?: Record<string, any>;
  taskMatch?: TaskMatchInfo;
}

export interface SearchResponse {
  query: string;
  results: { type: string; id: string; title: string; snippet: string; relevance: number; metadata: Record<string, unknown> }[];
  answer: string | null;
  supportingEvidence: string[];
  relatedTasks: Array<{ id: string; title: string; status: string; priority: string }>;
  relatedMeetings: Array<{ id: string; title: string; date: string }>;
  relatedDocuments: Array<{ id: string; title: string }>;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useMeetingSummarize() {
  return useMutation({
    mutationFn: (payload: { transcript: string; participants?: string[] }) =>
      api<MeetingSummary>('/ai/meetings/summarize', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useTaskGenerate() {
  return useMutation({
    mutationFn: (payload: { text: string; workspaceId: string }) =>
      api<{ tasks: AITaskProposal[] }>('/ai/tasks/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useSprintPlan() {
  return useMutation({
    mutationFn: (payload: { workspaceId: string }) =>
      api<SprintPlan>('/ai/sprint/plan', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useWeeklyReport() {
  return useMutation({
    mutationFn: (payload: { workspaceId: string }) =>
      api<WeeklyReport>('/ai/report/weekly', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useAICommand() {
  return useMutation({
    mutationFn: (payload: { command: string; workspaceId?: string }) =>
      api<ParsedCommand>('/ai/command', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useConfirmCommand() {
  return useMutation({
    mutationFn: (payload: { action: string; payload: Record<string, any>; workspaceId: string }) =>
      api<{ message: string }>('/ai/command/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useApplyWorkloadReassignment() {
  return useMutation({
    mutationFn: (payload: { taskId: string; toUserId: string; workspaceId: string }) =>
      api<{ message: string }>('/ai/workload/apply', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useAISearch() {
  return useMutation({
    mutationFn: (payload: { query: string; workspaceId: string }) =>
      api<SearchResponse>('/ai/search', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useWorkloadAnalysis(workspaceId: string | null) {
  return useQuery({
    queryKey: ['ai-workload', workspaceId],
    queryFn: () => api<WorkloadAnalysis>(`/ai/workload/${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useProjectHealth(workspaceId: string | null) {
  return useQuery({
    queryKey: ['ai-health', workspaceId],
    queryFn: () => api<ProjectHealth>(`/ai/health/${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useDailyStandup(workspaceId: string | null) {
  return useQuery({
    queryKey: ['ai-standup', workspaceId],
    queryFn: () => api<StandupReport>(`/ai/standup/${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}
