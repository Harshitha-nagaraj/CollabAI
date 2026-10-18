/**
 * @file controllers/ai.controller.ts
 *
 * Express handlers for all AI endpoints.
 * Each handler delegates to the corresponding AI service.
 */

import { Request, Response } from 'express';
import { MeetingProcessor } from '../ai/services/meeting-processor.js';
import { TaskGenerator } from '../ai/services/task-generator.js';
import { InsightsEngine } from '../ai/services/insights-engine.js';
import { CommandParser } from '../ai/services/command-parser.js';
import { SearchEngine } from '../ai/services/search-engine.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { TaskMatchingService, normalizeTaskStatus } from '../services/task-matching.service.js';

// ─── Meeting Summarize ──────────────────────────────────────────────────────

export const summarizeMeeting = async (req: Request, res: Response) => {
  try {
    const { transcript, participants } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ success: false, error: 'Transcript is required' });
    }

    const summary = await MeetingProcessor.process(transcript, participants);
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    logger.error('summarizeMeeting error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process meeting' });
  }
};

// ─── Task Generation ────────────────────────────────────────────────────────

export const generateTasks = async (req: Request, res: Response) => {
  try {
    const { text, workspaceId } = req.body;
    const userId = req.user!.id;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    // Get workspace members for assignee matching
    const members = await prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const memberInfo = members.map(m => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }));

    const tasks = await TaskGenerator.generate(text, memberInfo);
    return res.status(200).json({ success: true, data: { tasks } });
  } catch (error) {
    logger.error('generateTasks error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate tasks' });
  }
};

// ─── Sprint Plan ────────────────────────────────────────────────────────────

export const generateSprintPlan = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    const userId = req.user!.id;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const plan = await InsightsEngine.generateSprintPlan(workspaceId);
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    logger.error('generateSprintPlan error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate sprint plan' });
  }
};

// ─── Workload Analysis ──────────────────────────────────────────────────────

export const getWorkloadAnalysis = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const analysis = await InsightsEngine.analyzeWorkload(workspaceId);
    return res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    logger.error('getWorkloadAnalysis error:', error);
    return res.status(500).json({ success: false, error: 'Failed to analyze workload' });
  }
};

// ─── Project Health ─────────────────────────────────────────────────────────

export const getProjectHealth = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const health = await InsightsEngine.getProjectHealth(workspaceId);
    return res.status(200).json({ success: true, data: health });
  } catch (error) {
    logger.error('getProjectHealth error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get project health' });
  }
};

// ─── Daily Standup ──────────────────────────────────────────────────────────

export const getDailyStandup = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const standup = await InsightsEngine.getDailyStandup(workspaceId);
    return res.status(200).json({ success: true, data: standup });
  } catch (error) {
    logger.error('getDailyStandup error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate standup' });
  }
};

// ─── Weekly Report ──────────────────────────────────────────────────────────

export const generateWeeklyReport = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    const userId = req.user!.id;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const report = await InsightsEngine.generateWeeklyReport(workspaceId);
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    logger.error('generateWeeklyReport error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate weekly report' });
  }
};

// ─── Natural Language Command ───────────────────────────────────────────────

export const executeCommand = async (req: Request, res: Response) => {
  try {
    const { command, workspaceId } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ success: false, error: 'Command is required' });
    }

    const userId = req.user!.id;
    if (workspaceId) {
      const membership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });
      if (!membership) {
        return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
      }
    }

    const parsed = await CommandParser.parse(command);

    // If workspaceId is provided and action is move_task or assign_task, perform matching
    if (workspaceId && (parsed.action === 'move_task' || parsed.action === 'assign_task')) {
      const targetQuery = parsed.executablePayload?.targetQuery || parsed.parameters.query || command;
      const matchResult = await TaskMatchingService.matchTaskInWorkspace(workspaceId, targetQuery);

      parsed.taskMatch = {
        status: matchResult.status,
        message: matchResult.message,
        matches: matchResult.matches,
      };

      if (matchResult.status === 'exact' || matchResult.status === 'partial') {
        const matched = matchResult.task!;
        parsed.executablePayload = {
          ...parsed.executablePayload,
          taskId: matched.id,
          taskTitle: matched.title,
          projectName: matched.projectName,
        };
        parsed.explanation = `${parsed.action === 'move_task' ? 'Move' : 'Assign'} task "${matched.title}"${
          parsed.action === 'move_task' ? ` to ${parsed.executablePayload?.targetStatus}` : ''
        }`;
      } else if (matchResult.status === 'multiple') {
        parsed.explanation = `Multiple tasks matched "${targetQuery}". Please choose which task to update.`;
        if (parsed.executablePayload) {
          parsed.executablePayload.taskId = null;
        }
      } else if (matchResult.status === 'none') {
        parsed.explanation = matchResult.message;
        if (parsed.executablePayload) {
          parsed.executablePayload.taskId = null;
        }
      }
    }

    return res.status(200).json({ success: true, data: parsed });
  } catch (error) {
    logger.error('executeCommand error:', error);
    return res.status(500).json({ success: false, error: 'Failed to parse command' });
  }
};

