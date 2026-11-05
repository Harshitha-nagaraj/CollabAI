/**
 * @file controllers/knowledge.controller.ts
 *
 * Express Controllers for Decision Log, Semantic Search Q&A, and Context Assistant.
 * Strictly verifies workspace membership and permissions, returning 403 for unauthorized access.
 */

import { Request, Response } from 'express';
import { KnowledgeService } from '../services/knowledge.service.js';
import { prisma } from '../lib/prisma.js';

/**
 * Verify whether the user is a member of the requested workspace.
 */
async function verifyWorkspaceMembership(userId: string, workspaceId: string): Promise<boolean> {
  if (!userId || !workspaceId) return false;
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });
  return Boolean(membership);
}

export async function getDecisions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { workspaceId, type, category, projectId } = req.query;
    const wsId = ((Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '') as string;

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, wsId);
    if (!isMember) {
      res.status(403).json({ error: 'You do not have access to this workspace' });
      return;
    }

    // Verify projectId belongs to workspace if provided
    if (projectId) {
      const projId = (Array.isArray(projectId) ? projectId[0] : projectId) as string;
      const project = await prisma.project.findFirst({
        where: { id: projId, workspaceId: wsId },
      });
      if (!project) {
        res.status(400).json({ error: 'Project does not belong to this workspace' });
        return;
      }
    }

    const decisions = await KnowledgeService.getDecisions(wsId, {
      type: type as string,
      category: category as string,
      projectId: projectId as string,
    });

    res.json(decisions);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch decisions' });
  }
}

export async function createDecision(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title, description, type, category, status, workspaceId, projectId, meetingId } = req.body;

    if (!title || !description || !workspaceId) {
      res.status(400).json({ error: 'title, description, and workspaceId are required.' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      res.status(403).json({ error: 'You do not have access to this workspace' });
      return;
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
      });
      if (!project) {
        res.status(400).json({ error: 'Project does not belong to this workspace' });
        return;
      }
    }

    if (meetingId) {
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, workspaceId },
      });
      if (!meeting) {
        res.status(400).json({ error: 'Meeting does not belong to this workspace' });
        return;
      }
    }

    const decision = await KnowledgeService.createDecision({
      title,
      description,
      type,
      category,
      status,
      workspaceId,
      projectId,
      meetingId,
      decidedById: userId,
    });

    res.status(201).json(decision);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to create decision' });
  }
}

export async function extractDecisions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { meetingId, workspaceId } = req.body;

    if (!meetingId || !workspaceId) {
      res.status(400).json({ error: 'meetingId and workspaceId are required.' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      res.status(403).json({ error: 'You do not have access to this workspace' });
      return;
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found in this workspace' });
      return;
    }

    const decisions = await KnowledgeService.extractDecisionsFromMeeting(meetingId, workspaceId);
    res.json(decisions);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to extract decisions' });
  }
}

export async function semanticSearch(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query, workspaceId } = req.body;

    if (!query || !workspaceId) {
      res.status(400).json({ error: 'query and workspaceId are required.' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      res.status(403).json({ error: 'You do not have access to this workspace' });
      return;
    }

    const result = await KnowledgeService.semanticSearch(query, workspaceId);
    res.json(result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to execute semantic search' });
  }
}

export async function getKnowledgeTimeline(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { workspaceId, projectId } = req.query;
    const wsId = ((Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '') as string;

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, wsId);
    if (!isMember) {
      res.status(403).json({ error: 'You do not have access to this workspace' });
      return;
    }

    if (projectId) {
      const projId = (Array.isArray(projectId) ? projectId[0] : projectId) as string;
      const project = await prisma.project.findFirst({
        where: { id: projId, workspaceId: wsId },
      });
      if (!project) {
        res.status(400).json({ error: 'Project does not belong to this workspace' });
        return;
      }
    }

    const timeline = await KnowledgeService.getKnowledgeTimeline(wsId, projectId as string);
    res.json(timeline);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch knowledge timeline' });
  }
}

export async function getContextAssistant(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contextId, title, workspaceId } = req.query;
    const ctxId = (Array.isArray(contextId) ? contextId[0] : contextId) || 'default-context';
    const ctxTitle = (Array.isArray(title) ? title[0] : title) || 'General Task';
    const wsId = ((Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '') as string;

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, wsId);
    if (!isMember) {
      res.status(403).json({ error: 'You do not have access to this workspace' });
      return;
    }

    const context = await KnowledgeService.getContextAssistant(ctxId as string, ctxTitle as string, wsId);
    res.json(context);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch AI context assistant' });
  }
}
