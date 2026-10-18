import { prisma } from '../lib/prisma.js';
import { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from '../validators/project.validator.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { Role, TaskStatus, ProjectStatus, ActivityAction, ActivityEntityType } from '@prisma/client';
import { ActivityService } from './activity.service.js';

export class ProjectService {
  /**
   * Helper to verify user membership and optional role in a workspace.
   */
  private static async verifyMembership(
    userId: string,
    workspaceId: string,
    allowedRoles?: Role[]
  ): Promise<any> {
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

    if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenError('Insufficient workspace permissions for this operation');
    }

    return membership;
  }

  /**
   * Helper to generate a project key prefix from title if missing.
   */
  private static generateKey(name: string, customKey?: string | null): string {
    if (customKey && customKey.trim().length >= 2) {
      return customKey.trim().toUpperCase();
    }
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length >= 3) return clean.substring(0, 3);
    return (clean + 'PRJ').substring(0, 3);
  }

  /**
   * Lists all projects in a workspace with computed progress and task metrics.
   */
  public static async listProjects(userId: string, query: ListProjectsQuery) {
    // 1. Verify user belongs to the target workspace
    await this.verifyMembership(userId, query.workspaceId);

    // 2. Query workspace projects from database
    const rawProjects = await prisma.project.findMany({
      where: { workspaceId: query.workspaceId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            assigneeId: true,
            dueDate: true,
            priority: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            sprints: true,
            releases: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    // 3. Compute real task metrics for each project
    const projects = rawProjects.map((p) => {
      const totalTasks = p.tasks.length;
      const doneTasks = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const openIssues = p.tasks.filter(
        (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED
      ).length;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      // Calculate target delivery date from tasks if present
      const dueDates = p.tasks
        .map((t) => t.dueDate)
        .filter((d): d is Date => d !== null);
      const targetDueDate =
        dueDates.length > 0
          ? new Date(Math.max(...dueDates.map((d) => new Date(d).getTime())))
          : null;

      const hasOverdueTasks = p.tasks.some(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== TaskStatus.DONE &&
          t.status !== TaskStatus.CANCELLED
      );

      const isOverdue =
        p.status !== ProjectStatus.COMPLETED &&
        p.status !== ProjectStatus.CANCELLED &&
        (hasOverdueTasks || (targetDueDate !== null && targetDueDate < now));

      // Count distinct team members assigned or involved
      const memberIdSet = new Set<string>();
      if (p.creatorId) memberIdSet.add(p.creatorId);
      p.tasks.forEach((t) => {
        if (t.assigneeId) memberIdSet.add(t.assigneeId);
      });

      return {
        id: p.id,
        name: p.name,
        key: this.generateKey(p.name),
        description: p.description || '',
        workspaceId: p.workspaceId,
        creatorId: p.creatorId,
        creator: p.creator,
        status: p.status,
        progress,
        teamMembers: Math.max(memberIdSet.size, 1),
        sprintsCount: p._count.sprints,
        openIssues,
        totalTasks,
        doneTasks,
        targetDueDate: targetDueDate ? targetDueDate.toISOString() : null,
        isOverdue,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // 4. Apply optional search and status filtering
    return projects.filter((p) => {
      const matchesSearch =
        !query.search ||
        p.name.toLowerCase().includes(query.search.toLowerCase()) ||
        p.key.toLowerCase().includes(query.search.toLowerCase());
      const matchesStatus =
        !query.status ||
        query.status === 'ALL' ||
        (query.status === 'ACTIVE'
          ? p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.PLANNING
          : p.status === query.status);
      return matchesSearch && matchesStatus;
    });
  }

  /**
   * Creates a new project in a workspace.
   */
  public static async createProject(creatorId: string, input: CreateProjectInput) {
    // 1. Verify creator is an OWNER or ADMIN in the workspace
    await this.verifyMembership(creatorId, input.workspaceId, [Role.OWNER, Role.ADMIN]);

    const initialStatus = (input.status as ProjectStatus) || ProjectStatus.PLANNING;

    // 2. Create project in database and record audit event in transaction
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          status: initialStatus,
          workspaceId: input.workspaceId,
          creatorId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      await ActivityService.recordActivity(
        {
          projectId: created.id,
          workspaceId: created.workspaceId,
          actorId: creatorId,
          action: ActivityAction.PROJECT_CREATED,
          entityType: ActivityEntityType.PROJECT,
          entityId: created.id,
          entityTitle: created.name,
          details: {
            name: created.name,
            status: created.status,
          },
        },
        tx
      );

      return created;
    });

    return {
      id: project.id,
      name: project.name,
      key: this.generateKey(project.name, input.key),
      description: project.description || '',
      workspaceId: project.workspaceId,
      creatorId: project.creatorId,
      creator: project.creator,
      status: project.status,
      progress: 0,
      teamMembers: 1,
      sprintsCount: 0,
      openIssues: 0,
      totalTasks: 0,
      doneTasks: 0,
      targetDueDate: null,
      isOverdue: false,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Retrieves full project details with task, sprint, and release relations.
   */
  public static async getProjectDetails(userId: string, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
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
          },
          orderBy: { createdAt: 'desc' },
        },
        sprints: {
          orderBy: { createdAt: 'desc' },
        },
        releases: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Verify requesting user is a workspace member
    await this.verifyMembership(userId, project.workspaceId);

    const totalTasks = project.tasks.length;
    const doneTasks = project.tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const openIssues = project.tasks.filter(
      (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED
    ).length;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const dueDates = project.tasks
      .map((t) => t.dueDate)
      .filter((d): d is Date => d !== null);
    const targetDueDate =
      dueDates.length > 0
        ? new Date(Math.max(...dueDates.map((d) => new Date(d).getTime())))
        : null;

    const now = new Date();
    const hasOverdueTasks = project.tasks.some(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED
    );

    const isOverdue =
      project.status !== ProjectStatus.COMPLETED &&
      project.status !== ProjectStatus.CANCELLED &&
      (hasOverdueTasks || (targetDueDate !== null && targetDueDate < now));

    return {
      project: {
        id: project.id,
        name: project.name,
        key: this.generateKey(project.name),
        description: project.description || '',
        workspaceId: project.workspaceId,
        workspaceName: project.workspace.name,
        creatorId: project.creatorId,
        creator: project.creator,
        status: project.status,
        progress,
        totalTasks,
        doneTasks,
        openIssues,
        targetDueDate: targetDueDate ? targetDueDate.toISOString() : null,
        isOverdue,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      tasks: project.tasks,
      sprints: project.sprints,
      releases: project.releases,
    };
  }

  /**
   * Updates an existing project.
   */
  public static async updateProject(userId: string, projectId: string, input: UpdateProjectInput) {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      throw new NotFoundError('Project not found');
    }

    // Verify user is an OWNER or ADMIN or project creator
    const membership = await this.verifyMembership(userId, existing.workspaceId);
    if (membership.role !== Role.OWNER && membership.role !== Role.ADMIN && existing.creatorId !== userId) {
      throw new ForbiddenError('Insufficient permissions to update this project');
    }

    const isStatusChanged = input.status && input.status !== existing.status;
    const isNameChanged = input.name && input.name !== existing.name;
    const isDescChanged = input.description !== undefined && input.description !== existing.description;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.status ? { status: input.status as ProjectStatus } : {}),
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (isStatusChanged) {
        await ActivityService.recordActivity(
          {
            projectId: p.id,
            workspaceId: p.workspaceId,
            actorId: userId,
            action: ActivityAction.PROJECT_STATUS_CHANGED,
            entityType: ActivityEntityType.PROJECT,
            entityId: p.id,
            entityTitle: p.name,
            details: {
              previousStatus: existing.status,
              newStatus: p.status,
            },
          },
          tx
        );
      }

      if (isNameChanged || isDescChanged) {
        await ActivityService.recordActivity(
          {
            projectId: p.id,
            workspaceId: p.workspaceId,
            actorId: userId,
            action: ActivityAction.PROJECT_UPDATED,
            entityType: ActivityEntityType.PROJECT,
            entityId: p.id,
            entityTitle: p.name,
            details: {
              changes: {
                ...(isNameChanged ? { name: { from: existing.name, to: p.name } } : {}),
                ...(isDescChanged ? { description: { from: existing.description, to: p.description } } : {}),
              },
            },
          },
          tx
        );
      }

      return p;
    });

    return {
      id: updated.id,
      name: updated.name,
      key: this.generateKey(updated.name, input.key),
      description: updated.description || '',
      workspaceId: updated.workspaceId,
      creatorId: updated.creatorId,
      creator: updated.creator,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Deletes a project.
   */
  public static async deleteProject(userId: string, projectId: string): Promise<void> {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      throw new NotFoundError('Project not found');
    }

    // Verify user is an OWNER or ADMIN or project creator
    const membership = await this.verifyMembership(userId, existing.workspaceId);
    if (membership.role !== Role.OWNER && membership.role !== Role.ADMIN && existing.creatorId !== userId) {
      throw new ForbiddenError('Insufficient permissions to delete this project');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });
  }
}
