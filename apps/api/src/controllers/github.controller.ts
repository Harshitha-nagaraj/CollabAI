/**
 * @file controllers/github.controller.ts
 *
 * Controllers for GitHub Integration, PR Intelligence, Release Notes, and Webhooks.
 */

import { Request, Response } from 'express';
import { GitHubService } from '../services/github.service.js';
import { GitHubWebhookService } from '../services/github-webhook.service.js';

export async function getRepositories(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const repos = await GitHubService.getRepositories(wsId as string);
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch repositories' });
  }
}

export async function connectRepository(req: Request, res: Response): Promise<void> {
  try {
    const { name, owner, fullName, url, isPrivate, workspaceId, projectId } = req.body;

    if (!name || !owner || !fullName || !url || !workspaceId) {
      res.status(400).json({ error: 'name, owner, fullName, url, and workspaceId are required.' });
      return;
    }

    const repo = await GitHubService.connectRepository({
      name,
      owner,
      fullName,
      url,
      isPrivate,
      workspaceId,
      projectId,
    });

    res.status(201).json(repo);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to connect repository' });
  }
}

export async function getPullRequests(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const prs = await GitHubService.getPullRequests(wsId as string);
    res.json(prs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pull requests' });
  }
}

export async function summarizePullRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const prId = (Array.isArray(id) ? id[0] : id) || '';

    const summarized = await GitHubService.summarizePullRequest(prId);
    res.json(summarized);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to summarize pull request' });
  }
}

export async function generateReleaseNotes(req: Request, res: Response): Promise<void> {
  try {
    const { version, workspaceId, projectId } = req.body;

    if (!version || !workspaceId) {
      res.status(400).json({ error: 'version and workspaceId are required.' });
      return;
    }

    const releaseNote = await GitHubService.generateReleaseNotes({
      version,
      workspaceId,
      projectId,
    });

    res.status(201).json(releaseNote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate release notes' });
  }
}

export async function getReleaseNotes(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const notes = await GitHubService.getReleaseNotes(wsId as string);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch release notes' });
  }
}

export async function getEngineeringAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;
    const wsId = (Array.isArray(workspaceId) ? workspaceId[0] : workspaceId) || '';

    if (!wsId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const analytics = await GitHubService.getEngineeringAnalytics(wsId as string);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch engineering analytics' });
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const result = await GitHubWebhookService.handleWebhook(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process webhook' });
  }
}
