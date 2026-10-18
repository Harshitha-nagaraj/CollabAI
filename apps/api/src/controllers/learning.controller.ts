/**
 * @file controllers/learning.controller.ts
 *
 * Express Controller handlers for AI Learning Engine API.
 */

import { Request, Response, NextFunction } from 'express';
import { LearningEngineService } from '../services/learning-engine.service.js';

export type AuthenticatedRequest = Request & {
  user?: any;
};

/**
 * GET /api/v1/workspaces/:workspaceId/learning/retrospectives/project/:projectId
 */
export async function getProjectRetrospective(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;

    const result = await LearningEngineService.getOrGenerateProjectRetrospective(workspaceId, projectId, userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/learning/retrospectives/project/:id
 */
export async function updateProjectRetrospective(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const updated = await LearningEngineService.updateProjectRetrospective(id, data);
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/learning/retrospectives/sprint
 */
export async function createSprintRetrospective(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;
    const { sprintName, projectId } = req.body;

    const result = await LearningEngineService.createSprintRetrospective(
      workspaceId,
      userId,
      sprintName || 'Sprint Retrospective',
      projectId
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/learning/estimate
 */
export async function estimateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { taskTitle, description, tags, assigneeId } = req.body;

    const result = await LearningEngineService.estimateTaskEffort(workspaceId, {
      taskTitle,
      description,
      tags,
      assigneeId,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/learning/team-performance
 */
export async function getTeamPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const result = await LearningEngineService.getTeamPerformanceInsights(workspaceId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/learning/templates
 */
export async function getProjectTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const result = await LearningEngineService.getProjectTemplates(workspaceId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/learning/templates/instantiate
 */
export async function instantiateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;
    const { templateId, projectName, projectDescription } = req.body;

    const result = await LearningEngineService.instantiateTemplate(
      workspaceId,
      userId,
      templateId,
      projectName,
      projectDescription
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/learning/best-practices
 */
export async function getBestPractices(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const result = await LearningEngineService.getAIBestPractices(workspaceId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/learning/pre-flight
 */
export async function getPreFlightRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { projectName } = req.body;

    const result = await LearningEngineService.getPreFlightRecommendations(workspaceId, projectName || 'New Project');
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/learning/benchmarks
 */
export async function getImprovementMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const result = await LearningEngineService.getImprovementDashboardMetrics(workspaceId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/learning/library/search
 */
export async function searchOrganizationalKnowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { query } = req.body;

    const result = await LearningEngineService.searchOrganizationalKnowledge(workspaceId, query || '');
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}
