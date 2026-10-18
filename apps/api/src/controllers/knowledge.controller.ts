/**
 * @file controllers/knowledge.controller.ts
 *
 * Express Controllers for Decision Log, Semantic Search Q&A, and Context Assistant.
 */

import { Request, Response } from 'express';
import { KnowledgeService } from '../services/knowledge.service.js';

export async function getDecisions(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, type, category, projectId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const decisions = await KnowledgeService.getDecisions(wsId as string, {
      type: type as string,
      category: category as string,
      projectId: projectId as string,
    });

    res.json(decisions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch decisions' });
  }
}

export async function createDecision(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, type, category, status, workspaceId, projectId, meetingId } = req.body;

    if (!title || !description || !workspaceId) {
      res.status(400).json({ error: 'title, description, and workspaceId are required.' });
      return;
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
    res.status(500).json({ error: error.message || 'Failed to create decision' });
  }
}

export async function extractDecisions(req: Request, res: Response): Promise<void> {
  try {
    const { meetingId, workspaceId } = req.body;

    if (!meetingId || !workspaceId) {
      res.status(400).json({ error: 'meetingId and workspaceId are required.' });
      return;
    }

    const decisions = await KnowledgeService.extractDecisionsFromMeeting(meetingId, workspaceId);
    res.json(decisions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to extract decisions' });
  }
}

export async function semanticSearch(req: Request, res: Response): Promise<void> {
  try {
    const { query, workspaceId } = req.body;

    if (!query || !workspaceId) {
      res.status(400).json({ error: 'query and workspaceId are required.' });
      return;
    }

    const result = await KnowledgeService.semanticSearch(query, workspaceId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to execute semantic search' });
  }
}

export async function getKnowledgeTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, projectId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const timeline = await KnowledgeService.getKnowledgeTimeline(wsId as string, projectId as string);
    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch knowledge timeline' });
  }
}

export async function getContextAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { contextId, title, workspaceId } = req.query;
    const ctxId = (Array.isArray(contextId) ? contextId[0] : contextId) || 'default-context';
    const ctxTitle = (Array.isArray(title) ? title[0] : title) || 'General Task';
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const context = await KnowledgeService.getContextAssistant(ctxId as string, ctxTitle as string, wsId as string);
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch AI context assistant' });
  }
}
