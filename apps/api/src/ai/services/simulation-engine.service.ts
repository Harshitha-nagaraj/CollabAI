/**
 * @file ai/services/simulation-engine.service.ts
 *
 * Isolated Simulation Engine.
 * Takes live project tasks, team members, and a set of simulation actions,
 * clones the state in-memory, and calculates simulated task schedules,
 * dependency cascades, slack times, and assigned workloads WITHOUT altering real DB data.
 */

import type { SimulationAction, SimulatedTask } from '../types/simulation.types.js';
import { CriticalPathAnalyzer, TaskNode } from './critical-path.service.js';

export interface RawTaskInput {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  estimatedHours?: number | null;
  progress?: number;
  isMilestone?: boolean;
  assigneeId?: string | null;
  assignee?: { id: string; name?: string | null; email?: string } | null;
  dependencies?: { predecessorId: string }[];
  dependents?: { successorId: string }[];
}

export interface RawMemberInput {
  userId: string;
  name: string;
  role?: string;
}

export class SimulationEngine {
  /**
   * Run pure in-memory simulation against project data snapshot
   */
  static runSimulation(
    baselineTasks: RawTaskInput[],
    members: RawMemberInput[],
    actions: SimulationAction[]
  ): {
    simulatedTasks: SimulatedTask[];
    membersMap: Map<string, RawMemberInput>;
  } {
    const tasksMap = new Map<string, SimulatedTask>();
    const membersMap = new Map<string, RawMemberInput>(
      members.map((m) => [m.userId, m])
    );

    // Baseline task conversion
    for (const t of baselineTasks) {
      const predIds = (t.dependencies || []).map((d) => d.predecessorId);
      const succIds = (t.dependents || []).map((d) => d.successorId);

      const startIso = t.startDate ? new Date(t.startDate).toISOString() : new Date().toISOString();
      const dueIso = t.dueDate ? new Date(t.dueDate).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString();

      tasksMap.set(t.id, {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status || 'TODO',
        priority: t.priority || 'MEDIUM',
        startDate: startIso,
        dueDate: dueIso,
        estimatedHours: t.estimatedHours || 16,
        progress: t.progress || 0,
        assigneeId: t.assigneeId || null,
        assigneeName: t.assignee?.name || t.assignee?.email || 'Unassigned',
        isMilestone: t.isMilestone || false,
        predecessorIds: predIds,
        successorIds: succIds,
        delayDays: 0,
        isBlocked: false,
        isCritical: false,
        slackDays: 0,
        isSimulatedNew: false,
      });
    }

    // Apply Actions in order
    for (const action of actions) {
      this.applyAction(action, tasksMap, membersMap);
    }

    // Topological cascade
    this.recalculateDependenciesAndSchedule(tasksMap);

    // Critical Path Analysis
    const taskNodes: TaskNode[] = Array.from(tasksMap.values()).map((t) => {
      const start = t.startDate ? new Date(t.startDate).getTime() : Date.now();
      const due = t.dueDate ? new Date(t.dueDate).getTime() : start + 7 * 86400000;
      const durationDays = Math.max(1, Math.ceil((due - start) / (1000 * 60 * 60 * 24)));
      return {
        id: t.id,
        title: t.title,
        durationDays,
        startDate: t.startDate,
        dueDate: t.dueDate,
        status: t.status,
        progress: t.progress,
        isMilestone: t.isMilestone,
        predecessorIds: t.predecessorIds,
        successorIds: t.successorIds,
      };
    });

    const cpmResult = CriticalPathAnalyzer.analyze(taskNodes);
    for (const [id, metric] of Object.entries(cpmResult.taskMetrics)) {
      const task = tasksMap.get(id);
      if (task) {
        task.isCritical = metric.isCritical;
        task.slackDays = metric.totalFloatDays;
      }
    }

    return {
      simulatedTasks: Array.from(tasksMap.values()),
      membersMap,
    };
  }

