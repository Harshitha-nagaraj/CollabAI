import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { CreateProjectSchema, UpdateProjectSchema } from '../validators/project.validator.js';

const router = Router();

// Apply authentication to all project routes
router.use(requireAuth);

router.get('/', ProjectController.list);
router.post('/', validateBody(CreateProjectSchema), ProjectController.create);
router.get('/:id', ProjectController.getDetails);
router.get('/:id/activity', ProjectController.listActivity);
router.patch('/:id', validateBody(UpdateProjectSchema), ProjectController.update);
router.delete('/:id', ProjectController.delete);

export default router;
