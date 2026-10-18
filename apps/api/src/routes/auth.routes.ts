import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { RegisterSchema, LoginSchema } from '../validators/auth.validator.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', validateBody(RegisterSchema), AuthController.register);
router.post('/login', validateBody(LoginSchema), AuthController.login);

// Protected routes
router.get('/me', requireAuth, AuthController.getMe);

export default router;
