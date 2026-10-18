/**
 * @file routes/notification.routes.ts
 *
 * Routes for User Notifications.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getUserNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.post('/read-all', markAllNotificationsAsRead);

export default router;
