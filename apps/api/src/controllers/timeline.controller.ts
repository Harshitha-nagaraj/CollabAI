/**
 * @file controllers/timeline.controller.ts
 *
 * Controller for Project Timeline, Dependencies & AI Delay Predictions.
 */

import { Request, Response } from 'express';
import { TimelineService } from '../services/timeline.service.js';

export async function getProjectTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { workspaceId } = req.query;

    const projId = (Array.isArray(projectId) ? projectId[0] : projectId) || '';
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!projId || !wsId) {
      res.status(400).json({ error: 'projectId and workspaceId query parameters are required.' });
      return;
    }

    const timeline = await TimelineService.getProjectTimeline(projId, wsId as string);
    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch project timeline' });
  }
}

export async function addDependency(req: Request, res: Response): Promise<void> {
  try {
    const { predecessorId, successorId, type } = req.body;

    if (!predecessorId || !successorId) {
      res.status(400).json({ error: 'predecessorId and successorId are required.' });
      return;
    }

    const dependency = await TimelineService.addDependency({
      predecessorId,
      successorId,
      type,
    });

    res.status(201).json(dependency);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add dependency' });
  }
}

export async function removeDependency(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const depId = (Array.isArray(id) ? id[0] : id) || '';

    await TimelineService.removeDependency(depId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove dependency' });
  }
}

export async function autoDetectDependencies(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { workspaceId } = req.body;

    const projId = (Array.isArray(projectId) ? projectId[0] : projectId) || '';

    if (!projId || !workspaceId) {
      res.status(400).json({ error: 'projectId and workspaceId are required.' });
      return;
    }

    const result = await TimelineService.autoDetectDependencies(projId, workspaceId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to auto-detect dependencies' });
  }
}

export async function applyMitigation(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { workspaceId, recommendationId, targetTaskId, type, suggestedAction } = req.body;

    const projId = (Array.isArray(projectId) ? projectId[0] : projectId) || '';

    if (!projId || !workspaceId || !recommendationId || !targetTaskId || !type) {
      res.status(400).json({ error: 'Missing required mitigation fields.' });
      return;
    }

    const result = await TimelineService.applyMitigation({
      projectId: projId,
      workspaceId,
      recommendationId,
      targetTaskId,
      type,
      suggestedAction: suggestedAction || {},
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to apply timeline mitigation' });
  }
}
