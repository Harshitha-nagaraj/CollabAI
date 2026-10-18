/**
 * @file ai/types/simulation.types.ts
 *
 * Comprehensive TypeScript definitions for AI Project Simulator engine,
 * scenario builder, impact analyzer, timeline comparison, recommendations,
 * scenario comparison matrix, and natural language parser.
 */

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
  deliveryConfidenceScore: number; // 0 to 100
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

export interface DelayedMilestone {
  id: string;
  title: string;
  originalDate: string;
  newDate: string;
  delayDays: number;
}

export interface ImprovedMilestone {
  id: string;
  title: string;
  originalDate: string;
  newDate: string;
  advanceDays: number;
}

export interface AffectedTaskItem {
  id: string;
  title: string;
  impactType: 'DELAYED' | 'ADVANCED' | 'REASSIGNED' | 'BLOCKED' | 'CREATED';
  detail: string;
}

export interface TimelineDiff {
  delayedMilestones: DelayedMilestone[];
  improvedMilestones: ImprovedMilestone[];
  baselineCompletionDate: string;
  simulatedCompletionDate: string;
  affectedTasks: AffectedTaskItem[];
}

export interface SimulationRecommendation {
  id: string;
  title: string;
  action: string;
  reason: string;
  expectedImprovement: string;
  confidenceScore: number;
  actionPayload?: {
    type: string;
    taskId?: string;
    assigneeId?: string;
    assigneeName?: string;
    newDueDate?: string;
    days?: number;
    developerRole?: string;
  };
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
  id?: string;
  scenarioId?: string;
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
  riskScore: number; // 0 - 100
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