  private static applyAction(
    action: SimulationAction,
    tasksMap: Map<string, SimulatedTask>,
    membersMap: Map<string, RawMemberInput>
  ) {
    switch (action.type) {
      case 'DELAY_TASK': {
        const days = action.days || 5;
        let targetTask: SimulatedTask | undefined;

        if (action.taskId && tasksMap.has(action.taskId)) {
          targetTask = tasksMap.get(action.taskId);
        } else if (action.taskTitle) {
          const titleLower = action.taskTitle.toLowerCase();
          targetTask = Array.from(tasksMap.values()).find((t) =>
            t.title.toLowerCase().includes(titleLower)
          );
        }

        if (targetTask && targetTask.dueDate) {
          targetTask.delayDays += days;
          const currentDue = new Date(targetTask.dueDate);
          currentDue.setDate(currentDue.getDate() + days);
          targetTask.dueDate = currentDue.toISOString();
        }
        break;
      }

      case 'ADD_DEVELOPER': {
        const devName = action.developerName || `Dev (${action.developerRole || 'Engineer'})`;
        const newId = `sim-dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        membersMap.set(newId, {
          userId: newId,
          name: devName,
          role: action.developerRole || 'Developer',
        });
        break;
      }

      case 'REMOVE_MEMBER':
      case 'EMPLOYEE_LEAVE': {
        const targetName = action.targetMemberName || action.developerName;
        let removedUserId: string | null = action.userId || null;

        if (!removedUserId && targetName) {
          const lowerName = targetName.toLowerCase();
          for (const [mId, m] of membersMap.entries()) {
            if (m.name.toLowerCase().includes(lowerName)) {
              removedUserId = mId;
              break;
            }
          }
        }

        if (removedUserId) {
          for (const task of tasksMap.values()) {
            if (task.assigneeId === removedUserId) {
              if (action.type === 'EMPLOYEE_LEAVE') {
                const leaveDays = action.days || 7;
                task.delayDays += leaveDays;
                if (task.dueDate) {
                  const d = new Date(task.dueDate);
                  d.setDate(d.getDate() + leaveDays);
                  task.dueDate = d.toISOString();
                }
              } else {
                task.assigneeId = null;
                task.assigneeName = 'Unassigned (Member Removed)';
                task.isBlocked = true;
              }
            }
          }
          if (action.type === 'REMOVE_MEMBER') {
            membersMap.delete(removedUserId);
          }
        }
        break;
      }

      case 'SPRINT_DURATION': {
        const deltaDays = action.sprintDeltaDays || action.days || 7;
        for (const task of tasksMap.values()) {
          if (task.status !== 'DONE' && task.dueDate) {
            const d = new Date(task.dueDate);
            d.setDate(d.getDate() + deltaDays);
            task.dueDate = d.toISOString();
          }
        }
        break;
      }

      case 'MOVE_TASK': {
        const days = action.days || 0;
        let targetTask: SimulatedTask | undefined;

        if (action.taskId && tasksMap.has(action.taskId)) {
          targetTask = tasksMap.get(action.taskId);
        } else if (action.taskTitle) {
          const titleLower = action.taskTitle.toLowerCase();
          targetTask = Array.from(tasksMap.values()).find((t) =>
            t.title.toLowerCase().includes(titleLower)
          );
        }

        if (targetTask) {
          if (targetTask.startDate) {
            const s = new Date(targetTask.startDate);
            s.setDate(s.getDate() + days);
            targetTask.startDate = s.toISOString();
          }
          if (targetTask.dueDate) {
            const d = new Date(targetTask.dueDate);
            d.setDate(d.getDate() + days);
            targetTask.dueDate = d.toISOString();
          }
        }
        break;
      }

      case 'PRIORITY_CHANGE': {
        if (action.taskId && tasksMap.has(action.taskId)) {
          const t = tasksMap.get(action.taskId)!;
          t.priority = action.newPriority || 'HIGH';
        }
        break;
      }

      case 'ADD_FEATURE':
      case 'CRITICAL_BUG': {
        const newTaskId = `sim-task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const isBug = action.type === 'CRITICAL_BUG';
        const title = action.featureTitle || action.description || (isBug ? 'Critical Bug Fix' : 'New Feature');
        const estHours = action.estimatedHours || (isBug ? 24 : 40);

        const now = new Date();
        const due = new Date();
        due.setDate(now.getDate() + Math.ceil(estHours / 8));

        tasksMap.set(newTaskId, {
          id: newTaskId,
          title,
          description: isBug ? 'Simulated critical bug fix required before release' : 'Simulated new feature request',
          status: 'TODO',
          priority: isBug ? 'URGENT' : 'HIGH',
          startDate: now.toISOString(),
          dueDate: due.toISOString(),
          estimatedHours: estHours,
          progress: 0,
          assigneeId: null,
          assigneeName: 'Unassigned',
          isMilestone: false,
          predecessorIds: [],
          successorIds: [],
          delayDays: 0,
          isBlocked: false,
          isCritical: isBug,
          slackDays: 0,
          isSimulatedNew: true,
        });
        break;
      }

      case 'SCOPE_CHANGE': {
        const pct = action.scopePercentage || 25;
        const multiplier = 1 + pct / 100;

        for (const task of tasksMap.values()) {
          if (task.status !== 'DONE') {
            task.estimatedHours = Math.round(task.estimatedHours * multiplier);
            if (task.dueDate && task.startDate) {
              const start = new Date(task.startDate).getTime();
              const due = new Date(task.dueDate).getTime();
              const dur = due - start;
              const newDur = Math.round(dur * multiplier);
              task.dueDate = new Date(start + newDur).toISOString();
            }
          }
        }
        break;
      }
    }
  }

  private static recalculateDependenciesAndSchedule(tasksMap: Map<string, SimulatedTask>) {
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 20) {
      changed = false;
      iterations++;

      for (const task of tasksMap.values()) {
        if (task.predecessorIds.length > 0) {
          let maxPredFinishTime = 0;

          for (const predId of task.predecessorIds) {
            const pred = tasksMap.get(predId);
            if (pred && pred.dueDate) {
              const predFinish = new Date(pred.dueDate).getTime();
              if (predFinish > maxPredFinishTime) {
                maxPredFinishTime = predFinish;
              }
            }
          }

          if (maxPredFinishTime > 0) {
            const currentStart = task.startDate ? new Date(task.startDate).getTime() : 0;

            if (maxPredFinishTime > currentStart) {
              const duration = task.startDate && task.dueDate
                ? new Date(task.dueDate).getTime() - currentStart
                : 7 * 86400000;

              task.startDate = new Date(maxPredFinishTime).toISOString();
              task.dueDate = new Date(maxPredFinishTime + duration).toISOString();
              changed = true;
            }
          }
        }
      }
    }
  }
}
