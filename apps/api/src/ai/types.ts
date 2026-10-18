/**
 * @file ai/types.ts
 *
 * Core TypeScript interfaces for the CollabAI AI engine.
 * Every AI service, provider, and prompt template conforms to these types.
 */

// ─── LLM Provider Contract ──────────────────────────────────────────────────

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** If true, the provider should attempt to return valid JSON. */
  jsonMode?: boolean;
}

/**
 * The contract that every LLM adapter must implement.
 * Swap providers by implementing this single interface.
 */
export interface LLMProvider {
  readonly name: string;
  complete(prompt: PromptPayload, options?: LLMCompletionOptions): Promise<string>;
}

export interface PromptPayload {
  system: string;
  user: string;
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

export interface PromptTemplate {
  name: string;
  description: string;
  buildPrompt(variables: Record<string, unknown>): PromptPayload;
}

// ─── AI Output Types ─────────────────────────────────────────────────────────

export interface MeetingSummary {
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  risks: string[];
  pendingQuestions: string[];
  suggestedFollowUps: string[];
  deadlinesMentioned?: DeadlineMention[];
  sentiment?: MeetingSentimentAnalysis;
}

export interface MeetingSentimentAnalysis {
  label: 'POSITIVE' | 'NEUTRAL' | 'HIGH_TENSION' | 'CONSTRUCTIVE';
  score: number; // 0-100
  summary: string;
  keyMoments: Array<{ speaker: string; tone: string; text: string }>;
}

export interface DeadlineMention {
  topic: string;
  date: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  context: string;
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
  labels?: string[];
  dependencies?: string[];
  confidence: number;
  approved?: boolean;
}

export interface AITaskProposal {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'BACKLOG';
  assigneeName: string | null;
  assigneeId: string | null;
  assignmentJustification?: string;
  dueDate: string | null;
  estimatedEffort?: string;
  labels: string[];
  dependencies?: string[];
  confidence: number;
}

export interface FullSprintPlan {
  sprintGoal: string;
  sprintNumber: number;
  currentSprintTasks: AITaskProposal[];
  nextSprintTasks: AITaskProposal[];
  backlogTasks: AITaskProposal[];
  estimatedDurationDays: number;
  predictedCompletionDate: string;
  capacityUtilization: number; // percentage
  risks: string[];
}

export interface SprintPlan {
  sprintGoal: string;
  selectedTasks: SprintTask[];
  estimatedCompletion: string;
  potentialRisks: string[];
  blockedTasks: string[];
  capacityUsed: number; // percentage
}

export interface SprintTask {
  taskId: string;
  title: string;
  priority: string;
  assignee: string | null;
  estimatedEffort: string;
}

export interface RiskItem {
  id: string;
  category: 'deadline_miss' | 'milestone_delay' | 'sprint_risk' | 'team_bottleneck' | 'critical_blocker';
  title: string;
  explanation: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number; // 0-100
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
  recommendations: WorkloadRecommendation[];
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

export interface WorkloadRecommendation {
  type: 'reassign' | 'deprioritize' | 'alert';
  message: string;
  fromUser?: string;
  toUser?: string;
  taskTitle?: string;
}

export interface ProjectHealth {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  upcomingDeadlines: DeadlineItem[];
  riskPredictions: RiskItem[];
  productivityScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: string[];
  criticalIssues: string[];
}

export interface DeadlineItem {
  taskTitle: string;
  dueDate: string;
  assignee: string | null;
  priority: string;
  daysRemaining: number;
}

export interface StandupReport {
  date: string;
  members: MemberStandup[];
}

export interface MemberStandup {
  userId: string;
  name: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
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

// ─── Natural Language Command Types ──────────────────────────────────────────

export type CommandAction =
  | 'create_task'
  | 'update_task'
  | 'search_tasks'
  | 'move_task'
  | 'assign_task'
  | 'schedule_meeting'
  | 'show_overdue'
  | 'show_blocked'
  | 'unknown';

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
  action: CommandAction;
  confidence: number;
  parameters: Record<string, string | null>;
  originalText: string;
  explanation: string;
  executablePayload?: Record<string, any>;
  taskMatch?: TaskMatchInfo;
}

// ─── Search Types ────────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'task' | 'document' | 'meeting';
  id: string;
  title: string;
  snippet: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  answer: string | null;
  supportingEvidence: string[];
  relatedTasks: Array<{ id: string; title: string; status: string; priority: string }>;
  relatedMeetings: Array<{ id: string; title: string; date: string }>;
  relatedDocuments: Array<{ id: string; title: string }>;
}

