import { prisma } from '../lib/prisma.js';
import { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from '../validators/task.validator.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { Role, Task, TaskStatus, ActivityAction, ActivityEntityType } from '@prisma/client';
import { ActivityService } from './activity.service.js';
import { NotificationService } from './notification.service.js';

export class TaskService {
  /**
   * Helper to verify user membership in a workspace.
   */
  private static async verifyMembership(userId: string, workspaceId: string): Promise<any> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    return membership;
  }

  /**
   * Creates a task under a specific project.
   */
  public static async createTask(creatorId: string, input: CreateTaskInput): Promise<Task> {
    // 1. Resolve project and workspace
    let project = input.projectId
      ? await prisma.project.findUnique({ where: { id: input.projectId } })
      : null;

    if (!project && (input as any).workspaceId) {
      // Fallback: Find first existing project or auto-create default project
      project = await prisma.project.findFirst({
        where: { workspaceId: (input as any).workspaceId },
      });

      if (!project) {
        project = await prisma.project.create({
          data: {
            name: 'General Project',
            description: 'Default project workspace for tasks and deliverables',
            workspaceId: (input as any).workspaceId,
            creatorId,
          },
        });
      }
    }

    if (!project) {
      throw new BadRequestError('Valid project or workspaceId required to create task');
    }

    const workspaceId = project.workspaceId;
    input.projectId = project.id;

    // 2. Verify creator belongs to workspace
    await this.verifyMembership(creatorId, workspaceId);

    // 3. If assignee provided, verify assignee belongs to workspace
    if (input.assigneeId) {
      const assigneeMembership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: input.assigneeId,
            workspaceId,
          },
        },
      });

      if (!assigneeMembership) {
        throw new BadRequestError('Assignee must be a member of this workspace');
      }
    }

    // 4. Create task
    // 4. Create task and record audit activity in transaction
    return prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          dueDate: input.dueDate ?? null,
          priority: input.priority,
          status: input.status,
          projectId: input.projectId,
          workspaceId,
          creatorId,
          assigneeId: input.assigneeId ?? null,
        },
      });

      await ActivityService.recordActivity(
        {
          projectId: created.projectId,
          workspaceId,
          actorId: creatorId,
          action: ActivityAction.TASK_CREATED,
          entityType: ActivityEntityType.TASK,
          entityId: created.id,
          entityTitle: created.title,
          details: {
            title: created.title,
            status: created.status,
            priority: created.priority,
            assigneeId: created.assigneeId,
            dueDate: created.dueDate ? created.dueDate.toISOString() : null,
          },
        },
        tx
      );

      // Notify new assignee if task was assigned to someone other than the creator
      if (created.assigneeId && created.assigneeId !== creatorId) {
        await NotificationService.createNotification(
          {
            userId: created.assigneeId,
            workspaceId,
            title: 'Task Assigned',
            message: `You were assigned to task "${created.title}" in ${project.name}`,
            type: 'TASK_ASSIGNED',
            link: `/dashboard/projects/${created.projectId}`,
          },
          tx
        );
      }

      return created;
    });
  }

  /**
   * Updates an existing task.
   */
  public static async updateTask(taskId: string, userId: string, input: UpdateTaskInput): Promise<Task> {
    // 1. Fetch task and project
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const workspaceId = task.project.workspaceId;

    // 2. Verify updater belongs to workspace
    await this.verifyMembership(userId, workspaceId);

    // 3. Verify assignee if updating assigneeId
    let newAssigneeUser: { id: string; name: string | null; email: string } | null = null;
    if (input.assigneeId) {
      const assigneeMembership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: input.assigneeId,
            workspaceId,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!assigneeMembership) {
        throw new BadRequestError('Assignee must be a member of this workspace');
      }

      newAssigneeUser = assigneeMembership.user;
    }

    // Determine state changes before executing update
    const isStatusChanged = input.status !== undefined && input.status !== task.status;
    const isCompleted = input.status === TaskStatus.DONE && task.status !== TaskStatus.DONE;
    const isAssigneeChanged = input.assigneeId !== undefined && input.assigneeId !== task.assigneeId;

    const prevDueDateIso = task.dueDate ? task.dueDate.toISOString() : null;
    const newDueDateIso = input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate).toISOString() : null) : undefined;
    const isDueDateChanged = newDueDateIso !== undefined && prevDueDateIso !== newDueDateIso;

    const isContentChanged =
      (input.title !== undefined && input.title !== task.title) ||
      (input.description !== undefined && input.description !== task.description) ||
      (input.priority !== undefined && input.priority !== task.priority);

    // 4. Update task details and log corresponding audit events in transaction
    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
        },
      });

      // Audit status changes
      if (isStatusChanged) {
        if (isCompleted) {
          await ActivityService.recordActivity(
            {
              projectId: task.projectId,
              workspaceId,
              actorId: userId,
              action: ActivityAction.TASK_COMPLETED,
              entityType: ActivityEntityType.TASK,
              entityId: updated.id,
              entityTitle: updated.title,
              details: {
                previousStatus: task.status,
                newStatus: updated.status,
              },
            },
            tx
          );
        } else {
          await ActivityService.recordActivity(
            {
              projectId: task.projectId,
              workspaceId,
              actorId: userId,
              action: ActivityAction.TASK_STATUS_CHANGED,
              entityType: ActivityEntityType.TASK,
              entityId: updated.id,
              entityTitle: updated.title,
              details: {
                previousStatus: task.status,
                newStatus: updated.status,
              },
            },
            tx
          );
        }
      }

      // Audit assignee changes
      if (isAssigneeChanged) {
        let assigneeAction: ActivityAction;
        if (!task.assigneeId && input.assigneeId) {
          assigneeAction = ActivityAction.TASK_ASSIGNED;
        } else if (task.assigneeId && input.assigneeId) {
          assigneeAction = ActivityAction.TASK_REASSIGNED;
        } else {
          assigneeAction = ActivityAction.TASK_UNASSIGNED;
        }

        await ActivityService.recordActivity(
          {
            projectId: task.projectId,
            workspaceId,
            actorId: userId,
            action: assigneeAction,
            entityType: ActivityEntityType.TASK,
            entityId: updated.id,
            entityTitle: updated.title,
            details: {
              previousAssignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, email: task.assignee.email } : null,
              newAssignee: newAssigneeUser,
            },
          },
          tx
        );

        // Notify new assignee on assignment or reassignment (only if recipient is not the actor)
        if (input.assigneeId && input.assigneeId !== userId) {
          const isMember = await tx.membership.findUnique({
            where: {
              userId_workspaceId: {
                userId: input.assigneeId,
                workspaceId,
              },
            },
          });

          if (isMember) {
            await NotificationService.createNotification(
              {
                userId: input.assigneeId,
                workspaceId,
                title: 'Task Assigned',
                message: `You were assigned to task "${updated.title}" in ${task.project.name}`,
                type: 'TASK_ASSIGNED',
                link: `/dashboard/projects/${task.projectId}`,
              },
              tx
            );
          }
        }
      }

      // Notify relevant workspace members on status changes (creator and/or current assignee, excluding actor)
      if (isStatusChanged) {
        const recipientsToNotify = new Set<string>();

        if (task.creatorId && task.creatorId !== userId) {
          recipientsToNotify.add(task.creatorId);
        }

        const currentAssignee = input.assigneeId !== undefined ? input.assigneeId : task.assigneeId;
        if (currentAssignee && currentAssignee !== userId) {
          recipientsToNotify.add(currentAssignee);
        }

        for (const recipientId of recipientsToNotify) {
          const isMember = await tx.membership.findUnique({
            where: {
              userId_workspaceId: {
                userId: recipientId,
                workspaceId,
              },
            },
          });

          if (isMember) {
            await NotificationService.createNotification(
              {
                userId: recipientId,
                workspaceId,
                title: isCompleted ? 'Task Completed' : 'Task Status Updated',
                message: isCompleted
                  ? `Task "${updated.title}" was marked as completed in ${task.project.name}`
                  : `Task "${updated.title}" moved to ${updated.status} in ${task.project.name}`,
                type: 'TASK_STATUS_CHANGED',
                link: `/dashboard/projects/${task.projectId}`,
              },
              tx
            );
          }
        }
      }

      // Audit due date changes
      if (isDueDateChanged) {
        await ActivityService.recordActivity(
          {
            projectId: task.projectId,
            workspaceId,
            actorId: userId,
            action: ActivityAction.TASK_DUE_DATE_CHANGED,
            entityType: ActivityEntityType.TASK,
            entityId: updated.id,
            entityTitle: updated.title,
            details: {
              previousDueDate: prevDueDateIso,
              newDueDate: newDueDateIso,
            },
          },
          tx
        );
      }

      // Audit general content edits
      if (isContentChanged && !isStatusChanged && !isAssigneeChanged && !isDueDateChanged) {
        await ActivityService.recordActivity(
          {
            projectId: task.projectId,
            workspaceId,
            actorId: userId,
            action: ActivityAction.TASK_UPDATED,
            entityType: ActivityEntityType.TASK,
            entityId: updated.id,
            entityTitle: updated.title,
            details: {
              title: updated.title,
              priority: updated.priority,
            },
          },
          tx
        );
      }

      return updated;
    });
  }

  /**
   * Deletes a task. Only task creator or workspace owner can delete.
   */
  public static async deleteTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const workspaceId = task.project.workspaceId;

    // Fetch requester's membership details to check role
    const membership = await this.verifyMembership(userId, workspaceId);

    const isCreator = task.creatorId === userId;
    const isOwner = membership.role === Role.OWNER;

    if (!isCreator && !isOwner) {
      throw new ForbiddenError('Only the task creator or workspace owner can delete this task');
    }

    return prisma.$transaction(async (tx) => {
      // Record task deletion activity before record is removed
      await ActivityService.recordActivity(
        {
          projectId: task.projectId,
          workspaceId,
          actorId: userId,
          action: ActivityAction.TASK_DELETED,
          entityType: ActivityEntityType.TASK,
          entityId: task.id,
          entityTitle: task.title,
          details: {
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
        },
        tx
      );

      return tx.task.delete({
        where: { id: taskId },
      });
    });
  }

  /**
   * Retrieves task details along with creator, assignee, and project information.
   */
  public static async getTaskDetails(taskId: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const workspaceId = task.project.workspaceId;
    await this.verifyMembership(userId, workspaceId);

    return task;
  }

  /**
   * Lists tasks with dynamic filtering and sorting.
   */
  public static async listTasks(userId: string, filters: ListTasksQuery): Promise<Task[]> {
    // 1. Fetch user's workspaces to restrict results
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    const userWorkspaceIds = memberships.map((m) => m.workspaceId);

    if (filters.workspaceId && !userWorkspaceIds.includes(filters.workspaceId)) {
      throw new ForbiddenError('You do not have access to the requested workspace');
    }

    // Determine target workspaces to query
    const targetWorkspaceIds = filters.workspaceId ? [filters.workspaceId] : userWorkspaceIds;

    // 2. Build where filter
    const isUnassigned = filters.unassigned === true || filters.assigneeId === 'UNASSIGNED';

    const where: any = {
      project: {
        workspaceId: { in: targetWorkspaceIds },
        ...(filters.projectId && { id: filters.projectId }),
      },
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(isUnassigned
        ? { assigneeId: null }
        : filters.assigneeId
        ? { assigneeId: filters.assigneeId }
        : {}),
    };

    // 3. Retrieve tasks
    return prisma.task.findMany({
      where,
      orderBy: {
        [filters.sortBy]: filters.sortOrder,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Group tasks of a workspace into Todo, In Progress, and Done Kanban columns.
   */
  public static async getKanbanBoard(workspaceId: string, userId: string) {
    // Verify membership
    await this.verifyMembership(userId, workspaceId);

    // Retrieve tasks
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          workspaceId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Grouping mapping
    const board = {
      Todo: [] as any[],
      InProgress: [] as any[],
      Done: [] as any[],
    };

    for (const task of tasks) {
      if (task.status === TaskStatus.TODO || task.status === TaskStatus.BACKLOG) {
        board.Todo.push(task);
      } else if (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.IN_REVIEW) {
        board.InProgress.push(task);
      } else if (task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED) {
        board.Done.push(task);
      }
    }

    return board;
  }

  /**
   * List all comments for a task, ordered oldest first.
   * Authorized only for members of the task's workspace.
   */
  public static async listComments(userId: string, taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const workspaceId = task.project?.workspaceId || task.workspaceId;
    if (!workspaceId) {
      throw new NotFoundError('Task workspace not found');
    }

    await this.verifyMembership(userId, workspaceId);

    return prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Create a comment on a task with support for @mentions.
   * Authorized only for members of the task's workspace.
   * Resolves mentioned members server-side and creates notifications atomically.
   */
  public static async createComment(userId: string, taskId: string, content: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true, workspaceId: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const workspaceId = task.project?.workspaceId || task.workspaceId;
    if (!workspaceId) {
      throw new NotFoundError('Task workspace not found');
    }

    await this.verifyMembership(userId, workspaceId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestError('Comment cannot be empty');
    }
    if (trimmed.length > 5000) {
      throw new BadRequestError('Comment cannot exceed 5000 characters');
    }

    // Extract mentioned user IDs from content
    // Supports primary token format @[Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;
    const mentionedIds = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(trimmed)) !== null) {
      const targetUserId = match[2];
      if (targetUserId && targetUserId !== userId) {
        mentionedIds.add(targetUserId);
      }
    }

    // Also support fallback format @{userId} or @[userId]
    const uuidMentionRegex = /@\{([a-f0-9-]{36})\}|@\[([a-f0-9-]{36})\]/g;
    while ((match = uuidMentionRegex.exec(trimmed)) !== null) {
      const targetUserId = match[1] || match[2];
      if (targetUserId && targetUserId !== userId) {
        mentionedIds.add(targetUserId);
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create the comment record
      const comment = await tx.taskComment.create({
        data: {
          taskId,
          authorId: userId,
          content: trimmed,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      // 2. Resolve author display name
      const authorName = comment.author.name || comment.author.email || 'A team member';
      const projectName = task.project?.name || 'Project';

      // 3. For each mentioned user, verify workspace membership and create notification
      for (const targetUserId of mentionedIds) {
        const isMember = await tx.membership.findUnique({
          where: {
            userId_workspaceId: {
              userId: targetUserId,
              workspaceId,
            },
          },
        });

        // Only notify if the mentioned user is an active member of this workspace
        if (isMember) {
          await NotificationService.createNotification(
            {
              userId: targetUserId,
              workspaceId,
              title: 'You were mentioned in a task comment',
              message: `${authorName} mentioned you on task "${task.title}" in ${projectName}`,
              type: 'TASK_MENTION',
              link: `/dashboard/projects/${task.projectId}`,
            },
            tx
          );
        }
      }

      return comment;
    });
  }
}
