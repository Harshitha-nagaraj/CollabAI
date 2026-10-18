import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { CreateTaskSchema, UpdateTaskSchema, CreateTaskCommentSchema } from '../validators/task.validator.js';

const router = Router();

// Apply authentication to all task endpoints
router.use(requireAuth);

router.post('/', validateBody(CreateTaskSchema), TaskController.create);
router.get('/', TaskController.list);

router.get('/:taskId', TaskController.getDetails);
router.patch('/:taskId', validateBody(UpdateTaskSchema), TaskController.update);
router.delete('/:taskId', TaskController.delete);

// Task comments endpoints
router.get('/:taskId/comments', TaskController.listComments);
router.post('/:taskId/comments', validateBody(CreateTaskCommentSchema), TaskController.createComment);

export default router;
