/**
 * @file ai/services/timeline-comparator.service.ts
 *
 * Timeline Comparator Service.
 * Compares current project timeline with simulated timeline to identify:
 * - Delayed Milestones
 * - Improved / Advanced Milestones
 * - New target completion dates
 * - Categorized affected tasks with detailed explanations.
 */

import type { TimelineDiff, AffectedTaskItem, DelayedMilestone, ImprovedMilestone, SimulatedTask } from '../types/simulation.types.js';
import type { RawTaskInput } from './simulation-engine.service.js';

export class TimelineComparator {
  static compareTimelines(
    baselineTasks: RawTaskInput[],
    simulatedTasks: SimulatedTask[],
    baselineCompletionDate: string,
    simulatedCompletionDate: string
  ): TimelineDiff {
    const delayedMilestones: DelayedMilestone[] = [];
    const improvedMilestones: ImprovedMilestone[] = [];
    const affectedTasks: AffectedTaskItem[] = [];

    const baselineMap = new Map<string, RawTaskInput>(
      baselineTasks.map((t) => [t.id, t])
    );

    for (const simTask of simulatedTasks) {
      if (simTask.isSimulatedNew) {
        affectedTasks.push({
          id: simTask.id,
          title: simTask.title,
          impactType: 'CREATED',
          detail: `New simulated task introduced (${simTask.estimatedHours}h estimated effort).`,
        });
        continue;
      }

      const baseTask = baselineMap.get(simTask.id);
      if (!baseTask) continue;

      const baseDue = baseTask.dueDate ? new Date(baseTask.dueDate).getTime() : 0;
      const simDue = simTask.dueDate ? new Date(simTask.dueDate).getTime() : 0;

      const dueDiffDays = baseDue > 0 && simDue > 0
        ? Math.round((simDue - baseDue) / (1000 * 60 * 60 * 24))
        : 0;

      const origDateStr = baseTask.dueDate ? (new Date(baseTask.dueDate).toISOString().split('T')[0] || 'N/A') : 'N/A';
      const newDateStr = simTask.dueDate ? (new Date(simTask.dueDate).toISOString().split('T')[0] || 'N/A') : 'N/A';

      if (simTask.isMilestone) {
        if (dueDiffDays > 0) {
          delayedMilestones.push({
            id: simTask.id,
            title: simTask.title,
            originalDate: origDateStr,
            newDate: newDateStr,
            delayDays: dueDiffDays,
          });
        } else if (dueDiffDays < 0) {
          improvedMilestones.push({
            id: simTask.id,
            title: simTask.title,
            originalDate: origDateStr,
            newDate: newDateStr,
            advanceDays: Math.abs(dueDiffDays),
          });
        }
      }

      if (simTask.isBlocked) {
        affectedTasks.push({
          id: simTask.id,
          title: simTask.title,
          impactType: 'BLOCKED',
          detail: `Task is blocked or missing assigned resource.`,
        });
      } else if (dueDiffDays > 0) {
        affectedTasks.push({
          id: simTask.id,
          title: simTask.title,
          impactType: 'DELAYED',
          detail: `Completion delayed by ${dueDiffDays} day(s).`,
        });
      } else if (dueDiffDays < 0) {
        affectedTasks.push({
          id: simTask.id,
          title: simTask.title,
          impactType: 'ADVANCED',
          detail: `Completion accelerated by ${Math.abs(dueDiffDays)} day(s).`,
        });
      } else if (baseTask.assigneeId !== simTask.assigneeId) {
        affectedTasks.push({
          id: simTask.id,
          title: simTask.title,
          impactType: 'REASSIGNED',
          detail: `Assignee modified to ${simTask.assigneeName}.`,
        });
      }
    }

    return {
      delayedMilestones,
      improvedMilestones,
      baselineCompletionDate,
      simulatedCompletionDate,
      affectedTasks,
    };
  }
}
