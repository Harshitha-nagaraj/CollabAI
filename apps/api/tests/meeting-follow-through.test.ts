/**
 * @file tests/meeting-follow-through.test.ts
 *
 * Test suite for AI Meeting Follow-through:
 * - Non-destructive meeting-task linking (preserves human approval)
 * - Real-time follow-through state and task categorization (pending, in_progress, completed)
 * - Notification follow-up reminders with 24-hour deduplication anti-spam protection
 * - Workspace membership authorization enforcement
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { MeetingService } from '../src/services/meeting.service.js';
import {
  getMeetingFollowThrough,
  sendMeetingFollowUpReminders,
  approveTasks,
} from '../src/controllers/meeting.controller.js';

interface MockResponse {
  statusCode: number;
  data: any;
  status(code: number): MockResponse;
  json(payload: any): MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

describe('AI Meeting Follow-Through & Task Tracking Test Suite', () => {
  let testWorkspace: any;
  let testProject: any;
  let memberUser: any;
  let assigneeUser: any;
  let nonMemberUser: any;
  let testMeeting: any;

  before(async () => {
    const ts = Date.now();

    // 1. Create Workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `Follow-through WS ${ts}`,
        description: 'Workspace for follow-through test suite',
        visibility: 'PRIVATE',
      },
    });

    // 2. Create Users
    memberUser = await prisma.user.create({
      data: {
        email: `ft_host_${ts}@collabai.internal`,
        name: 'FT Host Member',
        password: 'hashed-pw-123',
      },
    });

    assigneeUser = await prisma.user.create({
      data: {
        email: `ft_assignee_${ts}@collabai.internal`,
        name: 'FT Task Assignee',
        password: 'hashed-pw-123',
      },
    });

    nonMemberUser = await prisma.user.create({
      data: {
        email: `ft_outsider_${ts}@collabai.internal`,
        name: 'FT Outsider',
        password: 'hashed-pw-123',
      },
    });

    // 3. Add Memberships
    await prisma.membership.create({
      data: {
        userId: memberUser.id,
        workspaceId: testWorkspace.id,
        role: 'OWNER',
      },
    });

    await prisma.membership.create({
      data: {
        userId: assigneeUser.id,
        workspaceId: testWorkspace.id,
        role: 'MEMBER',
      },
    });

    // 4. Create Project
    testProject = await prisma.project.create({
      data: {
        name: `FT Project ${ts}`,
        workspaceId: testWorkspace.id,
        creatorId: memberUser.id,
      },
    });

    // 5. Create Meeting with AI Action Items proposal
    const sampleActionItems = [
      {
        title: 'Optimize Database Connection Pool',
        description: 'Tune pg pool size and max lifetime',
        priority: 'HIGH',
      },
      {
        title: 'Implement Follow-through Reminders',
        description: 'Add deduplicated follow-up reminders',
        priority: 'MEDIUM',
      },
    ];

    testMeeting = await prisma.meeting.create({
      data: {
        title: `Sprint Review & Follow-Through ${ts}`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        workspaceId: testWorkspace.id,
        creatorId: memberUser.id,
        status: 'PROCESSED',
        actionItems: JSON.stringify(sampleActionItems),
      },
    });
  });

  after(async () => {
    // Cleanup created records safely
    try {
      if (testMeeting?.id) {
        await prisma.meeting.deleteMany({ where: { id: testMeeting.id } });
      }
      if (testProject?.id) {
        await prisma.task.deleteMany({ where: { projectId: testProject.id } });
        await prisma.project.deleteMany({ where: { id: testProject.id } });
      }
      if (testWorkspace?.id) {
        await prisma.notification.deleteMany({ where: { workspaceId: testWorkspace.id } });
        await prisma.membership.deleteMany({ where: { workspaceId: testWorkspace.id } });
        await prisma.workspace.deleteMany({ where: { id: testWorkspace.id } });
      }
      const userIds = [memberUser?.id, assigneeUser?.id, nonMemberUser?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it('1. Returns empty follow-through state before explicit human task approval', async () => {
    const followThrough = await MeetingService.getMeetingFollowThrough(testMeeting.id, testWorkspace.id);
    assert.equal(followThrough.metrics.total, 0);
    assert.equal(followThrough.metrics.completed, 0);
    assert.equal(followThrough.tasks.all.length, 0);
  });

  it('2. Links approved tasks to originating meeting upon explicit human approval', async () => {
    const dueDateTomorrow = new Date(Date.now() + 86400000).toISOString();
    const approvedTasks = await MeetingService.approveTasks({
      meetingId: testMeeting.id,
      workspaceId: testWorkspace.id,
      projectId: testProject.id,
      creatorId: memberUser.id,
      tasks: [
        {
          title: 'Optimize Database Connection Pool',
          description: 'Tune pg pool size and max lifetime',
          priority: 'HIGH',
          assigneeId: assigneeUser.id,
          dueDate: dueDateTomorrow,
        },
        {
          title: 'Implement Follow-through Reminders',
          description: 'Add deduplicated follow-up reminders',
          priority: 'MEDIUM',
          assigneeId: assigneeUser.id,
          dueDate: null,
        },
      ],
    });

    assert.equal(approvedTasks.length, 2);

    // Verify task description includes the originating meeting reference tag
    const createdTask1 = await prisma.task.findUnique({ where: { id: approvedTasks[0].id } });
    assert.ok(createdTask1?.description?.includes(`[MeetingRef: ${testMeeting.id}]`));

    // Verify meeting.actionItems JSON in DB has recorded the taskId and approved status
    const updatedMeeting = await prisma.meeting.findUnique({ where: { id: testMeeting.id } });
    assert.ok(updatedMeeting?.actionItems);
    const parsedActionItems = JSON.parse(updatedMeeting.actionItems!);
    const matchingItem = parsedActionItems.find((i: any) => i.title === 'Optimize Database Connection Pool');
    assert.ok(matchingItem);
    assert.equal(matchingItem.approved, true);
    assert.equal(matchingItem.taskId, approvedTasks[0].id);
  });

  it('3. Groups tasks into pending, in_progress, and completed with accurate metrics', async () => {
    let followThrough = await MeetingService.getMeetingFollowThrough(testMeeting.id, testWorkspace.id);
    assert.equal(followThrough.metrics.total, 2);
    assert.equal(followThrough.metrics.pending, 2);
    assert.equal(followThrough.metrics.inProgress, 0);
    assert.equal(followThrough.metrics.completed, 0);
    assert.equal(followThrough.metrics.completionRate, 0);

    // Update one task to IN_PROGRESS and one to DONE in PostgreSQL
    const allTasks = followThrough.tasks.all;
    await prisma.task.update({
      where: { id: allTasks[0].id },
      data: { status: 'DONE' },
    });
    await prisma.task.update({
      where: { id: allTasks[1].id },
      data: { status: 'IN_PROGRESS' },
    });

    followThrough = await MeetingService.getMeetingFollowThrough(testMeeting.id, testWorkspace.id);
    assert.equal(followThrough.metrics.total, 2);
    assert.equal(followThrough.metrics.completed, 1);
    assert.equal(followThrough.metrics.inProgress, 1);
    assert.equal(followThrough.metrics.pending, 0);
    assert.equal(followThrough.metrics.completionRate, 50);

    assert.equal(followThrough.tasks.completed.length, 1);
    assert.equal(followThrough.tasks.inProgress.length, 1);
    assert.equal(followThrough.tasks.pending.length, 0);
  });

  it('4. Dispatches follow-up reminders and deduplicates within the 24-hour throttle window', async () => {
    // 1st dispatch: Should send reminder for the open task (task 1 is IN_PROGRESS)
    const firstDispatch = await MeetingService.sendFollowUpReminders(
      testMeeting.id,
      testWorkspace.id,
      memberUser.id
    );

    assert.equal(firstDispatch.success, true);
    assert.equal(firstDispatch.sentCount, 1);
    assert.equal(firstDispatch.throttledCount, 0);

    // Verify notification was created in database
    const notifs = await prisma.notification.findMany({
      where: {
        userId: assigneeUser.id,
        workspaceId: testWorkspace.id,
        type: 'MEETING_FOLLOWUP',
      },
    });
    assert.ok(notifs.length >= 1);
    assert.ok(notifs[0].title.includes(testMeeting.title));

    // 2nd dispatch immediately: Should throttle and skip duplicate notification
    const secondDispatch = await MeetingService.sendFollowUpReminders(
      testMeeting.id,
      testWorkspace.id,
      memberUser.id
    );

    assert.equal(secondDispatch.success, true);
    assert.equal(secondDispatch.sentCount, 0);
    assert.equal(secondDispatch.throttledCount, 1);
    assert.ok(secondDispatch.message.includes('within the last 24 hours') || secondDispatch.message.includes('throttle window'));

    // Notification count should remain exactly 1 (no duplicate sent)
    const notifsAfter = await prisma.notification.findMany({
      where: {
        userId: assigneeUser.id,
        workspaceId: testWorkspace.id,
        type: 'MEETING_FOLLOWUP',
      },
    });
    assert.equal(notifsAfter.length, 1);
  });

  it('5. Enforces workspace authorization on getMeetingFollowThrough endpoint', async () => {
    // Non-member request
    const reqNonMember: any = {
      user: { id: nonMemberUser.id },
      params: { id: testMeeting.id },
      query: { workspaceId: testWorkspace.id },
    };
    const resNonMember = createMockResponse();
    await getMeetingFollowThrough(reqNonMember, resNonMember as any);
    assert.equal(resNonMember.statusCode, 403);
    assert.ok(resNonMember.data.error.includes('Access denied'));

    // Member request
    const reqMember: any = {
      user: { id: memberUser.id },
      params: { id: testMeeting.id },
      query: { workspaceId: testWorkspace.id },
    };
    const resMember = createMockResponse();
    await getMeetingFollowThrough(reqMember, resMember as any);
    assert.equal(resMember.statusCode, 200);
    assert.equal(resMember.data.meetingId, testMeeting.id);
    assert.equal(resMember.data.metrics.total, 2);
  });

  it('6. Enforces workspace authorization on sendMeetingFollowUpReminders endpoint', async () => {
    // Non-member request
    const reqNonMember: any = {
      user: { id: nonMemberUser.id },
      params: { id: testMeeting.id },
      body: { workspaceId: testWorkspace.id },
    };
    const resNonMember = createMockResponse();
    await sendMeetingFollowUpReminders(reqNonMember, resNonMember as any);
    assert.equal(resNonMember.statusCode, 403);
    assert.ok(resNonMember.data.error.includes('Access denied'));

    // Member request with missing workspaceId
    const reqMissingWs: any = {
      user: { id: memberUser.id },
      params: { id: testMeeting.id },
      body: {},
    };
    const resMissingWs = createMockResponse();
    await sendMeetingFollowUpReminders(reqMissingWs, resMissingWs as any);
    assert.equal(resMissingWs.statusCode, 400);

    // Authorized member request
    const reqMember: any = {
      user: { id: memberUser.id },
      params: { id: testMeeting.id },
      body: { workspaceId: testWorkspace.id },
    };
    const resMember = createMockResponse();
    await sendMeetingFollowUpReminders(reqMember, resMember as any);
    assert.equal(resMember.statusCode, 200);
    assert.equal(resMember.data.success, true);
  });
});
