/**
 * @file routes/integration.routes.ts
 *
 * Routes for Enterprise Integrations Hub status, verification, diagnostics,
 * and Google Calendar OAuth authorization, callback, and disconnect.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getIntegrationsStatus,
  verifyIntegration,
  initiateGoogleAuth,
  handleGoogleCallback,
  disconnectGoogleCalendar,
} from '../controllers/integration.controller.js';

const router = Router();

// Public OAuth redirect callback endpoint (called by Google OAuth consent flow)
router.get('/google/callback', handleGoogleCallback);

// Protected routes requiring CollabAI user authentication
router.use(requireAuth);

router.get('/', getIntegrationsStatus);
router.post('/:providerId/verify', verifyIntegration);
router.get('/google/auth', initiateGoogleAuth);
router.post('/google-calendar/disconnect', disconnectGoogleCalendar);

export default router;
