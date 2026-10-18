/**
 * @file routes/learning.routes.ts
 *
 * Express Router for AI Learning Engine endpoints.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProjectRetrospective,
  updateProjectRetrospective,
  createSprintRetrospective,
  estimateTask,
  getTeamPerformance,
  getProjectTemplates,
  instantiateTemplate,
  getBestPractices,
  getPreFlightRecommendations,
  getImprovementMetrics,
  searchOrganizationalKnowledge,
} from '../controllers/learning.controller.js';

const router = Router();

router.use('/workspaces', requireAuth);

router.get('/workspaces/:workspaceId/learning/retrospectives/project/:projectId', getProjectRetrospective);
router.put('/workspaces/:workspaceId/learning/retrospectives/project/:id', updateProjectRetrospective);
router.post('/workspaces/:workspaceId/learning/retrospectives/sprint', createSprintRetrospective);

router.post('/workspaces/:workspaceId/learning/estimate', estimateTask);
router.get('/workspaces/:workspaceId/learning/team-performance', getTeamPerformance);
router.get('/workspaces/:workspaceId/learning/templates', getProjectTemplates);
router.post('/workspaces/:workspaceId/learning/templates/instantiate', instantiateTemplate);
router.get('/workspaces/:workspaceId/learning/best-practices', getBestPractices);
router.post('/workspaces/:workspaceId/learning/pre-flight', getPreFlightRecommendations);
router.get('/workspaces/:workspaceId/learning/benchmarks', getImprovementMetrics);
router.post('/workspaces/:workspaceId/learning/library/search', searchOrganizationalKnowledge);

export default router;
