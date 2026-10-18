/**
 * @file services/goal-tracking.service.ts
 *
 * Goal & OKR Tracking Service.
 * Manages Quarterly, Monthly, and Sprint Goals and automatically computes progress based on project task data.
 */

import { prisma } from '../lib/prisma.js';

export class GoalTrackingService {
  /**
   * Fetch Goals for workspace
   */
  static async getGoals(workspaceId: string, projectId?: string) {
    const goals = await prisma.goal.findMany({
      where: { workspaceId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-update progress based on task completion
    const tasks = await prisma.task.findMany({ where: { project: { workspaceId } } });
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const totalTasks = tasks.length || 1;
    const taskProgressPct = Math.round((completedTasks / totalTasks) * 100);

    return goals.map((g) => {
      const prog = g.currentProgress || g.progress || 0;
      return {
        ...g,
        currentProgress: prog > 0 ? prog : taskProgressPct,
      };
    });
  }

  /**
   * Create a new Goal / OKR
   */
  static async createGoal(payload: {
    title: string;
    description?: string | null;
    type?: string;
    targetMetric?: string | null;
    currentProgress?: number;
    status?: string;
    startDate?: string | null;
    targetDate?: string | null;
    workspaceId: string;
    projectId?: string | null;
  }) {
    return prisma.goal.create({
      data: {
        title: payload.title,
        description: payload.description || null,
        type: payload.type || 'QUARTERLY',
        targetMetric: payload.targetMetric || null,
        currentProgress: payload.currentProgress || 0,
        progress: payload.currentProgress || 0,
        status: payload.status || 'ON_TRACK',
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
        workspaceId: payload.workspaceId,
        projectId: payload.projectId || null,
      },
    });
  }
}
