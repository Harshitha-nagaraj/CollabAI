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
  /**
   * Deterministically calculate Smart Project Intelligence:
   * - Health assessment with explainable underlying metrics
   * - Risk detection (overdue, unassigned, stalled, blockers, meeting actions, delivery milestones)
   * - Workload analysis with transparent overload rules (effort hours, priorities, story points, concurrent load)
   * - Actionable recommendations with rationales explaining why each appears
   */
  public static async getProjectIntelligence(userId: string, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        workspace: {
          select: { id: true, name: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            dependencies: {
              include: {
                predecessor: {
                  select: { id: true, title: true, status: true, priority: true, assigneeId: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Enforce workspace membership authorization
    await this.verifyMembership(userId, project.workspaceId);

    // Fetch recent project activities (past 14 days) to detect task stalls and velocity
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentActivities = await prisma.projectActivity.findMany({
      where: {
        projectId,
        createdAt: { gte: fourteenDaysAgo },
      },
      select: {
        entityId: true,
        action: true,
        createdAt: true,
      },
    });

    // Fetch workspace meetings that might have action items for this project
    const workspaceMeetings = await prisma.meeting.findMany({
      where: {
        workspaceId: project.workspaceId,
        actionItems: { not: null },
      },
      select: {
        id: true,
        title: true,
        actionItems: true,
      },
      take: 20,
    });

    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === TaskStatus.DONE);
    const inProgressTasks = project.tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS || (t.status as string) === 'IN_REVIEW'
    );
    const todoTasks = project.tasks.filter(
      (t) => t.status === TaskStatus.TODO || (t.status as string) === 'BACKLOG'
    );
    const openTasks = project.tasks.filter(
      (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED
    );
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // Delivery & Target Due Date from tasks
    const dueDates = project.tasks
      .map((t) => t.dueDate)
      .filter((d): d is Date => d !== null);
    const targetDueDate =
      dueDates.length > 0
        ? new Date(Math.max(...dueDates.map((d) => new Date(d).getTime())))
        : null;

    // 1. Overdue tasks
    const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const isDeliveryOverdue =
      project.status !== ProjectStatus.COMPLETED &&
      project.status !== ProjectStatus.CANCELLED &&
      ((targetDueDate !== null && targetDueDate < now) || overdueTasks.length > 0);

    // 2. Unresolved blockers (Task has predecessor dependency where predecessor status is not DONE)
    const blockedTasks = openTasks.filter((t) =>
      t.dependencies.some((d) => d.predecessor && d.predecessor.status !== TaskStatus.DONE)
    );

    // 3. Stalled work (in-progress/in-review tasks with no updates in >7 days and no recent activity)
    const activeActivityEntityIds = new Set(
      recentActivities
        .filter((a) => a.createdAt >= sevenDaysAgo)
        .map((a) => a.entityId)
    );

    const stalledTasks = inProgressTasks.filter((t) => {
      const isOldUpdate = new Date(t.updatedAt) < sevenDaysAgo;
      const hasRecentActivity = activeActivityEntityIds.has(t.id);
      return isOldUpdate && !hasRecentActivity;
    });

    // 4. Unassigned open tasks
    const unassignedTasks = openTasks.filter((t) => !t.assigneeId);
    const unassignedHighPriority = unassignedTasks.filter(
      (t) => t.priority === 'HIGH' || t.priority === 'URGENT'
    );

    // 5. Incomplete meeting action items
    // (a: open tasks created from meetings with [MeetingRef: ...] tag)
    // (b: action items in workspace meetings targeting this project that are not yet marked approved/completed)
    const meetingActionTasks = openTasks.filter(
      (t) => t.description && t.description.includes('[MeetingRef:')
    );

    const unapprovedMeetingItems: Array<{
      id: string;
      title: string;
      meetingTitle: string;
      meetingId: string;
      assigneeName?: string;
    }> = [];

    for (const m of workspaceMeetings) {
      if (!m.actionItems) continue;
      try {
        const parsed = JSON.parse(m.actionItems);
        if (Array.isArray(parsed)) {
          for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            if (item && item.projectId === projectId && !item.approved) {
              unapprovedMeetingItems.push({
                id: item.id || `${m.id}-item-${i}`,
                title: item.title || item.task || 'Meeting action item',
                meetingTitle: m.title,
                meetingId: m.id,
                assigneeName: item.assignee || 'Unassigned',
              });
            }
          }
        }
      } catch {
        // safely ignore malformed JSON in meeting actionItems
      }
    }

    const totalIncompleteMeetingActions = meetingActionTasks.length + unapprovedMeetingItems.length;

    // 6. Explainable Health Assessment Calculation
    let healthScore = 100;
    const explainability: Array<{
      factor: string;
      impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      message: string;
      scoreDelta?: number;
    }> = [];

    if (totalTasks === 0) {
      healthScore = 100;
      explainability.push({
        factor: 'Task Volume',
        impact: 'NEUTRAL',
        message: 'Project is empty with 0 tasks. Initialize backlog to track execution health.',
        scoreDelta: 0,
      });
    } else {
      // Overdue deduction or on-schedule bonus
      if (overdueTasks.length > 0) {
        const delta = Math.min(overdueTasks.length * 15, 40);
        healthScore -= delta;
        explainability.push({
          factor: 'Overdue Deadlines',
          impact: 'NEGATIVE',
          message: `${overdueTasks.length} task(s) are overdue past their deadline.`,
          scoreDelta: -delta,
        });
      } else if (dueDates.length > 0) {
        explainability.push({
          factor: 'On-Schedule Deadlines',
          impact: 'POSITIVE',
          message: 'All tasks with scheduled deadlines are currently on track.',
          scoreDelta: 5,
        });
        healthScore += 5;
      } else {
        explainability.push({
          factor: 'Task Due Dates',
          impact: 'NEUTRAL',
          message: 'No individual task deadlines have been specified yet.',
          scoreDelta: 0,
        });
      }

      // Blocker deduction
      if (blockedTasks.length > 0) {
        const delta = Math.min(blockedTasks.length * 10, 25);
        healthScore -= delta;
        explainability.push({
          factor: 'Unresolved Blockers',
          impact: 'NEGATIVE',
          message: `${blockedTasks.length} task(s) are blocked waiting on predecessor dependencies.`,
          scoreDelta: -delta,
        });
      } else {
        explainability.push({
          factor: 'Dependency Flow',
          impact: 'POSITIVE',
          message: 'Zero task dependency blockers detected.',
          scoreDelta: 0,
        });
      }

      // Stalled work deduction
      if (stalledTasks.length > 0) {
        const delta = Math.min(stalledTasks.length * 8, 20);
        healthScore -= delta;
        explainability.push({
          factor: 'Stalled In-Progress Work',
          impact: 'NEGATIVE',
          message: `${stalledTasks.length} in-progress task(s) have been inactive for over 7 days.`,
          scoreDelta: -delta,
        });
      }

      // Unassigned critical scope deduction
      if (unassignedHighPriority.length > 0) {
        const delta = Math.min(unassignedHighPriority.length * 6, 15);
        healthScore -= delta;
        explainability.push({
          factor: 'Unassigned Critical Scope',
          impact: 'NEGATIVE',
          message: `${unassignedHighPriority.length} HIGH or URGENT priority task(s) lack an assigned owner.`,
          scoreDelta: -delta,
        });
      } else if (unassignedTasks.length > 0) {
        const delta = Math.min(unassignedTasks.length * 2, 8);
        healthScore -= delta;
        explainability.push({
          factor: 'Ownership Allocation',
          impact: 'NEUTRAL',
          message: `${unassignedTasks.length} task(s) await owner assignment.`,
          scoreDelta: -delta,
        });
      } else if (openTasks.length > 0) {
        explainability.push({
          factor: 'Ownership Coverage',
          impact: 'POSITIVE',
          message: '100% of open tasks have designated owners.',
          scoreDelta: 0,
        });
      }

      // Completion velocity bonus
      if (completionRate >= 60) {
        explainability.push({
          factor: 'Completion Velocity',
          impact: 'POSITIVE',
          message: `Strong progress with ${completionRate}% of recorded tasks completed.`,
          scoreDelta: 5,
        });
        healthScore += 5;
      }

      // Target delivery milestone past check
      if (targetDueDate && targetDueDate < now && project.status !== ProjectStatus.COMPLETED) {
        healthScore -= 15;
        explainability.push({
          factor: 'Target Delivery Milestone',
          impact: 'NEGATIVE',
          message: `Project target delivery date (${targetDueDate.toISOString().slice(0, 10)}) has passed.`,
          scoreDelta: -15,
        });
      }
    }

    // Clamp score strictly between 0 and 100
    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthStatus: 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK' = 'HEALTHY';
    if (healthScore < 50) {
      healthStatus = 'AT_RISK';
    } else if (healthScore < 75) {
      healthStatus = 'NEEDS_ATTENTION';
    }

    // 7. Workload Analysis with Transparent Effort-Aware Overload Rules
    const assigneeMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        avatarUrl?: string | null;
        openTasks: number;
        inProgressTasks: number;
        urgentOrHighTasks: number;
        overdueTasks: number;
        totalEstimatedHours: number;
        storyPoints: number;
        overloadReasons: string[];
      }
    >();

    for (const t of openTasks) {
      if (t.assigneeId && t.assignee) {
        const existing = assigneeMap.get(t.assigneeId);
        const assigneeName = (t.assignee.name || (t.assignee.email ? t.assignee.email.split('@')[0] : 'Member')) || 'Member';
        const entry = existing || {
          userId: t.assigneeId,
          name: assigneeName,
          email: t.assignee.email || '',
          avatarUrl: t.assignee.avatarUrl,
          openTasks: 0,
          inProgressTasks: 0,
          urgentOrHighTasks: 0,
          overdueTasks: 0,
          totalEstimatedHours: 0,
          storyPoints: 0,
          overloadReasons: [] as string[],
        };

        entry.openTasks++;
        if (t.status === TaskStatus.IN_PROGRESS || (t.status as string) === 'IN_REVIEW') {
          entry.inProgressTasks++;
        }
        if (t.priority === 'HIGH' || t.priority === 'URGENT') {
          entry.urgentOrHighTasks++;
        }
        if (t.dueDate && new Date(t.dueDate) < now) {
          entry.overdueTasks++;
        }
        if (t.estimatedHours) {
          entry.totalEstimatedHours += t.estimatedHours;
        }
        if (t.storyPoints) {
          entry.storyPoints += t.storyPoints;
        }

        assigneeMap.set(t.assigneeId, entry);
      }
    }

    const membersWorkload = Array.from(assigneeMap.values()).map((m) => {
      const reasons: string[] = [];
      if (m.openTasks >= 5) {
        reasons.push(`Assigned to ${m.openTasks} active tasks concurrently`);
      }
      if (m.urgentOrHighTasks >= 3) {
        reasons.push(`Responsible for ${m.urgentOrHighTasks} high/urgent priority tasks`);
      }
      if (m.overdueTasks >= 2) {
        reasons.push(`${m.overdueTasks} overdue tasks requiring urgent remediation`);
      }
      if (m.totalEstimatedHours >= 40) {
        reasons.push(`Estimated commitment of ${m.totalEstimatedHours} hours exceeds 40h capacity`);
      }
      if (m.storyPoints >= 20) {
        reasons.push(`High story point load of ${m.storyPoints} points`);
      }

      let status: 'BALANCED' | 'MODERATE' | 'HEAVY' | 'OVERLOADED' = 'BALANCED';
      if (reasons.length >= 2 || m.openTasks >= 6 || m.totalEstimatedHours >= 45) {
        status = 'OVERLOADED';
      } else if (reasons.length === 1 || m.openTasks >= 4 || m.totalEstimatedHours >= 30) {
        status = 'HEAVY';
      } else if (m.openTasks >= 2 || m.totalEstimatedHours >= 15) {
        status = 'MODERATE';
      }

      return {
        ...m,
        status,
        overloadReasons: reasons,
      };
    });

    const overloadedCount = membersWorkload.filter((m) => m.status === 'OVERLOADED').length;

    const unassignedWork = {
      openTasks: unassignedTasks.length,
      urgentOrHighTasks: unassignedHighPriority.length,
      overdueTasks: unassignedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length,
    };

    // 8. Actionable Recommendations (Explaining why each appears)
    const recommendations: Array<{
      id: string;
      category: 'DEADLINES' | 'ASSIGNMENT' | 'BLOCKERS' | 'WORKLOAD' | 'MEETINGS' | 'PROCESS';
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      action: string;
      rationale: string;
      suggestedSteps: string[];
    }> = [];

    // Deadlines Recommendation
    if (overdueTasks.length > 0) {
      recommendations.push({
        id: 'rec-overdue',
        category: 'DEADLINES',
        priority: 'HIGH',
        title: `Address ${overdueTasks.length} overdue task(s)`,
        action: 'Review and update commitments for overdue tasks',
        rationale: `${overdueTasks.length} task(s) have passed their scheduled completion dates, directly threatening project milestones.`,
        suggestedSteps: [
          'Inspect individual task blockers or bottlenecks in Kanban',
          'Coordinate with assignees to adjust realistic delivery dates',
          'Re-prioritize urgent items ahead of non-critical backlog work',
        ],
      });
    }

    // Blockers Recommendation
    if (blockedTasks.length > 0) {
      recommendations.push({
        id: 'rec-blockers',
        category: 'BLOCKERS',
        priority: 'HIGH',
        title: `Clear ${blockedTasks.length} task dependency blocker(s)`,
        action: 'Expedite predecessor tasks to release blocked downstream work',
        rationale: `${blockedTasks.length} active task(s) are unable to proceed until their prerequisite tasks reach completion.`,
        suggestedSteps: [
          'Identify predecessor tasks in the Gantt Timeline or task dependencies',
          'Focus sprint effort on completing prerequisite tasks',
          'Determine if tasks can be decoupled to proceed concurrently',
        ],
      });
    }

    // Unassigned Scope Recommendation
    if (unassignedTasks.length > 0) {
      recommendations.push({
        id: 'rec-unassigned',
        category: 'ASSIGNMENT',
        priority: unassignedHighPriority.length > 0 ? 'HIGH' : 'MEDIUM',
        title: `Assign owners to ${unassignedTasks.length} unassigned task(s)`,
        action: 'Designate accountable owners for unassigned work',
        rationale: unassignedHighPriority.length > 0
          ? `${unassignedHighPriority.length} high or urgent priority tasks lack owners, risking critical sprint deliverables.`
          : `${unassignedTasks.length} open task(s) lack designated accountability and risk being delayed.`,
        suggestedSteps: [
          'Review available team members in the Workload section',
          'Assign tasks to contributors with balanced capacity',
        ],
      });
    }

    // Stalled Work Recommendation
    if (stalledTasks.length > 0) {
      recommendations.push({
        id: 'rec-stalled',
        category: 'PROCESS',
        priority: 'MEDIUM',
        title: `Investigate ${stalledTasks.length} stalled in-progress task(s)`,
        action: 'Review work in progress with no activity for >7 days',
        rationale: 'Tasks marked In Progress without recent updates or activity indicate silent blockers or abandoned work.',
        suggestedSteps: [
          'Confirm with assignees whether work is blocked or active',
          'Transition paused tasks back to Todo or Backlog to maintain honest velocity',
        ],
      });
    }

    // Workload Rebalancing Recommendation
    if (overloadedCount > 0) {
      recommendations.push({
        id: 'rec-workload',
        category: 'WORKLOAD',
        priority: 'MEDIUM',
        title: `Rebalance workload for ${overloadedCount} overloaded team member(s)`,
        action: 'Redistribute tasks to balance team velocity and avoid burnout',
        rationale: 'Concentrating excessive tasks or high-priority items on few individuals creates single points of failure.',
        suggestedSteps: [
          'Reassign non-critical tasks to members with lower load',
          'De-scope secondary items into future iterations',
        ],
      });
    }

    // Meeting Action Follow-Through Recommendation
    if (totalIncompleteMeetingActions > 0) {
      recommendations.push({
        id: 'rec-meetings',
        category: 'MEETINGS',
        priority: 'LOW',
        title: `Follow through on ${totalIncompleteMeetingActions} meeting commitment(s)`,
        action: 'Ensure meeting decisions and action items reach completion',
        rationale: 'Decisions and action items agreed upon during team meetings should be tracked to delivery.',
        suggestedSteps: [
          'Review originating meetings in the Meetings dashboard',
          'Coordinate with participants to approve and complete action items',
        ],
      });
    }

    // Empty project recommendation
    if (totalTasks === 0) {
      recommendations.push({
        id: 'rec-empty',
        category: 'PROCESS',
        priority: 'LOW',
        title: 'Initialize project backlog',
        action: 'Add initial tasks and milestones',
        rationale: 'This project currently has no tasks. Add tasks to enable real-time health and risk monitoring.',
        suggestedSteps: [
          'Create primary epics or features as tasks',
          'Assign target delivery dates and owners',
        ],
      });
    } else if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-momentum',
        category: 'PROCESS',
        priority: 'LOW',
        title: 'Maintain execution cadence',
        action: 'Continue current sprint velocity and alignment',
        rationale: 'Project health is strong with zero overdue tasks, no blockers, and balanced workload distribution.',
        suggestedSteps: [
          'Review upcoming backlog items to prepare next iteration',
        ],
      });
    }

    // Combined meeting risk items for risk detection
    const meetingRiskItems = [
      ...meetingActionTasks.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assigneeName: t.assignee?.name || t.assignee?.email?.split('@')[0] || 'Unassigned',
        details: 'Task linked to meeting decision',
      })),
      ...unapprovedMeetingItems.slice(0, 5).map((m) => ({
        id: m.id,
        title: m.title,
        priority: undefined,
        dueDate: null,
        assigneeName: m.assigneeName,
        details: `From meeting: ${m.meetingTitle}`,
      })),
    ];

    return {
      projectId: project.id,
      projectName: project.name,
      workspaceId: project.workspaceId,
      projectStatus: project.status,
      health: {
        status: healthStatus,
        score: healthScore,
        metrics: {
          totalTasks,
          completedTasks: completedTasks.length,
          inProgressTasks: inProgressTasks.length,
          todoTasks: todoTasks.length,
          openTasks: openTasks.length,
          overdueTasks: overdueTasks.length,
          blockedTasks: blockedTasks.length,
          stalledTasks: stalledTasks.length,
          unassignedTasks: unassignedTasks.length,
          completionRate,
          targetDueDate: targetDueDate ? targetDueDate.toISOString() : null,
          isDeliveryOverdue,
        },
        explainability,
      },
      risks: [
        ...(overdueTasks.length > 0
          ? [
              {
                id: 'risk-overdue',
                type: 'OVERDUE' as const,
                severity: 'HIGH' as const,
                title: `${overdueTasks.length} Overdue Task(s)`,
                description: 'Tasks have exceeded their target completion dates without being marked Done.',
                affectedCount: overdueTasks.length,
                items: overdueTasks.slice(0, 5).map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                  assigneeName: t.assignee?.name || t.assignee?.email?.split('@')[0] || 'Unassigned',
                })),
              },
            ]
          : []),
        ...(blockedTasks.length > 0
          ? [
              {
                id: 'risk-blocked',
                type: 'BLOCKED' as const,
                severity: 'HIGH' as const,
                title: `${blockedTasks.length} Blocked Task(s)`,
                description: 'Tasks cannot proceed because prerequisite tasks are unfinished.',
                affectedCount: blockedTasks.length,
                items: blockedTasks.slice(0, 5).map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                  assigneeName: t.assignee?.name || t.assignee?.email?.split('@')[0] || 'Unassigned',
                  details: `Blocked by: ${t.dependencies.map((d) => d.predecessor?.title || 'Predecessor').join(', ')}`,
                })),
              },
            ]
          : []),
        ...(stalledTasks.length > 0
          ? [
              {
                id: 'risk-stalled',
                type: 'STALLED' as const,
                severity: 'MEDIUM' as const,
                title: `${stalledTasks.length} Stalled In-Progress Task(s)`,
                description: 'Work is currently in-progress but has recorded no activity in the past 7 days.',
                affectedCount: stalledTasks.length,
                items: stalledTasks.slice(0, 5).map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                  assigneeName: t.assignee?.name || t.assignee?.email?.split('@')[0] || 'Unassigned',
                })),
              },
            ]
          : []),
        ...(unassignedTasks.length > 0
          ? [
              {
                id: 'risk-unassigned',
                type: 'UNASSIGNED' as const,
                severity: unassignedHighPriority.length > 0 ? ('HIGH' as const) : ('MEDIUM' as const),
                title: unassignedHighPriority.length > 0
                  ? `${unassignedTasks.length} Unassigned Task(s) (${unassignedHighPriority.length} high priority)`
                  : `${unassignedTasks.length} Unassigned Task(s)`,
                description: 'Open tasks have no assigned owner, creating lack of accountability.',
                affectedCount: unassignedTasks.length,
                items: [...unassignedHighPriority, ...unassignedTasks.filter((t) => t.priority !== 'HIGH' && t.priority !== 'URGENT')]
                  .slice(0, 5)
                  .map((t) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                    assigneeName: 'Unassigned',
                  })),
              },
            ]
          : []),
        ...(totalIncompleteMeetingActions > 0
          ? [
              {
                id: 'risk-meeting-actions',
                type: 'MEETING_ACTION' as const,
                severity: 'LOW' as const,
                title: `${totalIncompleteMeetingActions} Incomplete Meeting Action Item(s)`,
                description: 'Action items approved or proposed from team meetings remain incomplete.',
                affectedCount: totalIncompleteMeetingActions,
                items: meetingRiskItems.slice(0, 5),
              },
            ]
          : []),
      ],
      workload: {
        totalAssignees: membersWorkload.length,
        overloadedCount,
        members: membersWorkload,
        unassignedWork,
      },
      recommendations,
    };
  }
}
