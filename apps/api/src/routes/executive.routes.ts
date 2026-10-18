/**
 * @file routes/executive.routes.ts
 *
 * Express Router for Executive AI Command Center, Portfolio Dashboard, and Goals.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPortfolioDashboard,
  getGoals,
  createGoal,
  exportReport,
  actionRecommendation,
} from '../controllers/executive.controller.js';

const router = Router();

router.use('/executive', requireAuth);

router.get('/executive/portfolio', getPortfolioDashboard);
router.get('/executive/goals', getGoals);
router.post('/executive/goals', createGoal);
router.post('/executive/reports/export', exportReport);
router.post('/executive/recommendations/:id/action', actionRecommendation);

export default router;
