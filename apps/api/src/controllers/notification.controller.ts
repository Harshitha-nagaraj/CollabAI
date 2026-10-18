/**
 * @file controllers/notification.controller.ts
 *
 * Controllers for Notification Management.
 */

import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { BadRequestError } from '../utils/errors.js';

export async function getUserNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { workspaceId } = req.query;

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId query parameter is required.');
    }

    // Verify requesting user is an active member of this workspace
    await NotificationService.verifyMembership(userId, workspaceId);

    const notifications = await NotificationService.getUserNotifications(userId, workspaceId);
    const unreadCount = await NotificationService.getUnreadCount(userId, workspaceId);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const notificationId = (Array.isArray(id) ? id[0] : id) || '';

    if (!notificationId) {
      throw new BadRequestError('Notification ID is required.');
    }

    await NotificationService.markAsRead(notificationId, userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { workspaceId } = req.body;

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required.');
    }

    // Verify requesting user is an active member of this workspace
    await NotificationService.verifyMembership(userId, workspaceId);

    await NotificationService.markAllAsRead(userId, workspaceId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
}
