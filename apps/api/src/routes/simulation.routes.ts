/**
 * @file routes/simulation.routes.ts
 *
 * Express Router for AI Project Simulator endpoints.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  runSimulation,
  parseNLPrompt,
  compareScenarios,
  createScenario,
  listScenarios,
  getScenarioById,
  updateScenario,
  deleteScenario,
  applyRecommendation,
} from '../controllers/simulation.controller.js';

const router = Router();

router.use('/workspaces', requireAuth);

router.post('/workspaces/:workspaceId/simulations/run', runSimulation);
router.post('/workspaces/:workspaceId/simulations/parse-nl', parseNLPrompt);
router.post('/workspaces/:workspaceId/simulations/compare', compareScenarios);
router.post('/workspaces/:workspaceId/simulations/apply', applyRecommendation);

router.get('/workspaces/:workspaceId/simulations', listScenarios);
router.post('/workspaces/:workspaceId/simulations', createScenario);
router.get('/workspaces/:workspaceId/simulations/:id', getScenarioById);
router.put('/workspaces/:workspaceId/simulations/:id', updateScenario);
router.delete('/workspaces/:workspaceId/simulations/:id', deleteScenario);

export default router;
