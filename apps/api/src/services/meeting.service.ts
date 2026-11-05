/**
 * @file services/meeting.service.ts
 *
 * Full service implementation for CollabAI Meetings & AI Meeting Intelligence.
 */

import { prisma } from '../lib/prisma.js';
import { MeetingIntelligenceService } from '../ai/services/meeting-intelligence.service.js';
import { NotificationService } from './notification.service.js';
import { TaskService } from './task.service.js';
import { TranscriptionService } from './transcription.service.js';
import { ForbiddenError, BadRequestError, NotFoundError } from '../utils/errors.js';

export class MeetingService {
  /**
   * Deterministically generate a stable, collision-resistant room identifier
   * from workspaceId and meetingId.
   */
  static generateRoomIdentifier(workspaceId: string, meetingId: string): string {
    const cleanWorkspace = (workspaceId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const cleanMeeting = (meetingId || '').replace(/[^a-zA-Z0-9]/g, '');
    return `collabai_${cleanWorkspace}_${cleanMeeting}`;
  }

  /**
   * Retrieve authorized real-time conference access parameters
   */
  static async getMeetingAccess(
    meetingId: string,
    workspaceId: string,
    user: { id: string; name?: string | null | undefined; email: string }
  ) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      select: {
        id: true,
        title: true,
        workspaceId: true,
        status: true,
        creatorId: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found in this workspace');
    }

    const domain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    const isPublicProvider = domain.toLowerCase() === 'meet.jit.si' || domain.includes('meet.jit.si');
    const roomName = this.generateRoomIdentifier(workspaceId, meetingId);

    return {
      meetingId: meeting.id,
      title: meeting.title,
      workspaceId: meeting.workspaceId,
      creatorId: meeting.creatorId,
      isHost: meeting.creatorId === user.id,
      hostName: meeting.creator?.name || meeting.creator?.email || 'Host',
      roomName,
      domain,
      isPublicProvider,
      user: {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
      },
      lowResourceConstraints: {
        resolution: 360,
        maxFramerate: 20,
        channelLastN: 4,
        enableLayerSuspension: true,
        p2p: true,
      },
      privacyNotice: isPublicProvider
        ? 'Public media provider (meet.jit.si) in use. Access to meeting metadata and attendance is strictly authorized by CollabAI workspace membership. Note: public Jitsi instances do not enforce tokenized media isolation. For private enterprise zero-trust media boundaries, configure a self-hosted Jitsi instance or JaaS domain.'
        : 'Enterprise media provider configured.',
    };
  }

