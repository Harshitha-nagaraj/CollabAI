/**
 * @file controllers/simulation.controller.ts
 *
 * Express Controller handlers for AI Project Simulator API.
 */

import { Request, Response, NextFunction } from 'express';
import { SimulationService } from '../services/simulation.service.js';

export type AuthenticatedRequest = Request & {
  user?: any;
};

/**
 * POST /api/v1/workspaces/:workspaceId/simulations/run
 * Run pure simulation on the fly
 */
export async function runSimulation(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { actions, scenarioName, projectId } = req.body;

    const result = await SimulationService.executeSimulation(
      workspaceId,
      actions || [],
      scenarioName || 'Custom Simulation',
      projectId
    );

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/simulations/parse-nl
 * Parse natural language simulation prompt into actions
 */
export async function parseNLPrompt(req: Request, res: Response, next: NextFunction) {
  try {
    const { prompt } = req.body;
    const result = await SimulationService.parseNaturalLanguagePrompt(prompt);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/simulations/compare
 * Side-by-side scenario comparison matrix
 */
export async function compareScenarios(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { scenarios } = req.body;

    const result = await SimulationService.compareScenarios(workspaceId, scenarios || []);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/simulations
 * Save new simulation scenario to DB
 */
export async function createScenario(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;
    const { name, description, projectId, modifications } = req.body;

    const scenario = await SimulationService.saveScenario(workspaceId, userId, {
      name,
      description,
      projectId,
      modifications,
    });

    res.status(201).json({ status: 'success', data: scenario });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/simulations
 * List saved scenarios for workspace
 */
export async function listScenarios(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const scenarios = await SimulationService.listScenarios(workspaceId);
    res.status(200).json({ status: 'success', data: scenarios });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/simulations/:id
 */
export async function getScenarioById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const scenario = await SimulationService.getScenarioById(id);
    res.status(200).json({ status: 'success', data: scenario });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/simulations/:id
 */
export async function updateScenario(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const id = req.params.id as string;
    const { name, description, projectId, modifications } = req.body;

    const updated = await SimulationService.updateScenario(id, workspaceId, {
      name,
      description,
      projectId,
      modifications,
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/workspaces/:workspaceId/simulations/:id
 */
export async function deleteScenario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    await SimulationService.deleteScenario(id);
    res.status(200).json({ status: 'success', message: 'Scenario deleted successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/simulations/apply
 * Apply recommendation or scenario action to live database tasks
 */
export async function applyRecommendation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user!.id;
    const { actionPayload } = req.body;

    const result = await SimulationService.applyRecommendation(workspaceId, userId, actionPayload);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}
