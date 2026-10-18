/**
 * @file controllers/executive.controller.ts
 *
 * Controllers for Executive AI Command Center, Portfolio Dashboard, Team Health, and OKRs.
 */

import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolio.service.js';
import { GoalTrackingService } from '../services/goal-tracking.service.js';
import { ExecutiveReportingService } from '../services/executive-reporting.service.js';

export async function getPortfolioDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const data = await PortfolioService.getPortfolioDashboard(wsId as string);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch portfolio dashboard' });
  }
}

export async function getGoals(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, projectId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const goals = await GoalTrackingService.getGoals(wsId as string, projectId as string);
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch goals' });
  }
}

export async function createGoal(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, type, targetMetric, currentProgress, status, startDate, targetDate, workspaceId, projectId } = req.body;

    if (!title || !workspaceId) {
      res.status(400).json({ error: 'title and workspaceId are required.' });
      return;
    }

    const goal = await GoalTrackingService.createGoal({
      title,
      description,
      type,
      targetMetric,
      currentProgress,
      status,
      startDate,
      targetDate,
      workspaceId,
      projectId,
    });

    res.status(201).json(goal);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create goal' });
  }
}

export async function exportReport(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, title, format } = req.body;

    if (!workspaceId || !format) {
      res.status(400).json({ error: 'workspaceId and format are required.' });
      return;
    }

    const report = await ExecutiveReportingService.exportReport({
      workspaceId,
      title,
      format,
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export executive report' });
  }
}

export async function actionRecommendation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, workspaceId } = req.body;
    const recId = (Array.isArray(id) ? id[0] : id) || '';

    if (!recId || !action || !workspaceId) {
      res.status(400).json({ error: 'recommendationId, action, and workspaceId are required.' });
      return;
    }

    const result = await PortfolioService.actionRecommendation({
      recommendationId: recId,
      action,
      workspaceId,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to action recommendation' });
  }
}