  /**
   * Schedule or create a new meeting
   */
  static async createMeeting(payload: {
    title: string;
    description?: string;
    type?: 'STANDUP' | 'SPRINT_PLANNING' | 'ARCHITECTURE_REVIEW' | 'CLIENT_SYNC' | 'ONE_ON_ONE' | 'GENERAL';
    startTime: string;
    endTime: string;
    workspaceId: string;
    creatorId: string;
    participantIds?: string[];
  }) {
    const meetingData: any = {
      title: payload.title,
      description: payload.description || null,
      type: payload.type || 'GENERAL',
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
      workspaceId: payload.workspaceId,
      creatorId: payload.creatorId,
      status: 'SCHEDULED',
    };

    if (payload.participantIds?.length) {
      meetingData.participants = {
        create: payload.participantIds.map((userId) => ({
          userId,
        })),
      };
    }

    const meeting = await prisma.meeting.create({
      data: meetingData,
      include: {
        workspace: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });

    // Notify participants
    if (payload.participantIds?.length) {
      for (const userId of payload.participantIds) {
        if (userId !== payload.creatorId) {
          await NotificationService.createNotification({
            userId,
            workspaceId: payload.workspaceId,
            title: 'Meeting Scheduled',
            message: `You were invited to "${payload.title}" on ${new Date(payload.startTime).toLocaleString()}.`,
            type: 'MEETING_INVITE',
            link: `/dashboard/meetings/${meeting.id}`,
          });
        }
      }
    }

    return meeting;
  }

  /**
   * List workspace meetings
   */
  static async getWorkspaceMeetings(workspaceId: string) {
    return prisma.meeting.findMany({
      where: { workspaceId },
      include: {
        workspace: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * Helper to format structured meeting intelligence from stored fields
   */
  static formatStructuredSummary(meeting: any) {
    if (!meeting) return null;
    const rawSummary = meeting.summary || '';
    let source = 'Meeting Notes';
    let overview = rawSummary;
    let keyDiscussionPoints: string[] = [];

    const sourceMatch = rawSummary.match(/\[Source:\s*([^\]]+)\]/i);
    if (sourceMatch && sourceMatch[1]) {
      source = sourceMatch[1].trim();
    }

    const pointsMatch = rawSummary.match(/Key Discussion Points:\s*([\s\S]*?)(?=(?:###|Decisions|Action Items|Unresolved|$))/i);
    if (pointsMatch && pointsMatch[1]) {
      keyDiscussionPoints = pointsMatch[1]
        .split('\n')
        .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line: string) => line.length > 0);
    }

    overview = rawSummary
      .replace(/\[Source:\s*[^\]]+\]\s*/i, '')
      .replace(/Key Discussion Points:\s*[\s\S]*$/i, '')
      .trim();

    const parseJson = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    };

    return {
      source,
      overview: overview || 'Overview derived from meeting content.',
      keyDiscussionPoints,
      executiveSummary: rawSummary,
      keyDecisions: parseJson(meeting.decisions, []),
      actionItems: parseJson(meeting.actionItems, []),
      pendingQuestions: parseJson(meeting.pendingQuestions, []),
      unresolvedQuestions: parseJson(meeting.pendingQuestions, []),
      risks: parseJson(meeting.risks, []),
      deadlinesMentioned: parseJson(meeting.deadlines, []),
      suggestedFollowUps: parseJson(meeting.followUps, []),
      sentiment: parseJson(meeting.sentiment, {
        label: 'CONSTRUCTIVE',
        score: 80,
        summary: `Meeting derived from ${source.toLowerCase()}.`,
        keyMoments: [],
      }),
      sprintPlan: parseJson(meeting.sprintPlan, null),
    };
  }

  /**
   * Get single meeting details with chat and AI data
   */
  static async getMeetingDetails(meetingId: string, workspaceId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      include: {
        workspace: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        chatMessages: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        documents: { select: { id: true, title: true, content: true, type: true, createdAt: true } },
      },
    });

    if (!meeting) return null;

    let followThrough = null;
    try {
      followThrough = await this.getMeetingFollowThrough(meetingId, workspaceId);
    } catch {
      // Non-fatal if follow-through lookup fails
    }

    return {
      ...meeting,
      roomName: this.generateRoomIdentifier(workspaceId, meetingId),
      structuredSummary: this.formatStructuredSummary(meeting),
      followThrough,
    };
  }

  /**
   * Join a meeting (record attendance)
   */
  static async joinMeeting(meetingId: string, userId: string, workspaceId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });
    if (!meeting) {
      throw new Error('Meeting not found in this workspace');
    }

    const participant = await prisma.meetingParticipant.upsert({
      where: {
        userId_meetingId: {
          userId,
          meetingId,
        },
      },
      update: {},
      create: {
        userId,
        meetingId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return participant;
  }

  /**
   * Leave a meeting
   */
  static async leaveMeeting(meetingId: string, userId: string, workspaceId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });
    if (!meeting) {
      throw new Error('Meeting not found in this workspace');
    }

    await prisma.meetingParticipant.deleteMany({
      where: {
        meetingId,
        userId,
      },
    });

    return { success: true, message: 'Successfully left the meeting' };
  }

