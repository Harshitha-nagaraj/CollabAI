import { Router } from 'express';
import { ReleaseService } from '../services/release.service';

const router = Router();

// POST /api/v1/releases - Create release plan
router.post('/', async (req, res, next) => {
  try {
    const release = await ReleaseService.createRelease(req.body);
    res.status(201).json({ success: true, data: { release } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/releases - List releases for workspace
router.get('/', async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    const projectId = req.query.projectId as string | undefined;

    if (!workspaceId) {
      res.status(400).json({ success: false, error: { message: 'workspaceId parameter is required' } });
      return;
    }

    const releases = await ReleaseService.getReleases(workspaceId, projectId);
    res.json({ success: true, data: { releases } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/releases/dashboard - Release Dashboard Aggregator
router.get('/dashboard', async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    const releaseId = req.query.releaseId as string | undefined;

    if (!workspaceId) {
      res.status(400).json({ success: false, error: { message: 'workspaceId parameter is required' } });
      return;
    }

    const dashboard = await ReleaseService.getReleaseDashboard(workspaceId, releaseId);
    res.json({ success: true, data: { dashboard } });
  } catch (err) {
    next(err);
  }
});

export default router;
