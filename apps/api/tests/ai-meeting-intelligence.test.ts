/**
 * @file tests/ai-meeting-intelligence.test.ts
 *
 * Tests for Phase 1 AI Meeting Intelligence:
 * - Structured meeting summary generation (Overview, Discussion points, Decisions, Unresolved questions, Action items)
 * - Source labeling (notes labeled as 'Meeting Notes', no fake live audio transcript)
 * - Action item extraction with workspace member matching and explicit deadline detection
 * - Human-in-the-loop task approval workflow (no auto-creation without user confirmation)
 * - Summary persistence and rehydration across page refreshes
 * - Project and workspace authorization enforcement
 * - Graceful handling of empty content
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { MeetingService } from '../src/services/meeting.service.js';
import { MeetingIntelligenceService } from '../src/ai/services/meeting-intelligence.service.js';

describe('Phase 1 AI Meeting Intelligence Test Suite', () => {
  let testWorkspace: any;
  let unauthorizedWorkspace: any;
  let testProject: any;
  let unauthorizedProject: any;
  let testUser: any;
  let teammateUser: any;
  let testMeeting: any;

  before(async () => {
    const ts = Date.now();

    // 1. Create primary test workspace and members
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `AI Intelligence Test WS ${ts}`,
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: `lead_${ts}@collabai.internal`,
        name: 'Sarah Connor',
        password: 'hashed-password-123',
      },
    });

    teammateUser = await prisma.user.create({
      data: {
        email: `eng_${ts}@collabai.internal`,
        name: 'John Connor',
        password: 'hashed-password-123',
      },
    });

    await prisma.membership.createMany({
      data: [
        { userId: testUser.id, workspaceId: testWorkspace.id, role: 'OWNER' },
        { userId: teammateUser.id, workspaceId: testWorkspace.id, role: 'MEMBER' },
      ],
    });

    testProject = await prisma.project.create({
      data: {
        name: 'Core Platform',
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    testMeeting = await prisma.meeting.create({
      data: {
        title: 'Weekly Engineering Sync',
        description: 'Discuss sprint progress and blockers',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        status: 'SCHEDULED',
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    // 2. Create an unauthorized isolated workspace and project
    unauthorizedWorkspace = await prisma.workspace.create({
      data: {
        name: `Unauthorized WS ${ts}`,
      },
    });

    unauthorizedProject = await prisma.project.create({
      data: {
        name: 'Secret Project',
        workspaceId: unauthorizedWorkspace.id,
        creatorId: testUser.id,
      },
    });
  });

  after(async () => {
    // Clean up created records
    if (testMeeting?.id) {
      await prisma.task.deleteMany({ where: { workspaceId: testWorkspace.id } });
      await prisma.document.deleteMany({ where: { workspaceId: testWorkspace.id } });
      await prisma.meetingParticipant.deleteMany({ where: { meetingId: testMeeting.id } });
      await prisma.meeting.delete({ where: { id: testMeeting.id } });
    }

    if (testProject?.id) {
      await prisma.project.delete({ where: { id: testProject.id } });
    }

    if (unauthorizedProject?.id) {
      await prisma.project.delete({ where: { id: unauthorizedProject.id } });
    }

    if (testWorkspace?.id) {
      await prisma.membership.deleteMany({ where: { workspaceId: testWorkspace.id } });
      await prisma.workspace.delete({ where: { id: testWorkspace.id } });
    }

    if (unauthorizedWorkspace?.id) {
      await prisma.workspace.delete({ where: { id: unauthorizedWorkspace.id } });
    }

    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    if (teammateUser?.id) {
      await prisma.user.delete({ where: { id: teammateUser.id } });
    }
  });

  describe('1. Intelligence Extraction & Source Fidelity', () => {
    it('labels notes-only input as "Meeting Notes" and does not invent transcript', async () => {
      const sampleNotes = `
# Engineering Sync Notes
We discussed migrating the database to PostgreSQL 16.
- Decision: Migrate primary database over the weekend
- Open question: Will connection pooling need adjustment?
- Action: Sarah Connor to prepare migration scripts by 2026-10-25
- Action: Refactor auth service token refresh
`;

      const result = await MeetingIntelligenceService.generateMeetingIntelligence({
        meetingId: testMeeting.id,
        workspaceId: testWorkspace.id,
        notes: sampleNotes,
        workspaceMembers: [
          { id: testUser.id, name: 'Sarah Connor' },
          { id: teammateUser.id, name: 'John Connor' },
        ],
      });

      // Requirement 1 & 2: Structured summary and strict source labeling
      assert.equal(result.source, 'Meeting Notes', 'Source must be accurately labeled as Meeting Notes');
      assert.ok(result.overview, 'Overview must be generated');
      assert.ok(Array.isArray(result.keyDiscussionPoints), 'Key discussion points must be an array');
      assert.ok(result.keyDiscussionPoints.length > 0, 'Should extract discussion points');
      assert.ok(Array.isArray(result.keyDecisions), 'Key decisions must be an array');
      assert.ok(result.keyDecisions.length > 0, 'Should extract decisions');
      assert.ok(
        result.keyDecisions.some((d) => d.toLowerCase().includes('migrate primary database')),
        'Extracted decision must match notes content'
      );

      // Unresolved questions
      const questions = result.unresolvedQuestions || result.pendingQuestions || [];
      assert.ok(
        questions.some((q) => q.toLowerCase().includes('connection pooling')),
        'Unresolved question must be captured from notes'
      );

      // Requirement 3: Action item extraction
      assert.ok(Array.isArray(result.actionItems), 'Action items must be an array');
      assert.equal(result.actionItems.length, 2, 'Should extract exactly 2 action items');

      const sarahTask = result.actionItems.find((a) => a.title.toLowerCase().includes('prepare migration scripts'));
      assert.ok(sarahTask, 'Should find migration scripts task');
      assert.equal(sarahTask?.suggestedAssigneeId, testUser.id, 'Assignee ID must match Sarah Connor');
      assert.equal(sarahTask?.dueDate, '2026-10-25', 'Explicit deadline 2026-10-25 must be extracted');

      const unassignedTask = result.actionItems.find((a) => a.title.toLowerCase().includes('refactor auth service'));
      assert.ok(unassignedTask, 'Should find unassigned task');
      assert.equal(unassignedTask?.suggestedAssigneeId, null, 'Must not invent assignee when none mentioned');
      assert.equal(unassignedTask?.dueDate, null, 'Must not invent deadline when none mentioned');
    });

    it('handles empty notes gracefully without errors', async () => {
      const result = await MeetingIntelligenceService.generateMeetingIntelligence({
        meetingId: testMeeting.id,
        workspaceId: testWorkspace.id,
        notes: '   ',
      });

      assert.equal(result.source, 'No content recorded');
      assert.ok(result.overview.includes('No meeting notes or transcript recorded'));
      assert.equal(result.actionItems.length, 0);
      assert.equal(result.keyDecisions.length, 0);
    });
  });

  describe('2. Human Review & Task Approval Enforcement', () => {
    it('processMeetingIntelligence does NOT auto-create tasks without human approval', async () => {
      const sampleNotes = `
- Action: John Connor to configure Redis cache
- Action: Sarah Connor to update API documentation
`;

      // Pre-check: 0 tasks in workspace
      const countBefore = await prisma.task.count({
        where: { workspaceId: testWorkspace.id },
      });
      assert.equal(countBefore, 0, 'Should start with 0 tasks');

      // Run intelligence processing
      const processed = await MeetingService.processMeetingIntelligence(
        testMeeting.id,
        testWorkspace.id,
        undefined,
        sampleNotes
      );

      assert.ok(processed.structuredSummary, 'Should return structuredSummary');
      assert.ok(processed.structuredSummary.actionItems.length >= 2, 'Extracted action items should be present');

      // Requirement 4: Verification that tasks are NOT auto-created
      const countAfter = await prisma.task.count({
        where: { workspaceId: testWorkspace.id },
      });
      assert.equal(countAfter, 0, 'Tasks must NOT be auto-created without explicit human approval');
    });

    it('rejects task approval when projectId does not belong to the workspace', async () => {
      await assert.rejects(
        async () => {
          await MeetingService.approveTasks({
            meetingId: testMeeting.id,
            workspaceId: testWorkspace.id,
            projectId: unauthorizedProject.id, // Project from another workspace
            creatorId: testUser.id,
            tasks: [
              {
                title: 'Malicious Cross-Workspace Task',
                description: 'Should be rejected',
                priority: 'HIGH',
              },
            ],
          });
        },
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.ok(err.message.includes('Project does not belong to this workspace'));
          return true;
        }
      );
    });

    it('creates approved tasks in database upon explicit human confirmation', async () => {
      const approvalResult = await MeetingService.approveTasks({
        meetingId: testMeeting.id,
        workspaceId: testWorkspace.id,
        projectId: testProject.id,
        creatorId: testUser.id,
        tasks: [
          {
            title: 'Prepare migration scripts',
            description: 'Run automated DB migrations safely',
            priority: 'HIGH',
            assigneeId: testUser.id,
            dueDate: '2026-10-25',
          },
          {
            title: 'Refactor auth service token refresh',
            description: 'Improve JWT expiry handling',
            priority: 'MEDIUM',
          },
        ],
      });

      assert.equal(Array.isArray(approvalResult), true);
      assert.equal(approvalResult.length, 2);

      // Verify tasks exist in PostgreSQL database
      const createdTasks = await prisma.task.findMany({
        where: { workspaceId: testWorkspace.id },
        orderBy: { createdAt: 'asc' },
      });

      assert.equal(createdTasks.length, 2, 'Exactly 2 approved tasks should be created in DB');
      assert.equal(createdTasks[0]?.title, 'Prepare migration scripts');
      assert.equal(createdTasks[0]?.assigneeId, testUser.id);
      assert.equal(createdTasks[0]?.priority, 'HIGH');
      assert.equal(createdTasks[0]?.status, 'TODO');
      assert.ok(createdTasks[0]?.dueDate, 'Due date must be set');

      assert.equal(createdTasks[1]?.title, 'Refactor auth service token refresh');
      assert.equal(createdTasks[1]?.assigneeId, null, 'Second task has no assignee');
    });
  });

  describe('3. Persistence & Rehydration across Page Refreshes', () => {
    it('persists summary in Meeting and Document models and rehydrates via getMeetingDetails', async () => {
      // Fetch meeting details (simulating page refresh / GET /meetings/:id)
      const details = await MeetingService.getMeetingDetails(testMeeting.id, testWorkspace.id);

      assert.ok(details.summary, 'Summary text must be persisted in database');
      assert.ok(details.structuredSummary, 'structuredSummary must be returned by getMeetingDetails');
      assert.equal(details.structuredSummary.source, 'Meeting Notes');
      assert.ok(details.structuredSummary.overview, 'Overview must be rehydrated');
      assert.ok(Array.isArray(details.structuredSummary.keyDiscussionPoints), 'Discussion points must be rehydrated');
      assert.ok(Array.isArray(details.structuredSummary.keyDecisions), 'Decisions must be rehydrated');
      assert.ok(Array.isArray(details.structuredSummary.actionItems), 'Action items must be rehydrated');

      // Verify audit document exists in database
      const auditDoc = await prisma.document.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          title: { contains: testMeeting.title },
        },
      });
      assert.ok(auditDoc, 'Meeting summary Document must be persisted for audit trail');
      assert.ok(
        auditDoc.content.includes('Meeting Notes') || auditDoc.content.includes('Overview'),
        'Document must contain summary content'
      );
    });
  });
});
