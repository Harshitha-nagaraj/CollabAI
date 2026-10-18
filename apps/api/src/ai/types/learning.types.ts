/**
 * @file ai/types/learning.types.ts
 *
 * Comprehensive TypeScript definitions for AI Learning Engine,
 * Project & Sprint Retrospectives, Historical Estimation Engine,
 * Team Coaching Insights, Reusable Templates, AI Best Practices,
 * Pre-Flight Recommendations, and Organizational Knowledge repository.
 */

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

export interface SprintRetrospectiveActionItem {
  id?: string;
  title: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: string;
}

export interface SprintRetrospectiveData {
  id?: string;
  sprintName: string;
  projectId?: string;
  completedWork: string[];
  missedGoals: string[];
  unexpectedIssues: string[];
  successFactors: string[];
  improvementSuggestions: string[];
  actionItems: SprintRetrospectiveActionItem[];
  createdAt?: string;
}

export interface AIEstimationRequest {
  taskTitle: string;
  description?: string;
  tags?: string[];
  assigneeId?: string;
}

export interface HistoricalTaskMatch {
  title: string;
  actualHours: number;
  status: string;
  completionDate?: string | undefined;
}

export interface AIEstimationResult {
  taskTitle: string;
  estimatedHours: number;
  estimatedDurationDays: number;
  deliveryConfidenceScore: number; // 0 to 100
  rationale: string;
  similarHistoricalTasks: HistoricalTaskMatch[];
}

export interface SkillDistributionItem {
  skill: string;
  count: number;
  coveragePercentage: number;
}

export interface ProductivityTrendPoint {
  sprint: string;
  completedTasks: number;
  velocity: number;
}

export interface TeamPerformanceInsight {
  avgTaskCompletionDays: number;
  sprintVelocity: number;
  collaborationScore: number;
  meetingEffectivenessScore: number;
  reviewTurnaroundHours: number;
  teamStrengths: string[];
  areasForImprovement: string[];
  skillDistribution: SkillDistributionItem[];
  productivityTrends: ProductivityTrendPoint[];
  coachingNotes: string[];
}

export interface ProjectTemplateTask {
  title: string;
  priority: string;
  estimatedHours: number;
  dependencies?: string[];
}

export interface ProjectTemplateData {
  id?: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  tasks: ProjectTemplateTask[];
  sourceProjectId?: string | undefined;
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
  suggestedDevAllocation: { role: string; count: number }[];
  historicalTaskBenchmarks: { taskTitle: string; avgDays: number }[];
}

export interface ImprovementDashboardMetrics {
  projectSuccessRate: number; // 0 to 100%
  avgSprintVelocity: number;
  mostCommonRisks: { risk: string; frequency: number }[];
  recurringBlockers: { blocker: string; count: number }[];
  improvementTrends: { month: string; velocity: number; qualityScore: number }[];
  knowledgeGrowthCount: number;
}
