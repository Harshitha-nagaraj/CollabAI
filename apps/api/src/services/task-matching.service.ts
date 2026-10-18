/**
 * @file services/task-matching.service.ts
 *
 * Provides robust task-matching logic scoped strictly within an authorized workspace.
 * Evaluates candidates via exact matches, case-insensitive matches, and safe partial matches.
 * Disambiguates when multiple tasks match and provides helpful feedback when no task is found.
 */

import { TaskStatus, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface MatchedTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  projectName?: string;
}

export type TaskMatchResolution = 'exact' | 'partial' | 'multiple' | 'none';

export interface TaskMatchResult {
  status: TaskMatchResolution;
  task?: MatchedTaskSummary;
  matches: MatchedTaskSummary[];
  message: string;
}

const VALID_STATUSES = new Set<TaskStatus>([
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
  TaskStatus.CANCELLED,
]);

/**
 * Normalizes user-supplied or AI-extracted status string into a valid Prisma TaskStatus.
 */
export function normalizeTaskStatus(status?: string | null): TaskStatus {
  if (!status) return TaskStatus.DONE;
  const clean = status.trim().toUpperCase().replace(/[\s-]+/g, '_');

  if (clean === 'IN_PROGRESS' || clean === 'PROGRESS' || clean === 'DOING' || clean === 'WIP') {
    return TaskStatus.IN_PROGRESS;
  }
  if (clean === 'IN_REVIEW' || clean === 'REVIEW' || clean === 'UNDER_REVIEW' || clean === 'TESTING') {
    return TaskStatus.IN_REVIEW;
  }
  if (clean === 'DONE' || clean === 'COMPLETED' || clean === 'COMPLETE' || clean === 'FINISHED') {
    return TaskStatus.DONE;
  }
  if (clean === 'TODO' || clean === 'TO_DO' || clean === 'OPEN') {
    return TaskStatus.TODO;
  }
  if (clean === 'BACKLOG') {
    return TaskStatus.BACKLOG;
  }
  if (clean === 'CANCELLED' || clean === 'CANCELED') {
    return TaskStatus.CANCELLED;
  }

  if (VALID_STATUSES.has(clean as TaskStatus)) {
    return clean as TaskStatus;
  }

  return TaskStatus.DONE;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class TaskMatchingService {
  /**
   * Cleans a raw query string by stripping command verbs, prepositions, destination statuses,
   * quotes, brackets, and surrounding punctuation.
   */
  public static cleanQuery(rawQuery: string): string {
    if (!rawQuery) return '';
    let q = rawQuery.trim();

    // Remove leading action verbs: e.g. "move task", "move", "change status of task", "mark task as", "assign task"
    q = q.replace(
      /^(?:please\s+)?(?:move|change\s+status(?:\s+of)?|update\s+status(?:\s+of)?|set\s+status(?:\s+of)?|mark|update|assign)\s+(?:task\s+)?/i,
      ''
    );

    // Remove trailing destination status patterns:
    // e.g. " to status Done.", " into Done.", " as Done.", " -> Done.", " to In Progress."
    q = q.replace(
      /\s+(?:to\s+status|into\s+status|as\s+status|status\s+to|to|into|as|->)\s+(?:todo|to-do|to\s+do|in\s+progress|in-progress|in\s+review|in-review|done|completed|backlog|cancelled|canceled)[.!?\s]*$/i,
      ''
    );

    // Remove trailing " to <Name>" from assign commands
    q = q.replace(/\s+to\s+[A-Za-z0-9_-]+[.!?\s]*$/i, '');

    // Strip surrounding quotes, brackets, backticks, and punctuation
    q = q.replace(/^["'\[`]+|["'\]`.,;!]+$/g, '').trim();

    return q;
  }

  /**
   * Matches tasks strictly within an authorized workspace.
   * Search precedence:
   * 1. Exact match (case-sensitive)
   * 2. Exact match (case-insensitive)
   * 3. Word-boundary partial match
   * 4. Substring partial match
   *
   * If multiple tasks match at any level, returns 'multiple' to ask the user to choose.
   * If zero tasks match, returns 'none' with a helpful error message.
   */
  public static async matchTaskInWorkspace(
    workspaceId: string,
    rawQuery: string
  ): Promise<TaskMatchResult> {
    const cleanQuery = this.cleanQuery(rawQuery);

    if (!cleanQuery) {
      return {
        status: 'none',
        matches: [],
        message: 'No task title specified. Please provide a task title to search for.',
      };
    }

    // Fetch tasks strictly within the authorized workspace
    const workspaceFilter = {
      OR: [
        { workspaceId },
        { project: { workspaceId } },
      ],
    };

    const allWorkspaceTasks = await prisma.task.findMany({
      where: workspaceFilter,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (allWorkspaceTasks.length === 0) {
      return {
        status: 'none',
        matches: [],
        message: `Could not find matching task for "${cleanQuery}". Please check the task title or verify you are in the correct workspace.`,
      };
    }

    const mapSummary = (t: typeof allWorkspaceTasks[0]): MatchedTaskSummary => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      projectId: t.projectId,
      projectName: t.project?.name,
    });

    const normQuery = cleanQuery.toLowerCase();
    const rawTrimmed = rawQuery.trim();

    // 1. Exact match (case-sensitive) against cleanQuery or original rawQuery
    const exactCaseMatches = allWorkspaceTasks.filter(
      (t) => t.title === cleanQuery || t.title === rawTrimmed
    );
    if (exactCaseMatches.length === 1 && exactCaseMatches[0]) {
      const task = mapSummary(exactCaseMatches[0]);
      return {
        status: 'exact',
        task,
        matches: [task],
        message: `Matched task "${task.title}".`,
      };
    } else if (exactCaseMatches.length > 1) {
      const matches = exactCaseMatches.map(mapSummary);
      return {
        status: 'multiple',
        matches,
        message: `Found ${matches.length} tasks matching "${cleanQuery}". Please choose which task to update.`,
      };
    }

    // 2. Exact match (case-insensitive)
    const exactInsensitiveMatches = allWorkspaceTasks.filter(
      (t) => t.title.toLowerCase() === normQuery || t.title.toLowerCase() === rawTrimmed.toLowerCase()
    );
    if (exactInsensitiveMatches.length === 1 && exactInsensitiveMatches[0]) {
      const task = mapSummary(exactInsensitiveMatches[0]);
      return {
        status: 'exact',
        task,
        matches: [task],
        message: `Matched task "${task.title}".`,
      };
    } else if (exactInsensitiveMatches.length > 1) {
      const matches = exactInsensitiveMatches.map(mapSummary);
      return {
        status: 'multiple',
        matches,
        message: `Found ${matches.length} tasks matching "${cleanQuery}". Please choose which task to update.`,
      };
    }

    // 3. Word-boundary partial match
    try {
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normQuery)}\\b`, 'i');
      const wordMatches = allWorkspaceTasks.filter((t) => wordBoundaryRegex.test(t.title));
      if (wordMatches.length === 1 && wordMatches[0]) {
        const task = mapSummary(wordMatches[0]);
        return {
          status: 'partial',
          task,
          matches: [task],
          message: `Matched task "${task.title}".`,
        };
      } else if (wordMatches.length > 1) {
        const matches = wordMatches.map(mapSummary);
        return {
          status: 'multiple',
          matches,
          message: `Found ${matches.length} tasks matching "${cleanQuery}". Please choose which task to update.`,
        };
      }
    } catch {
      // Fallback if regex construction fails
    }

    // 4. Substring partial match
    const substringMatches = allWorkspaceTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(normQuery) ||
        (normQuery.length > 3 && normQuery.includes(t.title.toLowerCase()))
    );

    if (substringMatches.length === 1 && substringMatches[0]) {
      const task = mapSummary(substringMatches[0]);
      return {
        status: 'partial',
        task,
        matches: [task],
        message: `Matched task "${task.title}".`,
      };
    } else if (substringMatches.length > 1) {
      const matches = substringMatches.map(mapSummary);
      return {
        status: 'multiple',
        matches,
        message: `Found ${matches.length} tasks matching "${cleanQuery}". Please choose which task to update.`,
      };
    }

    // 5. No matches found
    return {
      status: 'none',
      matches: [],
      message: `Could not find matching task for "${cleanQuery}". Please check the task title or verify you are in the correct workspace.`,
    };
  }
}
