import type { PromptTemplate, PromptPayload } from '../types.js';

export const sprintPlannerPrompt: PromptTemplate = {
  name: 'sprint_planner',
  description: 'Generate an optimal sprint plan from backlog data',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    return {
      system: `[sprint_planner] You are an AI sprint planning assistant.
Given a backlog of tasks, team capacity, and context, generate an optimal sprint plan.

Output MUST be valid JSON matching this structure:
{
  "sprintGoal": "string",
  "selectedTasks": [{ "taskId": "string", "title": "string", "priority": "string", "assignee": "string|null", "estimatedEffort": "Small|Medium|Large" }],
  "estimatedCompletion": "string",
  "potentialRisks": ["string"],
  "blockedTasks": ["string - titles of tasks not included"],
  "capacityUsed": "number 0-100"
}`,
      user: JSON.stringify(variables),
    };
  },
};

export const projectHealthPrompt: PromptTemplate = {
  name: 'project_health',
  description: 'Analyze project health from task metrics',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    return {
      system: `[project_health] You are a project health analyst.
Given task data, compute project health metrics.

Output valid JSON with: completionPercentage, totalTasks, completedTasks, inProgressTasks, blockedTasks, overdueTasks, upcomingDeadlines, productivityScore (0-100), riskLevel (low|medium|high|critical), risks, criticalIssues.`,
      user: JSON.stringify(variables),
    };
  },
};

export const standupPrompt: PromptTemplate = {
  name: 'standup_generator',
  description: 'Generate daily standup summaries per member',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    return {
      system: `[standup_generator] You are a daily standup assistant.
Given team members and their tasks, generate yesterday/today/blockers for each.

Output valid JSON: { "date": "YYYY-MM-DD", "members": [{ "userId": "string", "name": "string", "yesterday": ["string"], "today": ["string"], "blockers": ["string"] }] }`,
      user: JSON.stringify(variables),
    };
  },
};

export const weeklyReportPrompt: PromptTemplate = {
  name: 'weekly_report',
  description: 'Generate a professional weekly status report',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    return {
      system: `[weekly_report] You are a professional report generator.
Given task data for the past week, generate a weekly status report.

Output valid JSON with: weekRange, completedWork (string[]), pendingWork (string[]), sprintProgress ({completed, total, percentage}), risks (string[]), upcomingGoals (string[]), markdownContent (string - full markdown report).`,
      user: JSON.stringify(variables),
    };
  },
};

export const naturalLanguagePrompt: PromptTemplate = {
  name: 'command_parser',
  description: 'Parse natural language commands into platform actions',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    return {
      system: `[command_parser] You are a command parser for a project management platform.
Given a natural language command, determine the intended action and extract parameters.

Possible actions: create_task, update_task, search_tasks, move_task, assign_task, show_overdue, show_blocked, schedule_meeting, unknown.

For move_task:
- parameters.query: the exact task title or query to match (do NOT include "Move" or "to Done" in query)
- parameters.status: destination status (TODO, IN_PROGRESS, IN_REVIEW, DONE, BACKLOG, CANCELLED)

For assign_task:
- parameters.query: the task title to match (exclude action verbs and assignee)
- parameters.assignee: the name or email of the assignee

For create_task:
- parameters.title: the title of the task
- parameters.priority: LOW, MEDIUM, HIGH, or URGENT
- parameters.assignee: assignee name if specified

Output valid JSON: { "action": "string", "confidence": number, "parameters": {}, "originalText": "string", "explanation": "string" }`,
      user: variables.command as string,
    };
  },
};

export const searchPrompt: PromptTemplate = {
  name: 'search_query',
  description: 'Process semantic search queries',
  buildPrompt(variables: Record<string, unknown>): PromptPayload {
    return {
      system: `[search_query] You are a semantic search engine for a project management platform.
Given a natural language question and relevant data, provide a concise answer.

Output valid JSON: { "answer": "string or null", "reasoning": "string" }`,
      user: JSON.stringify(variables),
    };
  },
};
