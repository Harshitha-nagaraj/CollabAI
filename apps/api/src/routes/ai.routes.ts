/**
 * @file routes/ai.routes.ts
 *
 * Mounts all AI endpoints under /api/v1/ai/*.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  summarizeMeeting,
  generateTasks,
  generateSprintPlan,
  getWorkloadAnalysis,
  applyWorkloadReassignment,
  getProjectHealth,
  getDailyStandup,
  generateWeeklyReport,
  executeCommand,
  confirmCommand,
  aiSearch,
} from '../controllers/ai.controller.js';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

// Meeting analysis
router.post('/meetings/summarize', summarizeMeeting);

// Task generation
router.post('/tasks/generate', generateTasks);

// Sprint planning
router.post('/sprint/plan', generateSprintPlan);

// Workload analysis
router.get('/workload/:workspaceId', getWorkloadAnalysis);
router.post('/workload/apply', applyWorkloadReassignment);

// Project health
router.get('/health/:workspaceId', getProjectHealth);

// Daily standup
router.get('/standup/:workspaceId', getDailyStandup);

// Weekly report
router.post('/report/weekly', generateWeeklyReport);

// Natural language commands
router.post('/command', executeCommand);
router.post('/command/confirm', confirmCommand);

// AI search
router.post('/search', aiSearch);

export default router;
