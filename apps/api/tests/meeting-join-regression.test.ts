/**
 * @file tests/meeting-join-regression.test.ts
 *
 * Regression test suite for Meeting Join flow, attendance persistence,
 * workspace membership validation, parameter flexibility, and error response codes.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { joinMeeting, leaveMeeting } from '../src/controllers/meeting.controller.js';
import { MeetingService } from '../src/services/meeting.service.js';

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

describe('Meeting Join Regression & Attendance Test Suite', () => {
  let testWorkspace: any;
  let testMeeting: any;
  let memberUser: any;
  let nonMemberUser: any;

  before(async () => {
    const ts = Date.now();

    // Create test workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `Join Regression WS ${ts}`,
        description: 'Workspace for join meeting regression test',
        visibility: 'PRIVATE',
      },
    });

    // Create member user and non-member user
    memberUser = await prisma.user.create({
      data: {
        email: `join_member_${ts}@collabai.internal`,
        name: 'Join Member User',
        password: 'hashed-password-123',
      },
    });

    nonMemberUser = await prisma.user.create({
      data: {
        email: `join_outsider_${ts}@collabai.internal`,
        name: 'Non Member User',
        password: 'hashed-password-123',
      },
    });

    // Add memberUser to testWorkspace
    await prisma.membership.create({
      data: {
        userId: memberUser.id,
        workspaceId: testWorkspace.id,
        role: 'MEMBER',
      },
    });

    // Create test meeting in testWorkspace
    testMeeting = await prisma.meeting.create({
      data: {
        title: 'Regression Test Sync',
        startTime: new Date(Date.now() + 1000 * 60 * 30),
        endTime: new Date(Date.now() + 1000 * 60 * 90),
        status: 'SCHEDULED',
        type: 'GENERAL',
        workspaceId: testWorkspace.id,
        creatorId: memberUser.id,
      },
    });
  });

  after(async () => {
    // Clean up test records
    if (testMeeting?.id) {
      await prisma.meetingParticipant.deleteMany({ where: { meetingId: testMeeting.id } });
      await prisma.meeting.deleteMany({ where: { id: testMeeting.id } });
    }
    if (testWorkspace?.id) {
      await prisma.membership.deleteMany({ where: { workspaceId: testWorkspace.id } });
      await prisma.workspace.deleteMany({ where: { id: testWorkspace.id } });
    }
    if (memberUser?.id) {
      await prisma.user.deleteMany({ where: { id: memberUser.id } });
    }
    if (nonMemberUser?.id) {
      await prisma.user.deleteMany({ where: { id: nonMemberUser.id } });
    }
  });

  it('1. successfully joins a meeting with workspaceId in body and records attendance in PostgreSQL', async () => {
    const req: any = {
      user: memberUser,
      params: { id: testMeeting.id },
      body: { workspaceId: testWorkspace.id },
      query: {},
    };
    const res = createMockResponse();

    await joinMeeting(req, res as any);

    assert.equal(res.statusCode, 200, 'Should respond with HTTP 200');
    assert.ok(res.data, 'Should return participant object');
    assert.equal(res.data.meetingId, testMeeting.id);
    assert.equal(res.data.userId, memberUser.id);

    // Verify record exists in PostgreSQL
    const inDb = await prisma.meetingParticipant.findUnique({
      where: {
        userId_meetingId: {
          userId: memberUser.id,
          meetingId: testMeeting.id,
        },
      },
    });
    assert.ok(inDb, 'Meeting participant record must exist in PostgreSQL');
  });

  it('2. supports workspaceId passed via query parameter as fallback', async () => {
    // Clear participant first
    await prisma.meetingParticipant.deleteMany({
      where: { userId: memberUser.id, meetingId: testMeeting.id },
    });

    const req: any = {
      user: memberUser,
      params: { id: testMeeting.id },
      body: {}, // empty body
      query: { workspaceId: testWorkspace.id }, // in query
    };
    const res = createMockResponse();

    await joinMeeting(req, res as any);

    assert.equal(res.statusCode, 200, 'Should succeed with workspaceId from query');
    assert.equal(res.data.meetingId, testMeeting.id);
    assert.equal(res.data.userId, memberUser.id);
  });

  it('3. rejects join request with HTTP 400 when workspaceId is missing', async () => {
    const req: any = {
      user: memberUser,
      params: { id: testMeeting.id },
      body: {},
      query: {},
    };
    const res = createMockResponse();

    await joinMeeting(req, res as any);

    assert.equal(res.statusCode, 400, 'Should return 400 Bad Request');
    assert.ok(res.data.error.includes('workspaceId is required'), 'Should state workspaceId is required');
  });

  it('4. rejects join request with HTTP 403 when user is not a member of the workspace', async () => {
    const req: any = {
      user: nonMemberUser,
      params: { id: testMeeting.id },
      body: { workspaceId: testWorkspace.id },
      query: {},
    };
    const res = createMockResponse();

    await joinMeeting(req, res as any);

    assert.equal(res.statusCode, 403, 'Should return 403 Forbidden for non-members');
    assert.ok(res.data.error.includes('Access denied'), 'Should state access is denied');
  });

  it('5. returns HTTP 404 when meeting does not exist in the specified workspace', async () => {
    const req: any = {
      user: memberUser,
      params: { id: '00000000-0000-0000-0000-000000000000' },
      body: { workspaceId: testWorkspace.id },
      query: {},
    };
    const res = createMockResponse();

    await joinMeeting(req, res as any);

    assert.equal(res.statusCode, 404, 'Should return 404 Not Found');
    assert.ok(res.data.error.includes('not found'), 'Should indicate meeting not found');
  });

  it('6. successfully leaves meeting and removes participant record from PostgreSQL', async () => {
    // Ensure joined
    await MeetingService.joinMeeting(testMeeting.id, memberUser.id, testWorkspace.id);

    const req: any = {
      user: memberUser,
      params: { id: testMeeting.id },
      body: { workspaceId: testWorkspace.id },
      query: {},
    };
    const res = createMockResponse();

    await leaveMeeting(req, res as any);

    assert.equal(res.statusCode, 200, 'Should respond with 200 on leave');
    assert.equal(res.data.success, true);

    const inDb = await prisma.meetingParticipant.findUnique({
      where: {
        userId_meetingId: {
          userId: memberUser.id,
          meetingId: testMeeting.id,
        },
      },
    });
    assert.equal(inDb, null, 'Participant record should be deleted from PostgreSQL');
  });

  it('7. allows user to rejoin meeting after leaving (idempotent / upsert)', async () => {
    const req: any = {
      user: memberUser,
      params: { id: testMeeting.id },
      body: { workspaceId: testWorkspace.id },
      query: {},
    };
    const res = createMockResponse();

    await joinMeeting(req, res as any);

    assert.equal(res.statusCode, 200, 'Should re-join successfully');
    const inDb = await prisma.meetingParticipant.findUnique({
      where: {
        userId_meetingId: {
          userId: memberUser.id,
          meetingId: testMeeting.id,
        },
      },
    });
    assert.ok(inDb, 'Participant record should exist after re-join');
  });
});
