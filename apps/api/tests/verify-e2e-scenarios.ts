/**
 * @file tests/verify-e2e-scenarios.ts
 *
 * End-to-end verification script for all 10 Phase 1 AI Meeting Intelligence scenarios:
 * 1. Open meeting and add sample meeting notes
 * 2. Generate structured summary
 * 3. Verify overview, discussion points, decisions, questions, action items
 * 4. Verify distinction between notes and transcript
 * 5. Confirm action items not auto-created as tasks
 * 6. Approve action item and verify task created in correct project
 * 7. Verify assignee, priority, and deadline handling
 * 8. Reject approval against a project belonging to another workspace
 * 9. Rehydrate saved summary across page refreshes (GET /meetings/:id)
 * 10. Test empty notes and notes containing decisions but no action items
 */

import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';

const API_BASE = 'http://localhost:4000/api/v1';
const AUTH_HEADER = {
  Authorization: 'Bearer demo-token',
  'Content-Type': 'application/json',
};

async function runE2EVerification() {
  console.log('=== STARTING COLLABAI AI MEETING INTELLIGENCE E2E VERIFICATION ===\n');

  // Setup: Find or create target workspace, user, and project
  const user = await prisma.user.findUnique({
    where: { id: '00000000-0000-0000-0000-000000000001' },
  });
  assert.ok(user, 'Demo user must exist');

  const ts = Date.now();
  const workspace = await prisma.workspace.create({
    data: { name: `E2E Meeting Intelligence WS ${ts}` },
  });

  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  });

  const project = await prisma.project.create({
    data: {
      name: `Core SaaS ${ts}`,
      workspaceId: workspace.id,
      creatorId: user.id,
    },
  });

  // Isolated foreign workspace & project for testing cross-workspace authorization (Scenario 8)
  const foreignWorkspace = await prisma.workspace.create({
    data: { name: `Foreign WS ${ts}` },
  });
  const foreignProject = await prisma.project.create({
    data: {
      name: `Foreign Project ${ts}`,
      workspaceId: foreignWorkspace.id,
      creatorId: user.id,
    },
  });

  const meeting = await prisma.meeting.create({
    data: {
      title: 'Sprint 42 Architecture & Planning',
      description: 'Review database scaling and service refactoring',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      status: 'SCHEDULED',
      workspaceId: workspace.id,
      creatorId: user.id,
    },
  });

  console.log(`[SETUP] Created test workspace (${workspace.id}), meeting (${meeting.id}), and project (${project.id})`);

  try {
    // --------------------------------------------------------------------------
    // SCENARIO 1: Open meeting and add sample meeting notes
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Open meeting and add sample meeting notes ---');
    const sampleNotes = `# Sprint 42 Architecture & Planning Notes
Discussed database optimization and API rate limits.
- Decision: Migrate primary database over the weekend
- Open question: Will connection pooling need adjustment?
- Action: Sarah to prepare migration scripts by 2026-10-25
- Action: Refactor auth service token refresh`;

    const notesRes = await fetch(`${API_BASE}/meetings/${meeting.id}/notes`, {
      method: 'PUT',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        workspaceId: workspace.id,
        notes: sampleNotes,
      }),
    });

    assert.equal(notesRes.status, 200, `Expected 200 OK, got ${notesRes.status}`);
    const notesJson = await notesRes.json();
    const savedNotes = notesJson.document?.content || notesJson.meeting?.description;
    assert.equal(savedNotes, sampleNotes, 'Notes must be saved in database');
    console.log('✔ PASS: Notes successfully saved and persisted via PUT /meetings/:id/notes');

    // --------------------------------------------------------------------------
    // SCENARIO 5 (Check 1): Count tasks before AI processing
    // --------------------------------------------------------------------------
    const taskCountBeforeAI = await prisma.task.count({
      where: { workspaceId: workspace.id },
    });
    console.log(`[CHECK] Tasks in workspace before AI processing: ${taskCountBeforeAI}`);

    // --------------------------------------------------------------------------
    // SCENARIO 2: Generate the structured summary
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Generate the structured summary ---');
    const endRes = await fetch(`${API_BASE}/meetings/${meeting.id}/process`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        workspaceId: workspace.id,
        notes: sampleNotes,
      }),
    });

    assert.equal(endRes.status, 200, `Expected 200 OK, got ${endRes.status}`);
    const endJson = await endRes.json();
    assert.ok(endJson.structuredSummary, 'Response must include structuredSummary');
    console.log('✔ PASS: Meeting ended and structured intelligence generated');

    // --------------------------------------------------------------------------
    // SCENARIO 3: Verify overview, discussion points, decisions, questions, action items
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Verify structured summary components ---');
    const s = endJson.structuredSummary;
    console.log('  Overview:', s.overview);
    console.log('  Discussion Points:', s.keyDiscussionPoints);
    console.log('  Key Decisions:', s.keyDecisions);
    console.log('  Unresolved Questions:', s.pendingQuestions || s.unresolvedQuestions);
    console.log('  Action Items:', s.actionItems?.map((a: any) => `${a.title} [Assignee: ${a.assignee || 'None'}, Due: ${a.dueDate || 'None'}]`));

    assert.ok(s.overview && s.overview.length > 10, 'Overview must be non-empty');
    assert.ok(Array.isArray(s.keyDiscussionPoints), 'Key discussion points must be an array');
    assert.ok(Array.isArray(s.keyDecisions) && s.keyDecisions.length > 0, 'Key decisions must be extracted');
    assert.ok(
      s.keyDecisions.some((d: string) => d.toLowerCase().includes('migrate primary database')),
      'Decision about database migration must be captured'
    );

    const questions = s.unresolvedQuestions || s.pendingQuestions || [];
    assert.ok(
      questions.some((q: string) => q.toLowerCase().includes('connection pooling')),
      'Question about connection pooling must be captured'
    );

    assert.ok(Array.isArray(s.actionItems) && s.actionItems.length === 2, `Expected 2 action items, got ${s.actionItems?.length}`);
    console.log('✔ PASS: Overview, discussion points, decisions, questions, and action items all verified');

    // --------------------------------------------------------------------------
    // SCENARIO 4: Verify UI clearly distinguishes meeting notes from actual transcript
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Verify source distinction (Meeting Notes vs Transcript) ---');
    assert.equal(s.source, 'Meeting Notes', 'Source must strictly be "Meeting Notes"');
    console.log('  Source label returned:', s.source);
    console.log('  UI Badge: "Source: Meeting Notes" (Derived strictly from collaborative notes recorded during the meeting)');
    console.log('✔ PASS: Source is strictly labeled as Meeting Notes and does not pretend audio was transcribed');

    // --------------------------------------------------------------------------
    // SCENARIO 5 (Check 2): Confirm proposed action items are NOT automatically created as tasks
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Confirm proposed action items NOT auto-created ---');
    const taskCountAfterAI = await prisma.task.count({
      where: { workspaceId: workspace.id },
    });
    console.log(`  Tasks in workspace after AI generation: ${taskCountAfterAI}`);
    assert.equal(taskCountAfterAI, taskCountBeforeAI, 'Task count must not increase after AI summary generation');
    console.log('✔ PASS: 0 tasks auto-created. Human review strictly required before Kanban creation');

    // --------------------------------------------------------------------------
    // SCENARIO 6 & 7: Approve an action item and verify task creation, assignee, priority, deadline
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 6 & 7: Approve action item and verify task, assignee, priority, deadline ---');
    const taskToApprove = s.actionItems[0];
    const approveRes = await fetch(`${API_BASE}/meetings/${meeting.id}/approve-tasks`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        workspaceId: workspace.id,
        projectId: project.id,
        tasks: [
          {
            title: taskToApprove.title,
            description: taskToApprove.description,
            priority: 'HIGH',
            assigneeId: user.id,
            dueDate: '2026-10-25',
          },
        ],
      }),
    });

    assert.equal(approveRes.status, 200, `Expected 200 OK, got ${approveRes.status}`);
    const approveJson = await approveRes.json();
    console.log('  Approval response:', approveJson.message);

    // Verify task in PostgreSQL database
    const dbTask = await prisma.task.findFirst({
      where: { projectId: project.id },
    });

    assert.ok(dbTask, 'Task must exist in database under target project');
    assert.equal(dbTask.projectId, project.id, 'Task projectId must match target project');
    assert.equal(dbTask.assigneeId, user.id, 'Task assigneeId must match approved user');
    assert.equal(dbTask.priority, 'HIGH', 'Task priority must be HIGH');
    assert.equal(dbTask.status, 'TODO', 'Task status must be TODO');
    assert.ok(dbTask.dueDate, 'Task must have a deadline');
    assert.equal(dbTask.dueDate.toISOString().split('T')[0], '2026-10-25', 'Due date must match 2026-10-25');
    console.log(`✔ PASS: Task created with ID ${dbTask.id}, Priority: ${dbTask.priority}, Due: 2026-10-25, Assignee: ${dbTask.assigneeId}`);

    // --------------------------------------------------------------------------
    // SCENARIO 8: Try approving a task against a project belonging to another workspace (Rejected)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Reject task approval against a project in another workspace ---');
    const maliciousRes = await fetch(`${API_BASE}/meetings/${meeting.id}/approve-tasks`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        workspaceId: workspace.id,
        projectId: foreignProject.id, // Project belongs to foreignWorkspace!
        tasks: [
          {
            title: 'Malicious Cross-Workspace Task',
            priority: 'HIGH',
          },
        ],
      }),
    });

    const maliciousJson = await maliciousRes.json();
    console.log(`  Foreign project approval HTTP status: ${maliciousRes.status}`);
    console.log('  Foreign project approval response:', maliciousJson);
    assert.equal(
      maliciousRes.status,
      403,
      `Cross-workspace project approval must return HTTP 403 Forbidden, got ${maliciousRes.status}`
    );
    assert.ok(
      maliciousJson.error.includes('Project does not belong to this workspace'),
      'Error message must indicate project does not belong to workspace'
    );
    const foreignTaskCount = await prisma.task.count({
      where: { projectId: foreignProject.id },
    });
    assert.equal(foreignTaskCount, 0, 'No task must be created in foreign project');
    console.log('✔ PASS: Cross-workspace project task creation was rejected with HTTP 403 Forbidden successfully');

    // --------------------------------------------------------------------------
    // SCENARIO 9: Refresh the page and verify saved summary can be loaded again
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Refresh page and verify saved summary rehydration ---');
    const refreshRes = await fetch(`${API_BASE}/meetings/${meeting.id}?workspaceId=${workspace.id}`, {
      method: 'GET',
      headers: AUTH_HEADER,
    });

    assert.equal(refreshRes.status, 200, `Expected 200 OK, got ${refreshRes.status}`);
    const refreshJson = await refreshRes.json();
    assert.ok(refreshJson.structuredSummary, 'Rehydrated meeting must contain structuredSummary');
    assert.equal(refreshJson.structuredSummary.source, 'Meeting Notes');
    assert.equal(refreshJson.structuredSummary.keyDecisions.length, s.keyDecisions.length);
    assert.equal(refreshJson.structuredSummary.actionItems.length, s.actionItems.length);
    console.log('✔ PASS: Reloaded meeting details returns persisted structured summary across simulated page refresh');

    // --------------------------------------------------------------------------
    // SCENARIO 10: Test empty notes and notes containing decisions but no explicit action items
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 10A: Test empty notes ---');
    const emptyMeeting = await prisma.meeting.create({
      data: {
        title: 'Empty Standup',
        startTime: new Date(),
        endTime: new Date(Date.now() + 1800000),
        status: 'SCHEDULED',
        workspaceId: workspace.id,
        creatorId: user.id,
      },
    });

    const emptyRes = await fetch(`${API_BASE}/meetings/${emptyMeeting.id}/process`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        workspaceId: workspace.id,
        notes: '   ',
      }),
    });

    assert.equal(emptyRes.status, 200);
    const emptyJson = await emptyRes.json();
    assert.equal(emptyJson.structuredSummary.source, 'No content recorded');
    assert.equal(emptyJson.structuredSummary.actionItems.length, 0);
    assert.equal(emptyJson.structuredSummary.keyDecisions.length, 0);
    console.log('✔ PASS 10A: Empty notes handled gracefully with source "No content recorded" and 0 action items');

    console.log('\n--- Scenario 10B: Test notes with decisions but NO action items ---');
    const decisionsMeeting = await prisma.meeting.create({
      data: {
        title: 'Architecture Decision Review',
        startTime: new Date(),
        endTime: new Date(Date.now() + 1800000),
        status: 'SCHEDULED',
        workspaceId: workspace.id,
        creatorId: user.id,
      },
    });

    const decisionsNotes = `# Architecture Review
The team evaluated PostgreSQL 16 performance.
- Decision: Use connection pool size of 25
- Decision: Enable pgvector extension for similarity search
Everything was aligned without new tasks needed.`;

    const decisionsRes = await fetch(`${API_BASE}/meetings/${decisionsMeeting.id}/process`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        workspaceId: workspace.id,
        notes: decisionsNotes,
      }),
    });

    assert.equal(decisionsRes.status, 200);
    const decisionsJson = await decisionsRes.json();
    assert.equal(decisionsJson.structuredSummary.source, 'Meeting Notes');
    assert.equal(decisionsJson.structuredSummary.keyDecisions.length, 2);
    assert.equal(decisionsJson.structuredSummary.actionItems.length, 0);
    console.log('  Decisions captured:', decisionsJson.structuredSummary.keyDecisions);
    console.log('  Action items count:', decisionsJson.structuredSummary.actionItems.length);
    console.log('✔ PASS 10B: Notes with decisions but no action items extracts decisions and produces 0 tasks');

    console.log('\n=== ALL 10 SCENARIOS VERIFIED AND PASSED SUCCESSFULLY ===\n');
  } finally {
    // Clean up created test data
    console.log('[CLEANUP] Cleaning up test workspace and resources...');
    await prisma.task.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.document.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.meetingParticipant.deleteMany({ where: { meeting: { workspaceId: workspace.id } } });
    await prisma.meeting.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.project.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.membership.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.workspace.delete({ where: { id: workspace.id } });

    await prisma.project.deleteMany({ where: { workspaceId: foreignWorkspace.id } });
    await prisma.workspace.delete({ where: { id: foreignWorkspace.id } });
    console.log('[CLEANUP] Done.');
  }
}

runE2EVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('E2E Verification Failed:', err);
    process.exit(1);
  });
