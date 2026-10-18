/**
 * @file services/notification.service.ts
 *
 * Managing system & AI-generated notifications for CollabAI workspace members.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError } from '../utils/errors.js';

export class NotificationService {
  /**
   * Verify that a user is an authorized member of a workspace.
   */
  static async verifyMembership(userId: string, workspaceId: string) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    return membership;
  }

  /**
   * Dispatch a notification to a single user.
   * Supports transactional clients so notifications only persist on successful operations.
   */
  static async createNotification(
    payload: {
      userId: string;
      workspaceId: string;
      title: string;
      message: string;
      type?: string;
      link?: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    return client.notification.create({
      data: {
        userId: payload.userId,
        workspaceId: payload.workspaceId,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'INFO',
        link: payload.link || null,
      },
    });
  }

  /**
   * Get notifications for a user in a workspace (newest first, capped at 50).
   */
  static async getUserNotifications(userId: string, workspaceId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  /**
   * Count unread notifications for a user in a workspace.
   */
  static async getUnreadCount(userId: string, workspaceId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        workspaceId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read.
   */
  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Mark all unread notifications in a workspace as read for a user.
   */
  static async markAllAsRead(userId: string, workspaceId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        workspaceId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
