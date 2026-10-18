import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { TaskController } from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { CreateWorkspaceSchema, InviteMemberSchema } from '../validators/workspace.validator.js';

const router = Router();

// Apply authentication to all workspace routes
router.use(requireAuth);

// Base endpoints
router.post('/', validateBody(CreateWorkspaceSchema), WorkspaceController.create);
router.get('/', WorkspaceController.list);

// Workspace detail endpoints
router.get('/:workspaceId', WorkspaceController.getDetails);
router.get('/:workspaceId/kanban', TaskController.getKanban);

// Member management endpoints
router.post('/:workspaceId/members', validateBody(InviteMemberSchema), WorkspaceController.invite);
router.delete('/:workspaceId/members/:userId', WorkspaceController.remove);

export default router;
