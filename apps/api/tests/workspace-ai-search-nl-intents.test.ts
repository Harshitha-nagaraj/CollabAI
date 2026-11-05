/**
 * @file tests/workspace-ai-search-nl-intents.test.ts
 *
 * Test suite verifying natural-language intent recognition and domain-aware retrieval:
 * 1. "Show me all overdue tasks."
 * 2. "What tasks are currently delayed?"
 * 3. "Which projects have blockers?"
 * 4. "What decisions were made in the latest meeting?"
 * 5. "Find discussions about payment integration."
 * 6. "Who is responsible for the authentication module?"
 * 7. "Show me tasks that are still incomplete."
 * 8. "What is happening in this project?"
 * 9. Exact keyword search preservation
 * 10. Insufficient information handling for irrelevant queries
 * 11. Strict cross-workspace isolation
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { SearchEngine, INSUFFICIENT_INFORMATION_MESSAGE } from '../src/ai/services/search-engine.js';
import { aiSearch } from '../src/controllers/ai.controller.js';
import { TaskStatus, Priority, Role } from '@prisma/client';

describe('Workspace AI Search - Natural Language Intents Suite', () => {
  const ts = Date.now();
  let aliceUser: any;
  let bobLead: any;
  let intruderUser: any;

  let workspaceAlpha: any;
  let workspaceGamma: any;

  let projectAlpha: any;
  let projectGamma: any;

  let overdueTask: any;
  let authTask: any;
  let completedTask: any;
  let blockedTask: any;
  let paymentComment: any;
  let latestMeeting: any;
  let authDecision: any;
  let paymentDoc: any;

  let gammaTask: any;

  before(async () => {
    // 1. Users
    aliceUser = await prisma.user.create({
      data: {
        email: `alice_${ts}@collabai.internal`,
        name: 'Alice Engineer',
        password: 'hashed-password-123',
      },
    });

    bobLead = await prisma.user.create({
      data: {
        email: `bob_${ts}@collabai.internal`,
        name: 'Bob Lead',
        password: 'hashed-password-123',
      },
    });

    intruderUser = await prisma.user.create({
      data: {
        email: `intruder_${ts}@collabai.internal`,
        name: 'Intruder User',
        password: 'hashed-password-123',
      },
    });

    // 2. Workspaces
    workspaceAlpha = await prisma.workspace.create({
      data: {
        name: `Alpha Workspace ${ts}`,
      },
    });

    workspaceGamma = await prisma.workspace.create({
      data: {
        name: `Gamma Isolated Workspace ${ts}`,
      },
    });

    // 3. Memberships
    await prisma.membership.create({
      data: {
        userId: aliceUser.id,
        workspaceId: workspaceAlpha.id,
        role: Role.ADMIN,
      },
    });

    await prisma.membership.create({
      data: {
        userId: bobLead.id,
        workspaceId: workspaceAlpha.id,
        role: Role.MEMBER,
      },
    });

    await prisma.membership.create({
      data: {
        userId: intruderUser.id,
        workspaceId: workspaceGamma.id,
        role: Role.OWNER,
      },
    });

    // 4. Projects
    projectAlpha = await prisma.project.create({
      data: {
        name: `Core Commerce Services ${ts}`,
        description: 'Payment gateway and checkout pipeline services',
        workspaceId: workspaceAlpha.id,
        creatorId: aliceUser.id,
      },
    });

    projectGamma = await prisma.project.create({
      data: {
        name: `Gamma Isolated Defense ${ts}`,
        description: 'Restricted security vault',
        workspaceId: workspaceGamma.id,
        creatorId: intruderUser.id,
      },
    });

    // 5. Tasks in Alpha
    // 5a. Overdue / delayed task
    overdueTask = await prisma.task.create({
      data: {
        title: 'Stripe Payment Gateway Integration',
        description: 'Integrate Stripe API with 3D Secure verification',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: new Date(Date.now() - 4 * 86400000), // 4 days ago
        workspaceId: workspaceAlpha.id,
        projectId: projectAlpha.id,
        creatorId: aliceUser.id,
        assigneeId: aliceUser.id,
      },
    });

    // 5b. Task comment discussing payment integration & blocker
    paymentComment = await prisma.taskComment.create({
      data: {
        taskId: overdueTask.id,
        authorId: aliceUser.id,
        content: 'Payment integration discussion: waiting for merchant webhook credentials from billing partner.',
      },
    });

    // 5c. Auth task assigned to Bob
    authTask = await prisma.task.create({
      data: {
        title: 'Authentication Module Refactor',
        description: 'Implement secure JWT refresh token rotation for authentication module',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: new Date(Date.now() + 5 * 86400000), // Incomplete, future due date
        workspaceId: workspaceAlpha.id,
        projectId: projectAlpha.id,
        creatorId: aliceUser.id,
        assigneeId: bobLead.id,
      },
    });

    // 5d. Blocked task
    blockedTask = await prisma.task.create({
      data: {
        title: 'PCI Compliance Security Audit',
        description: 'Critical blocker on certificate authority chain verification',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        dueDate: new Date(Date.now() + 2 * 86400000),
        workspaceId: workspaceAlpha.id,
        projectId: projectAlpha.id,
        creatorId: bobLead.id,
        assigneeId: bobLead.id,
      },
    });

    // 5e. Completed task
    completedTask = await prisma.task.create({
      data: {
        title: 'Setup Database Connection Pool',
        description: 'Configured pgpool with max 20 connections',
        status: TaskStatus.DONE,
        priority: Priority.LOW,
        dueDate: new Date(Date.now() - 10 * 86400000),
        workspaceId: workspaceAlpha.id,
        projectId: projectAlpha.id,
        creatorId: aliceUser.id,
        assigneeId: aliceUser.id,
      },
    });

    // 6. Meeting in Alpha
    latestMeeting = await prisma.meeting.create({
      data: {
        title: 'Sprint 14 Architecture Sync',
        description: 'Review of payment and auth architecture',
        summary: 'Finalized decisions on identity provider and payment gateway fallback.',
        decisions: 'Enforce PKCE for mobile auth. Use Stripe webhook signature verification.',
        transcript: 'Alice: We have resolved the payment architecture discussion. Bob: Auth module is on track.',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 86400000 + 3600000),
        workspaceId: workspaceAlpha.id,
        creatorId: aliceUser.id,
      },
    });

    // 7. Decision in Alpha
    authDecision = await prisma.decision.create({
      data: {
        title: 'Select PKCE for Mobile Authentication Module',
        description: 'Decided to mandate OAuth 2.1 PKCE for all authentication module clients.',
        category: 'SECURITY',
        type: 'DECISION',
        status: 'APPROVED',
        workspaceId: workspaceAlpha.id,
        projectId: projectAlpha.id,
        meetingId: latestMeeting.id,
        decidedById: bobLead.id,
      },
    });

    // 8. Document in Alpha
    paymentDoc = await prisma.document.create({
      data: {
        title: 'Payment Integration Specifications',
        content: 'Architectural discussions and guidelines for third-party payment integration gateways.',
        type: 'SPECIFICATION',
        workspaceId: workspaceAlpha.id,
        projectId: projectAlpha.id,
        creatorId: aliceUser.id,
      },
    });

    // 9. Gamma Task (isolated tenant)
    gammaTask = await prisma.task.create({
      data: {
        title: 'Confidential Gamma Vault Access',
        description: 'Strictly restricted to Gamma workspace',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        workspaceId: workspaceGamma.id,
        projectId: projectGamma.id,
        creatorId: intruderUser.id,
      },
    });
  });

  after(async () => {
    // Cleanup
    await prisma.taskComment.deleteMany({
      where: { taskId: { in: [overdueTask?.id, authTask?.id, blockedTask?.id, completedTask?.id, gammaTask?.id] } },
    });
    await prisma.decision.deleteMany({
      where: { workspaceId: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.document.deleteMany({
      where: { workspaceId: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.meeting.deleteMany({
      where: { workspaceId: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.task.deleteMany({
      where: { workspaceId: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.project.deleteMany({
      where: { workspaceId: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.membership.deleteMany({
      where: { workspaceId: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceAlpha?.id, workspaceGamma?.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [aliceUser?.id, bobLead?.id, intruderUser?.id] } },
    });
  });

  // 1. "Show me all overdue tasks."
  it('1. Intent: "Show me all overdue tasks." retrieves actual overdue tasks using dueDate < now', async () => {
    const response = await SearchEngine.search('Show me all overdue tasks.', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0, 'No results returned for overdue query');
    const taskResult = response.results.find((r) => r.type === 'task' && r.id === overdueTask.id);
    assert.ok(taskResult, 'Overdue task was not retrieved');
    assert.equal(taskResult.metadata.status, 'IN_PROGRESS');
    assert.ok(response.answer.includes('Stripe Payment Gateway Integration'));
    assert.ok(response.inferences.some((inf) => inf.toLowerCase().includes('overdue')));
  });

  // 2. "What tasks are currently delayed?"
  it('2. Intent: "What tasks are currently delayed?" retrieves delayed and overdue tasks', async () => {
    const response = await SearchEngine.search('What tasks are currently delayed?', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    const taskResult = response.results.find((r) => r.id === overdueTask.id);
    assert.ok(taskResult, 'Delayed task was not found');
    assert.ok(response.answer.toLowerCase().includes('delayed') || response.answer.toLowerCase().includes('overdue'));
  });

  // 3. "Which projects have blockers?"
  it('3. Intent: "Which projects have blockers?" identifies projects with blocked tasks or blocker comments', async () => {
    const response = await SearchEngine.search('Which projects have blockers?', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    // Should retrieve blocked task or project
    const hasBlockedEvidence = response.results.some(
      (r) => r.id === blockedTask.id || r.id === projectAlpha.id || r.id === paymentComment.id
    );
    assert.ok(hasBlockedEvidence, 'No blocker evidence was retrieved');
    assert.ok(response.answer.toLowerCase().includes('block'));
  });

  // 4. "What decisions were made in the latest meeting?"
  it('4. Intent: "What decisions were made in the latest meeting?" retrieves meeting decisions', async () => {
    const response = await SearchEngine.search('What decisions were made in the latest meeting?', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    const meetingOrDecision = response.results.some(
      (r) => r.id === latestMeeting.id || r.id === authDecision.id
    );
    assert.ok(meetingOrDecision, 'Latest meeting or decision was not found');
    assert.ok(response.answer.includes('PKCE') || response.answer.includes('Stripe') || response.answer.includes('Sprint 14'));
  });

  // 5. "Find discussions about payment integration."
  it('5. Intent: "Find discussions about payment integration." retrieves comments and documents', async () => {
    const response = await SearchEngine.search('Find discussions about payment integration.', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    const hasPaymentDiscussion = response.results.some(
      (r) => r.id === paymentComment.id || r.id === paymentDoc.id || r.id === overdueTask.id
    );
    assert.ok(hasPaymentDiscussion, 'Payment integration discussion was not retrieved');
  });

  // 6. "Who is responsible for the authentication module?"
  it('6. Intent: "Who is responsible for the authentication module?" identifies Bob Lead as assignee/owner', async () => {
    const response = await SearchEngine.search('Who is responsible for the authentication module?', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    const authResult = response.results.find((r) => r.id === authTask.id || r.id === authDecision.id);
    assert.ok(authResult, 'Authentication module record was not retrieved');
    assert.ok(response.answer.includes('Bob Lead'), 'Answer did not identify Bob Lead as responsible');
  });

  // 7. "Show me tasks that are still incomplete."
  it('7. Intent: "Show me tasks that are still incomplete." retrieves TODO and IN_PROGRESS tasks', async () => {
    const response = await SearchEngine.search('Show me tasks that are still incomplete.', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    const retrievedTaskIds = response.results.filter((r) => r.type === 'task').map((r) => r.id);
    assert.ok(retrievedTaskIds.includes(overdueTask.id), 'Incomplete task (IN_PROGRESS) was missing');
    assert.ok(retrievedTaskIds.includes(authTask.id), 'Incomplete task (TODO) was missing');
    assert.ok(!retrievedTaskIds.includes(completedTask.id), 'Completed task (DONE) was improperly included');
  });

  // 8. "What is happening in this project?"
  it('8. Intent: "What is happening in this project?" retrieves recent project activity across tasks and meetings', async () => {
    const response = await SearchEngine.search('What is happening in this project?', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    const hasActivity = response.results.some(
      (r) => r.type === 'project' || r.type === 'task' || r.type === 'meeting'
    );
    assert.ok(hasActivity, 'No project activity retrieved');
    assert.ok(response.facts.length > 0);
  });

  // 9. Exact keyword search preservation
  it('9. Preserves exact keyword search functionality for specific queries', async () => {
    const response = await SearchEngine.search('Stripe Payment Gateway Integration', workspaceAlpha.id);

    assert.equal(response.isGrounded, true);
    assert.ok(response.results.length > 0);
    const taskResult = response.results.find((r) => r.id === overdueTask.id);
    assert.ok(taskResult, 'Exact keyword query failed to find task');
    assert.ok(taskResult.relevance >= 50, `Relevance score was too low: ${taskResult.relevance}`);
  });

  // 10. Insufficient information handling
  it('10. Returns honest insufficient information response when no matching records exist', async () => {
    const response = await SearchEngine.search('How do we cook gourmet french onion soup?', workspaceAlpha.id);

    assert.equal(response.isGrounded, false);
    assert.equal(response.answer, INSUFFICIENT_INFORMATION_MESSAGE);
    assert.equal(response.results.length, 0);
    assert.equal(response.sources.length, 0);
  });

  // 11. Cross-workspace isolation
  it('11. Strictly isolates workspaces: Alpha query NEVER returns Gamma records', async () => {
    const response = await SearchEngine.search('Confidential Gamma Vault Access', workspaceAlpha.id);

    assert.equal(response.isGrounded, false);
    assert.equal(response.answer, INSUFFICIENT_INFORMATION_MESSAGE);
    const hasGammaLeak = response.results.some((r) => r.id === gammaTask.id);
    assert.equal(hasGammaLeak, false, 'Gamma record leaked into Alpha workspace search results');
  });

  // 12. Controller security check
  it('12. AI search controller denies unauthorized non-member access with 403 Forbidden', async () => {
    let statusCode: number | null = null;
    let jsonResponse: any = null;

    const fakeReq: any = {
      user: { id: intruderUser.id },
      body: {
        workspaceId: workspaceAlpha.id,
        query: 'Show me all overdue tasks.',
      },
    };

    const fakeRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      },
    };

    await aiSearch(fakeReq, fakeRes);

    assert.equal(statusCode, 403);
    assert.equal(
      jsonResponse?.error,
      'Not a member of this workspace. You do not have access to this workspace'
    );
  });
});
