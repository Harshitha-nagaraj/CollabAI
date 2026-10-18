/**
 * @file tests/meeting-audit.test.ts
 *
 * Automated tests for Meeting Details, Attendance/Participants, Notes Persistence, and Workspace Authorization.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { MeetingService } from '../src/services/meeting.service.js';

describe('CollabAI Meeting Audit & Completion Test Suite', () => {
  const targetWorkspaceId = '26e49011-e529-42cc-b6c1-4a3af6b9d107'; // Integration Test WS 1791647782654
  const targetMeetingTitle = 'sprint planning';
  let targetMeeting: any;
  let testUser: any;
  let unauthorizedUser: any;
  let unauthorizedWorkspace: any;

  before(async () => {
    // 1. Confirm the target meeting exists in PostgreSQL
    targetMeeting = await prisma.meeting.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        title: { equals: targetMeetingTitle, mode: 'insensitive' },
      },
      include: {
        creator: true,
        workspace: true,
        participants: true,
      },
    });

    assert.ok(targetMeeting, 'Existing "sprint planning" meeting must exist in target workspace');

    // 2. Set up test users for testing join/leave and workspace isolation
    const ts = Date.now();
    testUser = await prisma.user.create({
      data: {
        email: `meeting_test_${ts}@collabai.internal`,
        name: 'Meeting Tester',
        password: 'hashed-password-123',
      },
    });

    // Add testUser as a member of the target workspace
    await prisma.membership.create({
      data: {
        userId: testUser.id,
        workspaceId: targetWorkspaceId,
        role: 'MEMBER',
      },
    });

    // Create unauthorized user in a separate workspace
    unauthorizedUser = await prisma.user.create({
      data: {
        email: `unauthorized_${ts}@collabai.internal`,
        name: 'Unauthorized User',
        password: 'hashed-password-123',
      },
    });

    unauthorizedWorkspace = await prisma.workspace.create({
      data: {
        name: `Isolated WS ${ts}`,
      },
    });

    await prisma.membership.create({
      data: {
        userId: unauthorizedUser.id,
        workspaceId: unauthorizedWorkspace.id,
        role: 'OWNER',
      },
    });
  });

  after(async () => {
    // Clean up test data without touching existing meeting or existing users
    if (testUser) {
      await prisma.document.deleteMany({
        where: { creatorId: testUser.id },
      });
      await prisma.meetingParticipant.deleteMany({
        where: { userId: testUser.id },
      });
      await prisma.membership.deleteMany({
        where: { userId: testUser.id },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }

    if (unauthorizedWorkspace && unauthorizedUser) {
      await prisma.membership.deleteMany({
        where: { workspaceId: unauthorizedWorkspace.id },
      });
      await prisma.workspace.delete({
        where: { id: unauthorizedWorkspace.id },
      });
      await prisma.user.delete({
        where: { id: unauthorizedUser.id },
      });
    }
  });

  describe('1. Meeting Details Verification', () => {
    it('loads title, description, start time, end time, status, workspace, and creator from PostgreSQL', async () => {
      const details = await MeetingService.getMeetingDetails(targetMeeting.id, targetWorkspaceId);
      assert.ok(details, 'Meeting details should be returned');
      assert.equal(details.title.toLowerCase(), 'sprint planning');
      assert.equal(details.status, 'SCHEDULED');
      assert.ok(details.workspace, 'Workspace must be included');
      assert.equal(details.workspace.id, targetWorkspaceId);
      assert.ok(details.creator, 'Creator must be included');
      assert.ok(details.creator.email, 'Creator email must be present');
    });

    it('verifies timestamp matches stored UTC timestamp', () => {
      const storedStartTime = new Date(targetMeeting.startTime);
      const storedEndTime = new Date(targetMeeting.endTime);

      assert.ok(!isNaN(storedStartTime.getTime()), 'Start time must be a valid date');
      assert.ok(!isNaN(storedEndTime.getTime()), 'End time must be a valid date');
      assert.ok(storedEndTime > storedStartTime, 'End time must be after start time');

      // Check ISO string matches UTC representation
      assert.ok(storedStartTime.toISOString().endsWith('Z'), 'Start time ISO string must be UTC formatted');
    });
  });

  describe('2. Attendance & Participants Persistence', () => {
    it('persists a participant record in PostgreSQL when user joins the meeting', async () => {
      const participant = await MeetingService.joinMeeting(targetMeeting.id, testUser.id, targetWorkspaceId);
      assert.ok(participant, 'Participant should be created');
      assert.equal(participant.meetingId, targetMeeting.id);
      assert.equal(participant.userId, testUser.id);

      // Verify directly from PostgreSQL
      const inDb = await prisma.meetingParticipant.findUnique({
        where: {
          userId_meetingId: {
            userId: testUser.id,
            meetingId: targetMeeting.id,
          },
        },
        include: { user: true },
      });

      assert.ok(inDb, 'Participant record must exist in PostgreSQL');
      assert.equal(inDb.user.email, testUser.email);
    });

    it('returns the persistent list of participants for the meeting', async () => {
      const participants = await MeetingService.getMeetingParticipants(targetMeeting.id, targetWorkspaceId);
      assert.ok(Array.isArray(participants), 'Participants must be an array');
      const found = participants.find((p) => p.userId === testUser.id);
      assert.ok(found, 'Test user must appear in participants list');
    });

    it('removes the participant record from PostgreSQL when user leaves the meeting', async () => {
      const result = await MeetingService.leaveMeeting(targetMeeting.id, testUser.id, targetWorkspaceId);
      assert.equal(result.success, true);

      // Verify removed from PostgreSQL
      const inDb = await prisma.meetingParticipant.findUnique({
        where: {
          userId_meetingId: {
            userId: testUser.id,
            meetingId: targetMeeting.id,
          },
        },
      });

      assert.equal(inDb, null, 'Participant record must be deleted from PostgreSQL');
    });
  });

  describe('3. Notes Persistence in PostgreSQL', () => {
    it('persists meeting notes to Meeting.description and creates a Document record in PostgreSQL', async () => {
      const testNotes = `# Sprint Planning Notes (${Date.now()})\n- Review backlog items\n- Finalize auth & meeting pipeline`;
      const result = await MeetingService.updateMeetingNotes(targetMeeting.id, testUser.id, targetWorkspaceId, testNotes);

      assert.ok(result.meeting, 'Updated meeting should be returned');
      assert.equal(result.meeting.description, testNotes);
      assert.ok(result.document, 'Meeting notes document should be created/updated');
      assert.equal(result.document.content, testNotes);
      assert.equal(result.document.type, 'MEETING_NOTES');

      // Verify reload from PostgreSQL
      const reloadedMeeting = await MeetingService.getMeetingDetails(targetMeeting.id, targetWorkspaceId);
      assert.equal(reloadedMeeting?.description, testNotes);

      const reloadedDoc = await prisma.document.findFirst({
        where: {
          meetingId: targetMeeting.id,
          type: 'MEETING_NOTES',
        },
      });
      assert.ok(reloadedDoc, 'Document record must exist in PostgreSQL');
      assert.equal(reloadedDoc.content, testNotes);
    });
  });

  describe('4. Workspace Isolation & Authorization', () => {
    it('blocks access when requesting meeting with wrong workspaceId', async () => {
      const meetingInWrongWs = await MeetingService.getMeetingDetails(targetMeeting.id, unauthorizedWorkspace.id);
      assert.equal(meetingInWrongWs, null, 'Meeting must not be returned if workspaceId does not match');
    });

    it('throws error when trying to join a meeting belonging to another workspace', async () => {
      await assert.rejects(
        async () => {
          await MeetingService.joinMeeting(targetMeeting.id, unauthorizedUser.id, unauthorizedWorkspace.id);
        },
        /Meeting not found in this workspace/
      );
    });

    it('throws error when trying to update notes for a meeting in another workspace', async () => {
      await assert.rejects(
        async () => {
          await MeetingService.updateMeetingNotes(targetMeeting.id, unauthorizedUser.id, unauthorizedWorkspace.id, 'Illegal notes');
        },
        /Meeting not found in this workspace/
      );
    });
  });

  describe('5. Real-Time Conference Room Identifiers & Access Authorization', () => {
    it('generates deterministic and collision-resistant room names from workspaceId and meetingId', () => {
      const room1 = MeetingService.generateRoomIdentifier(targetWorkspaceId, targetMeeting.id);
      const room2 = MeetingService.generateRoomIdentifier(targetWorkspaceId, targetMeeting.id);
      assert.equal(room1, room2, 'Room name must be deterministic for identical workspace and meeting IDs');
      assert.match(room1, /^collabai_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/, 'Room name must be safe for Jitsi Meet URL without special symbols');

      // Different meeting ID must generate different room name
      const roomDiff = MeetingService.generateRoomIdentifier(targetWorkspaceId, 'd4e5f6a7-0000-0000-0000-000000000000');
      assert.notEqual(room1, roomDiff, 'Different meeting ID must generate distinct collision-resistant room name');
    });

    it('returns authorized access parameters including low-resource constraints and privacy notice', async () => {
      const access = await MeetingService.getMeetingAccess(targetMeeting.id, targetWorkspaceId, {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
      });

      assert.equal(access.meetingId, targetMeeting.id);
      assert.equal(access.workspaceId, targetWorkspaceId);
      assert.ok(access.roomName, 'Room name must be present');
      assert.ok(access.domain, 'Jitsi domain must be present');
      assert.equal(access.lowResourceConstraints.resolution, 360, 'Low-resource resolution constraint must be 360p');
      assert.equal(access.lowResourceConstraints.channelLastN, 4, 'Channel lastN must be capped at 4 streams');
      assert.ok(access.privacyNotice, 'Privacy notice regarding public provider limitations must be included');
    });

    it('rejects access when requesting meeting from an unauthorized workspace', async () => {
      await assert.rejects(
        async () => {
          await MeetingService.getMeetingAccess(targetMeeting.id, unauthorizedWorkspace.id, {
            id: unauthorizedUser.id,
            email: unauthorizedUser.email,
          });
        },
        /Meeting not found in this workspace/
      );
    });
  });

  describe('6. Meeting Exit Behaviors: Participant Leave vs Host End Meeting', () => {
    it('leaving a meeting removes participant attendance without marking meeting as ended', async () => {
      // 1. Participant joins
      await MeetingService.joinMeeting(targetMeeting.id, testUser.id, targetWorkspaceId);

      // Verify participant is listed
      let participants = await MeetingService.getMeetingParticipants(targetMeeting.id, targetWorkspaceId);
      assert.ok(participants.some((p: any) => p.userId === testUser.id), 'Test user must be registered as participant');

      // 2. Participant leaves
      const leaveRes = await MeetingService.leaveMeeting(targetMeeting.id, testUser.id, targetWorkspaceId);
      assert.equal(leaveRes.success, true);

      // 3. Verify participant removed
      participants = await MeetingService.getMeetingParticipants(targetMeeting.id, targetWorkspaceId);
      assert.ok(!participants.some((p: any) => p.userId === testUser.id), 'Test user must be removed from participants');

      // 4. Verify meeting itself is still active and NOT marked ended/processed
      const meetingInDb = await prisma.meeting.findUnique({ where: { id: targetMeeting.id } });
      assert.ok(meetingInDb, 'Meeting must still exist in database');
      assert.notEqual(meetingInDb.status, 'COMPLETED', 'Meeting must not be marked as COMPLETED when a participant leaves');
      assert.notEqual(meetingInDb.status, 'PROCESSED', 'Meeting must not be marked as PROCESSED when a participant leaves');
    });

    it('correctly identifies host/creator vs regular participant in access info', async () => {
      // Test user is regular participant (not creator)
      const participantAccess = await MeetingService.getMeetingAccess(targetMeeting.id, targetWorkspaceId, {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
      });
      assert.equal(participantAccess.isHost, false, 'Regular member must not be identified as host');
      assert.equal(participantAccess.creatorId, targetMeeting.creatorId);

      // Meeting creator is identified as host
      const hostAccess = await MeetingService.getMeetingAccess(targetMeeting.id, targetWorkspaceId, {
        id: targetMeeting.creatorId,
        name: 'Actual Host',
        email: 'host@collabai.dev',
      });
      assert.equal(hostAccess.isHost, true, 'Meeting creator must be identified as host');
    });
  });
});
