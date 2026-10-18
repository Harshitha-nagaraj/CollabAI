import { Router } from 'express';
import { SprintService } from '../services/sprint.service';
import { SprintPlannerService } from '../services/sprint-planner.service';

const router = Router();

// POST /api/v1/sprints - Create sprint
router.post('/', async (req, res, next) => {
  try {
    const sprint = await SprintService.createSprint(req.body);
    res.status(201).json({ success: true, data: { sprint } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints - List sprints for workspace
router.get('/', async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    const projectId = req.query.projectId as string | undefined;

    if (!workspaceId) {
      res.status(400).json({ success: false, error: { message: 'workspaceId parameter is required' } });
      return;
    }

    const sprints = await SprintService.getSprints(workspaceId, projectId);
    res.json({ success: true, data: { sprints } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/sprints/ai-plan - AI Backlog & Goal Planner
router.post('/ai-plan', async (req, res, next) => {
  try {
    const plan = await SprintPlannerService.suggestAISprintPlan(req.body);
    res.json({ success: true, data: { plan } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints/:id - Get sprint details
router.get('/:id', async (req, res, next) => {
  try {
    const sprint = await SprintService.getSprintById(req.params.id);
    res.json({ success: true, data: { sprint } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/sprints/:id - Edit / Start / Complete / Archive sprint
router.patch('/:id', async (req, res, next) => {
  try {
    const sprint = await SprintService.updateSprint(req.params.id, req.body);
    res.json({ success: true, data: { sprint } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints/:id/capacity - Capacity Planning Engine
router.get('/:id/capacity', async (req, res, next) => {
  try {
    const capacity = await SprintService.getCapacityPlan(req.params.id);
    res.json({ success: true, data: { capacity } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints/:id/dependencies - Dependency Management Engine
router.get('/:id/dependencies', async (req, res, next) => {
  try {
    const dependencies = await SprintService.getDependencyAnalysis(req.params.id);
    res.json({ success: true, data: { dependencies } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints/:id/burndown - Burndown & Velocity Analytics Engine
router.get('/:id/burndown', async (req, res, next) => {
  try {
    const burndown = await SprintService.getBurndownAndVelocity(req.params.id);
    res.json({ success: true, data: { burndown } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints/:id/health - Sprint Health Score Engine
router.get('/:id/health', async (req, res, next) => {
  try {
    const health = await SprintService.getSprintHealth(req.params.id);
    res.json({ success: true, data: { health } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sprints/:id/recommendations - AI Scope Recommendation Engine
router.get('/:id/recommendations', async (req, res, next) => {
  try {
    const recommendations = await SprintPlannerService.getAIRecommendations(req.params.id);
    res.json({ success: true, data: { recommendations } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/sprints/:id/recommendations/apply - Apply AI Scope Recommendation
router.post('/:id/recommendations/apply', async (req, res, next) => {
  try {
    const { recommendationId, actionPayload } = req.body;
    const result = await SprintPlannerService.applyRecommendation(req.params.id, recommendationId, actionPayload);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