  /**
   * Get participants for a meeting
   */
  static async getMeetingParticipants(meetingId: string, workspaceId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });
    if (!meeting) {
      throw new Error('Meeting not found in this workspace');
    }

    return prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Save or update meeting notes
   */
  static async updateMeetingNotes(meetingId: string, userId: string, workspaceId: string, notes: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });
    if (!meeting) {
      throw new Error('Meeting not found in this workspace');
    }

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        description: notes,
      },
      include: {
        workspace: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const existingDoc = await prisma.document.findFirst({
      where: {
        meetingId,
        type: 'MEETING_NOTES',
      },
    });

    let document;
    if (existingDoc) {
      document = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          content: notes,
          title: `Meeting Notes: ${meeting.title}`,
        },
      });
    } else {
      document = await prisma.document.create({
        data: {
          title: `Meeting Notes: ${meeting.title}`,
          content: notes,
          type: 'MEETING_NOTES',
          workspaceId,
          meetingId,
          creatorId: userId,
        },
      });
    }

    return {
      meeting: updatedMeeting,
      document,
    };
  }

  /**
   * Send live chat message in meeting
   */
  static async postChatMessage(meetingId: string, userId: string, message: string) {
    return prisma.meetingChatMessage.create({
      data: {
        meetingId,
        userId,
        message,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  /**
   * End meeting and execute AI Meeting Intelligence pipeline!
   */
  static async processMeetingIntelligence(
    meetingId: string,
    workspaceId: string,
    customTranscript?: string,
    customNotes?: string
  ) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        chatMessages: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const notesToAnalyze = (typeof customNotes === 'string' && customNotes.trim().length > 0)
      ? customNotes.trim()
      : (meeting.description?.trim() || '');

    const transcriptToAnalyze = (typeof customTranscript === 'string' && customTranscript.trim().length > 0)
      ? customTranscript.trim()
      : (meeting.transcript?.trim() || '');

    const chatLogs = meeting.chatMessages.map((c) => ({
      sender: c.user.name || 'User',
      message: c.message,
    }));

    const participantsList = meeting.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name || p.user.email,
      email: p.user.email,
    }));

    // Execute full AI Intelligence analysis with real available content
    const intelligence = await MeetingIntelligenceService.analyzeMeeting({
      title: meeting.title,
      transcript: transcriptToAnalyze,
      sharedNotes: notesToAnalyze,
      chatMessages: chatLogs,
      participants: participantsList,
    });

    // Update meeting with AI results
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'PROCESSED',
        transcript: transcriptToAnalyze,
        summary: intelligence.executiveSummary,
        decisions: JSON.stringify(intelligence.keyDecisions),
        actionItems: JSON.stringify(intelligence.actionItems),
        risks: JSON.stringify(intelligence.risks),
        deadlines: JSON.stringify(intelligence.deadlinesMentioned),
        pendingQuestions: JSON.stringify(intelligence.pendingQuestions),
        followUps: JSON.stringify(intelligence.suggestedFollowUps),
        sentiment: JSON.stringify(intelligence.sentiment),
        sprintPlan: JSON.stringify(intelligence.sprintPlan),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    // Auto-create documents in workspace
    if (intelligence.generatedDocs) {
      await prisma.document.create({
        data: {
          title: `Meeting Notes: ${meeting.title}`,
          content: intelligence.generatedDocs.meetingNotes,
          type: 'MEETING_NOTES',
          workspaceId,
          meetingId,
          creatorId: meeting.creatorId,
        },
      });

      await prisma.document.create({
        data: {
          title: `Decision Log: ${meeting.title}`,
          content: intelligence.generatedDocs.decisionLog,
          type: 'DECISION_LOG',
          workspaceId,
          meetingId,
          creatorId: meeting.creatorId,
        },
      });
    }

    // Dispatch notifications to members
    for (const notif of intelligence.notifications) {
      const targetId = notif.targetUserId || meeting.creatorId;
      await NotificationService.createNotification({
        userId: targetId,
        workspaceId,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        link: `/dashboard/meetings/${meetingId}`,
      });
    }

    const structuredSummary = this.formatStructuredSummary(updatedMeeting);

    return {
      meeting: {
        ...updatedMeeting,
        roomName: this.generateRoomIdentifier(workspaceId, meetingId),
        structuredSummary,
      },
      intelligence,
      structuredSummary,
    };
  }

  /**
   * Batch approve and convert AI Action Items into workspace tasks inside Kanban
   */
  /**
   * Batch approve and convert AI Action Items into workspace tasks inside Kanban.
   * Links approved tasks safely to originating meeting in actionItems JSON and task description.
   */
  static async approveTasks(payload: {
    meetingId: string;
    workspaceId: string;
    projectId: string;
    creatorId: string;
    tasks: Array<{
      title: string;
      description?: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      assigneeId?: string | null;
      dueDate?: string | null;
    }>;
  }) {
    // Verify target project exists in this workspace
    const project = await prisma.project.findFirst({
      where: { id: payload.projectId, workspaceId: payload.workspaceId },
    });
    if (!project) {
      throw new ForbiddenError('Project does not belong to this workspace');
    }

    // Verify meeting exists in this workspace
    const meeting = await prisma.meeting.findFirst({
      where: { id: payload.meetingId, workspaceId: payload.workspaceId },
    });
    if (!meeting) {
      throw new NotFoundError('Meeting not found in this workspace');
    }

    const createdTasks = [];

    for (const taskItem of payload.tasks) {
      // Safely link originating meeting ID into description metadata tag
      const baseDesc = (taskItem.description || '').trim();
      const meetingRefTag = `[MeetingRef: ${payload.meetingId}]`;
      const descriptionWithMeetingRef = baseDesc
        ? `${baseDesc}\n\n${meetingRefTag}`
        : meetingRefTag;

      const created = await TaskService.createTask(payload.creatorId, {
        title: taskItem.title,
        description: descriptionWithMeetingRef,
        status: 'TODO',
        priority: taskItem.priority,
        projectId: payload.projectId,
        assigneeId: taskItem.assigneeId || null,
        dueDate: taskItem.dueDate ? new Date(taskItem.dueDate) : null,
      });

      createdTasks.push(created);

      // Dispatch notification if assigned
      if (taskItem.assigneeId) {
        await NotificationService.createNotification({
          userId: taskItem.assigneeId,
          workspaceId: payload.workspaceId,
          title: 'New Task Assigned from Meeting',
          message: `Task "${taskItem.title}" was approved from meeting "${meeting.title}" and assigned to you.`,
          type: 'TASK_ASSIGNED',
          link: `/dashboard/kanban`,
        });
      }
    }

    // Correlate and record approved task IDs into meeting.actionItems JSON
    try {
      let existingItems: any[] = [];
      if (meeting.actionItems) {
        try {
          const parsed = JSON.parse(meeting.actionItems);
          if (Array.isArray(parsed)) existingItems = parsed;
        } catch {
          existingItems = [];
        }
      }

      for (const created of createdTasks) {
        const matchIdx = existingItems.findIndex(
          (item) => item && (item.title === created.title || item.task === created.title) && !item.taskId
        );

        if (matchIdx >= 0) {
          existingItems[matchIdx] = {
            ...existingItems[matchIdx],
            approved: true,
            taskId: created.id,
            approvedAt: new Date().toISOString(),
            projectId: payload.projectId,
          };
        } else {
          existingItems.push({
            title: created.title,
            priority: created.priority,
            assigneeId: created.assigneeId,
            dueDate: created.dueDate ? created.dueDate.toISOString() : null,
            approved: true,
            taskId: created.id,
            approvedAt: new Date().toISOString(),
            projectId: payload.projectId,
          });
        }
      }

      await prisma.meeting.update({
        where: { id: payload.meetingId },
        data: {
          actionItems: JSON.stringify(existingItems),
        },
      });
    } catch {
      // Non-fatal if JSON correlation sync fails
    }

    return createdTasks;
  }

  /**
   * Retrieve live follow-through state and linked tasks for a meeting
   */
  static async getMeetingFollowThrough(meetingId: string, workspaceId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      select: {
        id: true,
        title: true,
        workspaceId: true,
        actionItems: true,
        followUps: true,
        createdAt: true,
      },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting not found in this workspace');
    }

    const taskIds = new Set<string>();

    const parseAndCollect = (jsonStr?: string | null) => {
      if (!jsonStr) return;
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.taskId && typeof item.taskId === 'string') {
              taskIds.add(item.taskId);
            }
          }
        }
      } catch {
        // ignore JSON parse errors
      }
    };

    parseAndCollect(meeting.actionItems);
    parseAndCollect(meeting.followUps);

    // Also look up any tasks created with description tag [MeetingRef: meetingId]
    const meetingTag = `[MeetingRef: ${meetingId}]`;
    const taggedTasks = await prisma.task.findMany({
      where: {
        description: { contains: meetingTag },
        project: { workspaceId },
      },
      select: { id: true },
    });

    for (const t of taggedTasks) {
      taskIds.add(t.id);
    }

    if (taskIds.size === 0) {
      return {
        meetingId,
        workspaceId,
        metrics: {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          completionRate: 0,
          overdueCount: 0,
        },
        tasks: {
          pending: [],
          inProgress: [],
          completed: [],
          all: [],
        },
      };
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: Array.from(taskIds) } },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const now = new Date();
    const formattedTasks = tasks.map((t) => {
      const isOverdue = t.dueDate
        ? new Date(t.dueDate) < now && t.status !== 'DONE' && (t.status as string) !== 'CANCELLED'
        : false;
      const cleanDesc = t.description
        ? t.description.replace(new RegExp(`\\n*\\[MeetingRef:\\s*${meetingId}\\]`, 'g'), '').trim()
        : '';

      return {
        id: t.id,
        title: t.title,
        description: cleanDesc,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        isOverdue,
        projectId: t.projectId,
        projectName: t.project?.name || null,
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              name: t.assignee.name || t.assignee.email.split('@')[0],
              email: t.assignee.email,
              avatarUrl: t.assignee.avatarUrl,
            }
          : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });

    const pending = formattedTasks.filter((t) => t.status === 'TODO' || (t.status as string) === 'BACKLOG');
    const inProgress = formattedTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW');
    const completed = formattedTasks.filter((t) => t.status === 'DONE');
    const overdue = formattedTasks.filter((t) => t.isOverdue);

    const total = formattedTasks.length;
    const completedCount = completed.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      meetingId,
      workspaceId,
      metrics: {
        total,
        completed: completedCount,
        inProgress: inProgress.length,
        pending: pending.length,
        completionRate,
        overdueCount: overdue.length,
      },
      tasks: {
        pending,
        inProgress,
        completed,
        all: formattedTasks,
      },
    };
  }

  /**
   * Send deduplicated follow-up reminders to assignees of open meeting tasks.
   * Throttled to 1 reminder per task per 24 hours to prevent spam and duplicate notifications.
   */
  static async sendFollowUpReminders(meetingId: string, workspaceId: string, senderUserId: string) {
    await NotificationService.verifyMembership(senderUserId, workspaceId);

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      select: { id: true, title: true },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting not found in this workspace');
    }

    const followThrough = await this.getMeetingFollowThrough(meetingId, workspaceId);
    const openTasksWithAssignees = followThrough.tasks.all.filter(
      (t) => t.status !== 'DONE' && (t.status as string) !== 'CANCELLED' && t.assignee?.id
    );

    const throttleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let sentCount = 0;
    let throttledCount = 0;
    const dispatched = [];

    for (const task of openTasksWithAssignees) {
      const targetUserId = task.assignee!.id;
      const taskLink = `/dashboard/kanban?task=${task.id}`;

      // Check existing notification to prevent duplicates on polling or repeated clicks
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: targetUserId,
          workspaceId,
          type: 'MEETING_FOLLOWUP',
          link: taskLink,
          createdAt: { gte: throttleCutoff },
        },
      });

      if (existingNotification) {
        throttledCount++;
        continue;
      }

      const dueDateStr = task.dueDate ? ` (Due: ${new Date(task.dueDate).toLocaleDateString()})` : '';
      const notif = await NotificationService.createNotification({
        userId: targetUserId,
        workspaceId,
        type: 'MEETING_FOLLOWUP',
        title: `Meeting Follow-up: "${meeting.title}"`,
        message: `Task "${task.title}" is currently ${task.status.replace('_', ' ')}${dueDateStr}. Please review and update your progress.`,
        link: taskLink,
      });

      dispatched.push(notif);
      sentCount++;
    }

    return {
      success: true,
      meetingId,
      sentCount,
      throttledCount,
      totalEligible: openTasksWithAssignees.length,
      message: sentCount > 0
        ? `Dispatched ${sentCount} follow-up reminder(s)${throttledCount > 0 ? ` (${throttledCount} skipped due to 24h throttle window)` : ''}.`
        : throttledCount > 0
          ? `All ${throttledCount} eligible task reminder(s) were already dispatched within the last 24 hours.`
          : 'No open assigned tasks requiring follow-up reminders.',
    };
  }

  /**
   * Process uploaded meeting audio file using local Whisper.
   * Requires participant consent confirmation and workspace authorization.
   */
  static async transcribeMeetingAudio(params: {
    meetingId: string;
    workspaceId: string;
    userId: string;
    filePath: string;
    consentConfirmed: boolean;
    model?: string;
    language?: string;
  }) {
    const { meetingId, workspaceId, filePath, consentConfirmed, model, language } = params;

    if (!consentConfirmed) {
      TranscriptionService.cleanupTempFile(filePath);
      throw new BadRequestError(
        'Participant consent must be confirmed before processing meeting audio recordings.'
      );
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      select: { id: true, title: true, workspaceId: true },
    });

    if (!meeting) {
      TranscriptionService.cleanupTempFile(filePath);
      throw new NotFoundError('Meeting not found in this workspace.');
    }

    try {
      const result = await TranscriptionService.transcribeAudioFile(filePath, {
        model,
        language,
      });

      const updatedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          transcript: result.transcript,
        },
        include: {
          workspace: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
          participants: {
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
        },
      });

      return {
        success: true,
        meeting: {
          ...updatedMeeting,
          roomName: this.generateRoomIdentifier(workspaceId, meetingId),
          structuredSummary: this.formatStructuredSummary(updatedMeeting),
        },
        transcription: {
          transcript: result.transcript,
          duration: result.duration,
          language: result.language,
          model: result.model,
          segmentsCount: result.segmentsCount,
          segments: result.segments,
        },
      };
    } finally {
      // Ensure uploaded temp audio file is cleaned up from disk
      TranscriptionService.cleanupTempFile(filePath);
    }
  }

  /**
   * Update or review meeting transcript text.
   */
  static async updateMeetingTranscript(params: {
    meetingId: string;
    workspaceId: string;
    userId: string;
    transcript: string;
  }) {
    const { meetingId, workspaceId, transcript } = params;

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting not found in this workspace.');
    }

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        transcript: transcript ?? '',
      },
      include: {
        workspace: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    return {
      meeting: {
        ...updatedMeeting,
        roomName: this.generateRoomIdentifier(workspaceId, meetingId),
        structuredSummary: this.formatStructuredSummary(updatedMeeting),
      },
    };
  }
}
