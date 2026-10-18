/**
 * @file services/timeline.service.ts
 *
 * Full service implementation for CollabAI Project Timeline, Dependencies & Critical Path Engine.
 */

import { prisma } from '../lib/prisma.js';
import { CriticalPathAnalyzer, type TaskNode } from '../ai/services/critical-path.service.js';
import { DelayPredictionEngine } from '../ai/services/delay-prediction.service.js';
import { DependencyDetectorEngine } from '../ai/services/dependency-detector.service.js';
import { NotificationService } from './notification.service.js';
import { TaskService } from './task.service.js';

export class TimelineService {
  /**
   * Fetch complete timeline state for a project (tasks, dependencies, critical path, delay risk, AI recommendations)
   */
  static async getProjectTimeline(projectId: string, workspaceId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
            dependencies: { include: { predecessor: { select: { id: true, title: true } } } },
            dependents: { include: { successor: { select: { id: true, title: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        workspace: {
          include: {
            memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const rawTasks = project.tasks;

    // Format tasks for Critical Path Analyzer
    const taskNodes: TaskNode[] = rawTasks.map((t) => {
      const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      const due = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000);
      const diffTime = Math.abs(due.getTime() - start.getTime());
      const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      return {
        id: t.id,
        title: t.title,
        durationDays,
        startDate: t.startDate ? (new Date(t.startDate).toISOString().split('T')[0] as string) : null,
        dueDate: t.dueDate ? (new Date(t.dueDate).toISOString().split('T')[0] as string) : null,
        status: t.status,
        progress: t.progress || (t.status === 'DONE' ? 100 : t.status === 'IN_PROGRESS' ? 50 : 0),
        isMilestone: t.isMilestone || t.title.toLowerCase().includes('milestone') || t.title.toLowerCase().includes('release'),
        predecessorIds: t.dependencies.map((d) => d.predecessorId),
        successorIds: t.dependents.map((d) => d.successorId),
      };
    });

    // 1. Calculate Critical Path
    const criticalPath = CriticalPathAnalyzer.analyze(taskNodes);

    // 2. Format member workload
    const members = project.workspace.memberships.map((m) => {
      const memberTasks = rawTasks.filter((t) => t.assigneeId === m.userId && t.status !== 'DONE').length;
      return {
        id: m.userId,
        name: m.user.name || m.user.email,
        workloadPercentage: Math.min(100, memberTasks * 25),
      };
    });

    // 3. AI Delay Prediction
    const delayPrediction = await DelayPredictionEngine.predict({
      projectName: project.name,
      tasks: taskNodes,
      criticalPath,
      members,
    });

    // Format final tasks payload with critical path indicator
    const enrichedTasks = rawTasks.map((t) => {
      const isCritical = criticalPath.criticalPathTaskIds.includes(t.id);
      const cpm = criticalPath.taskMetrics[t.id];

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : null,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : null,
        estimatedHours: t.estimatedHours || 16,
        progress: t.progress || (t.status === 'DONE' ? 100 : t.status === 'IN_PROGRESS' ? 50 : 0),
        isMilestone: t.isMilestone || t.title.toLowerCase().includes('milestone'),
        assignee: t.assignee,
        isCriticalPath: isCritical,
        slackHours: cpm?.slackHours || 0,
        predecessors: t.dependencies.map((d) => ({
          id: d.id,
          predecessorId: d.predecessorId,
          title: d.predecessor.title,
          type: d.type,
        })),
        successors: t.dependents.map((d) => ({
          id: d.id,
          successorId: d.successorId,
          title: d.successor.title,
          type: d.type,
        })),
      };
    });

    const milestones = enrichedTasks.filter((t) => t.isMilestone);

    return {
      projectId: project.id,
      projectName: project.name,
      tasks: enrichedTasks,
      milestones,
      criticalPath,
      delayPrediction,
      projectCompletionPercentage: Math.round(
        (enrichedTasks.filter((t) => t.status === 'DONE').length / (enrichedTasks.length || 1)) * 100
      ),
    };
  }

  /**
   * Add a task dependency link (Predecessor -> Successor)
   */
  static async addDependency(payload: {
    predecessorId: string;
    successorId: string;
    type?: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  }) {
    if (payload.predecessorId === payload.successorId) {
      throw new Error('A task cannot depend on itself.');
    }

    return prisma.taskDependency.create({
      data: {
        predecessorId: payload.predecessorId,
        successorId: payload.successorId,
        type: payload.type || 'FINISH_TO_START',
      },
      include: {
        predecessor: { select: { id: true, title: true } },
        successor: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * Delete a task dependency
   */
  static async removeDependency(dependencyId: string) {
    return prisma.taskDependency.delete({
      where: { id: dependencyId },
    });
  }

  /**
   * Auto-detect dependencies using AI
   */
  static async autoDetectDependencies(projectId: string, workspaceId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: { tasks: true },
    });

    if (!project) throw new Error('Project not found');

    const detected = await DependencyDetectorEngine.detect(project.tasks);
    const created = [];

    for (const dep of detected) {
      try {
        const link = await this.addDependency({
          predecessorId: dep.predecessorId,
          successorId: dep.successorId,
          type: dep.type,
        });
        created.push(link);
      } catch (err) {
        // Ignore duplicate dependency error
      }
    }

    return { detected, createdCount: created.length };
  }

  /**
   * Apply an AI timeline mitigation recommendation (1-Click Execution)
   */
  static async applyMitigation(payload: {
    projectId: string;
    workspaceId: string;
    recommendationId: string;
    targetTaskId: string;
    type: 'REASSIGN_TASK' | 'SPLIT_TASK' | 'ADJUST_DEADLINE' | 'REORDER_WORK';
    suggestedAction: {
      toAssigneeId?: string;
      toAssigneeName?: string;
      newDueDate?: string;
      subtaskTitles?: string[];
    };
  }) {
    if (payload.type === 'REASSIGN_TASK' && payload.suggestedAction.toAssigneeId) {
      await prisma.task.update({
        where: { id: payload.targetTaskId },
        data: { assigneeId: payload.suggestedAction.toAssigneeId },
      });

      await NotificationService.createNotification({
        userId: payload.suggestedAction.toAssigneeId,
        workspaceId: payload.workspaceId,
        title: 'Task Reassigned for Timeline Optimization',
        message: `Task was reassigned to you to alleviate critical path bottleneck.`,
        type: 'TASK_REASSIGNED',
        link: '/dashboard/timeline',
      });
    } else if (payload.type === 'ADJUST_DEADLINE' && payload.suggestedAction.newDueDate) {
      await prisma.task.update({
        where: { id: payload.targetTaskId },
        data: { dueDate: new Date(payload.suggestedAction.newDueDate) },
      });
    } else if (payload.type === 'SPLIT_TASK' && payload.suggestedAction.subtaskTitles?.length) {
      const originalTask = await prisma.task.findUnique({ where: { id: payload.targetTaskId } });
      if (originalTask) {
        for (const subTitle of payload.suggestedAction.subtaskTitles) {
          await TaskService.createTask(originalTask.creatorId, {
            title: subTitle,
            description: `Split subtask derived from "${originalTask.title}" for timeline optimization.`,
            status: 'TODO',
            priority: originalTask.priority,
            projectId: payload.projectId,
            assigneeId: originalTask.assigneeId,
          });
        }
      }
    }

    return { success: true, recommendationId: payload.recommendationId };
  }
}
