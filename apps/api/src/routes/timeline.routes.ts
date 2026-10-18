/**
 * @file routes/timeline.routes.ts
 *
 * Express Router for Project Timeline, Dependencies, and Delay Predictions.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProjectTimeline,
  addDependency,
  removeDependency,
  autoDetectDependencies,
  applyMitigation,
} from '../controllers/timeline.controller.js';

const router = Router();

router.use('/projects', requireAuth);

router.get('/projects/:projectId/timeline', getProjectTimeline);
router.post('/projects/dependencies', addDependency);
router.delete('/projects/dependencies/:id', removeDependency);
router.post('/projects/:projectId/auto-detect-dependencies', autoDetectDependencies);
router.post('/projects/:projectId/apply-mitigation', applyMitigation);

export default router;
