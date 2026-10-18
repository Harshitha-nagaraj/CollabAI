import { prisma } from '../lib/prisma.js';
import { ActivityAction, ActivityEntityType, Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

export interface RecordActivityInput {
  projectId: string;
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  details?: Record<string, any> | null;
}

export class ActivityService {
  /**
   * Records a project audit activity within an optional transaction.
   */
  public static async recordActivity(
    input: RecordActivityInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    return client.projectActivity.create({
      data: {
        projectId: input.projectId,
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        details: input.details ? (input.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  /**
   * Retrieves paginated activity records for a project, strictly verifying workspace authorization.
   */
  public static async listProjectActivities(
    userId: string,
    projectId: string,
    query: { cursor?: string | undefined; limit: number }
  ) {
    // 1. Verify project exists and get workspace ID
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true, name: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // 2. Verify requesting user is an authorized member of the project's workspace
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: project.workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this workspace activity feed');
    }

    const limit = query.limit || 20;

    // 3. Fetch activities ordered newest first
    const activities = await prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    let hasMore = false;

    if (activities.length > limit) {
      hasMore = true;
      const nextItem = activities.pop(); // Remove extra item
      nextCursor = activities[activities.length - 1]?.id || null;
    }

    const totalCount = await prisma.projectActivity.count({
      where: { projectId },
    });

    return {
      activities,
      nextCursor,
      hasMore,
      totalCount,
    };
  }
}
