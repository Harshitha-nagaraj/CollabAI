/**
 * @file controllers/integration.controller.ts
 *
 * Controllers for Enterprise Integrations Hub status, verification, diagnostics,
 * and Google Calendar OAuth authorization and callback flow.
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { IntegrationService } from '../services/integration.service.js';
import { GoogleCalendarService } from '../services/google-calendar.service.js';
import { verifyOAuthState } from '../utils/crypto.js';

/**
 * Helper to verify workspace membership
 */
async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
  return !!membership;
}

export async function getIntegrationsStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { workspaceId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) as string | undefined;

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, wsId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const integrations = await IntegrationService.getWorkspaceIntegrations(wsId, userId);
    res.json(integrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve integrations status' });
  }
}

export async function verifyIntegration(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { providerId } = req.params;
    const rawWsId = req.body?.workspaceId || req.query?.workspaceId;
    const wsId = (Array.isArray(rawWsId) ? rawWsId[0] : rawWsId) as string | undefined;
    const pId = (Array.isArray(providerId) ? providerId[0] : providerId) as string | undefined;

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId is required in request body or query.' });
      return;
    }

    if (!pId) {
      res.status(400).json({ error: 'providerId URL parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, wsId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const result = await IntegrationService.verifyProvider(wsId, pId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to verify integration provider' });
  }
}

/**
 * Initiate Google Calendar OAuth 2.0 flow.
 * Note: External account setup is postponed, returning 503 paused status.
 */
export async function initiateGoogleAuth(req: Request, res: Response): Promise<void> {
  res.status(503).json({
    error: 'Google Calendar OAuth integration is currently postponed (Coming Soon) while external account setup is on hold.',
    code: 'INTEGRATION_POSTPONED',
  });
}

/**
 * Google OAuth 2.0 redirect callback handler.
 * Safely redirects to frontend with postponed status notice.
 */
export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const frontendBase = env.FRONTEND_URL || 'http://localhost:3000';
  const redirectUrl = new URL('/dashboard/meetings', frontendBase);
  redirectUrl.searchParams.set('integration', 'google-calendar');
  redirectUrl.searchParams.set('status', 'paused');
  redirectUrl.searchParams.set(
    'message',
    'Google Calendar OAuth integration is currently postponed while external account setup is on hold.'
  );
  res.redirect(redirectUrl.toString());
}

/**
 * Disconnect and revoke Google Calendar connection for workspace and user.
 */
export async function disconnectGoogleCalendar(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const rawWsId = req.body?.workspaceId || req.query.workspaceId;
    const wsId = (Array.isArray(rawWsId) ? rawWsId[0] : rawWsId) as string | undefined;

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId is required in request body or query.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, wsId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    try {
      const result = await GoogleCalendarService.disconnect(wsId, userId);
      res.json(result);
    } catch {
      res.json({
        success: true,
        message: 'Google Calendar integration is postponed. No active connection found.',
      });
    }
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.message || 'Failed to disconnect Google Calendar.',
    });
  }
}