export const confirmCommand = async (req: Request, res: Response) => {
  try {
    const { action, payload, workspaceId } = req.body;
    const userId = req.user!.id;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    let resultMessage = 'Action executed successfully';

    if (action === 'create_task') {
      // Find a project in the workspace
      const project = await prisma.project.findFirst({
        where: { workspaceId },
      });
      if (!project) {
        return res.status(400).json({ success: false, error: 'No project found in workspace to attach task' });
      }

      let assigneeId: string | null = null;
      if (payload?.assigneeName) {
        const assigneeUser = await prisma.user.findFirst({
          where: {
            memberships: { some: { workspaceId } },
            OR: [
              { name: { contains: payload.assigneeName, mode: 'insensitive' } },
              { email: { contains: payload.assigneeName, mode: 'insensitive' } },
            ],
          },
        });
        if (assigneeUser) assigneeId = assigneeUser.id;
      }

      const newTask = await prisma.task.create({
        data: {
          title: payload?.title || 'New Task',
          description: `Created via AI Natural Language Command`,
          priority: (payload?.priority || 'HIGH') as any,
          status: 'TODO',
          projectId: project.id,
          creatorId: userId,
          assigneeId,
        },
      });

      resultMessage = `Created task "${newTask.title}"${assigneeId ? ' and assigned to member' : ''}.`;
    } else if (action === 'move_task' || action === 'assign_task') {
      let targetTask: { id: string; title: string; status: any } | null = null;

      // 1. If payload already has taskId (e.g. from user selection or unambiguous match), verify it belongs to this workspace
      if (payload?.taskId) {
        const found = await prisma.task.findFirst({
          where: {
            id: payload.taskId,
            OR: [
              { workspaceId },
              { project: { workspaceId } },
            ],
          },
          select: { id: true, title: true, status: true },
        });

        if (!found) {
          return res.status(404).json({
            success: false,
            error: 'Task not found in this workspace. Please check the task or workspace.',
          });
        }
        targetTask = found;
      } else {
        // 2. No taskId provided: resolve using TaskMatchingService
        const rawQuery = payload?.targetQuery || payload?.query;
        if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Task title or query is required to match a task.',
          });
        }

        const matchResult = await TaskMatchingService.matchTaskInWorkspace(workspaceId, rawQuery);

        if (matchResult.status === 'none') {
          return res.status(404).json({
            success: false,
            error: matchResult.message,
          });
        }

        if (matchResult.status === 'multiple') {
          return res.status(400).json({
            success: false,
            error: matchResult.message,
            candidates: matchResult.matches,
          });
        }

        targetTask = matchResult.task!;
      }

      if (action === 'move_task') {
        const targetStatus = normalizeTaskStatus(payload?.targetStatus || payload?.status);
        await prisma.task.update({
          where: { id: targetTask.id },
          data: { status: targetStatus },
        });
        resultMessage = `Moved task "${targetTask.title}" to ${targetStatus}.`;
      } else if (action === 'assign_task') {
        let assigneeId: string | null = null;
        if (payload?.assigneeName) {
          const assigneeUser = await prisma.user.findFirst({
            where: {
              memberships: { some: { workspaceId } },
              OR: [
                { name: { contains: payload.assigneeName, mode: 'insensitive' } },
                { email: { contains: payload.assigneeName, mode: 'insensitive' } },
              ],
            },
          });
          if (assigneeUser) assigneeId = assigneeUser.id;
        }

        await prisma.task.update({
          where: { id: targetTask.id },
          data: { assigneeId },
        });
        resultMessage = `Updated task "${targetTask.title}"${assigneeId ? ' and assigned to member' : ''}.`;
      }
    } else if (action === 'schedule_meeting') {
      const meeting = await prisma.meeting.create({
        data: {
          title: payload?.title || 'Sprint Planning',
          description: 'Scheduled via AI Command Bar',
          startTime: new Date(Date.now() + 86400000), // tomorrow
          endTime: new Date(Date.now() + 86400000 + 3600000),
          workspaceId,
          creatorId: userId,
        },
      });
      resultMessage = `Scheduled meeting "${meeting.title}" for tomorrow.`;
    }

    return res.status(200).json({ success: true, data: { message: resultMessage } });
  } catch (error) {
    logger.error('confirmCommand error:', error);
    return res.status(500).json({ success: false, error: 'Failed to execute command action' });
  }
};

// ─── Workload Balancer Apply ────────────────────────────────────────────────

export const applyWorkloadReassignment = async (req: Request, res: Response) => {
  try {
    const { taskId, toUserId, workspaceId } = req.body;
    const userId = req.user!.id;

    if (!taskId || !toUserId || !workspaceId) {
      return res.status(400).json({ success: false, error: 'taskId, toUserId, and workspaceId are required' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: toUserId },
      include: { assignee: { select: { name: true, email: true } } },
    });

    return res.status(200).json({
      success: true,
      data: {
        message: `Task "${task.title}" reassigned to ${task.assignee?.name || task.assignee?.email || 'new assignee'} successfully.`,
      },
    });
  } catch (error) {
    logger.error('applyWorkloadReassignment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to apply workload reassignment' });
  }
};

// ─── AI Search ──────────────────────────────────────────────────────────────

export const aiSearch = async (req: Request, res: Response) => {
  try {
    const { query, workspaceId } = req.body;
    const userId = req.user!.id;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const results = await SearchEngine.search(query, workspaceId);
    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    logger.error('aiSearch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to search' });
  }
};
