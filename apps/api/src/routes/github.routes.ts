/**
 * @file routes/github.routes.ts
 *
 * Express Router for GitHub Integration, PR Summaries, Release Notes, and Webhooks.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getRepositories,
  connectRepository,
  getPullRequests,
  summarizePullRequest,
  generateReleaseNotes,
  getReleaseNotes,
  getEngineeringAnalytics,
  handleWebhook,
} from '../controllers/github.controller.js';

const router = Router();

// GitHub Webhook endpoint does not require user auth token
router.post('/github/webhooks', handleWebhook);

// Protected routes requiring user auth
router.use('/github', requireAuth);

router.get('/github/repositories', getRepositories);
router.post('/github/repositories', connectRepository);
router.get('/github/pull-requests', getPullRequests);
router.post('/github/pull-requests/:id/summarize', summarizePullRequest);
router.post('/github/release-notes/generate', generateReleaseNotes);
router.get('/github/release-notes', getReleaseNotes);
router.get('/github/analytics', getEngineeringAnalytics);

export default router;
