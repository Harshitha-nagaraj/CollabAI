/**
 * @file tests/workspace-ai-search.test.ts
 *
 * Automated regression test suite for Workspace AI Search:
 * 1. Security & Workspace Membership Authorization (403 Forbidden for non-members)
 * 2. Cross-workspace isolation (zero leakage of records from other workspaces)
 * 3. Unified retrieval across all 6 supported resource types:
 *    - Tasks
 *    - Task Comments
 *    - Projects
 *    - Meetings (summaries, decisions, windowed transcript snippets)
 *    - Dedicated Decisions
 *    - Documents
 * 4. Grounded answer synthesis (distinguishing facts from inferences, strictly factual)
 * 5. Insufficient information handling ("The available records in this workspace do not contain enough information to answer this question.")
 * 6. Elimination of fictional fallback ("Rahul Sharma" / PostgreSQL migration)
 * 7. Source citations with valid deep links and lexical relevance scores
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { SearchEngine, INSUFFICIENT_INFORMATION_MESSAGE } from '../src/ai/services/search-engine.js';
import { SemanticSearchEngine } from '../src/ai/services/semantic-search.service.js';
import { KnowledgeService } from '../src/services/knowledge.service.js';
import {
  getDecisions,
  createDecision,
  extractDecisions,
  semanticSearch,
  getKnowledgeTimeline,
  getContextAssistant,
} from '../src/controllers/knowledge.controller.js';
import { aiSearch } from '../src/controllers/ai.controller.js';
import { TaskStatus, Priority, Role } from '@prisma/client';

describe('Workspace AI Search Test Suite', () => {
  const ts = Date.now();
  let memberUser: any;
  let nonMemberUser: any;
  let workspaceA: any;
  let workspaceB: any;
  let projectA: any;
  let projectB: any;

  let taskA: any;
  let commentA: any;
  let meetingA: any;
  let decisionA: any;
  let documentA: any;

  let taskB: any;
  let decisionB: any;

  before(async () => {
    // 1. Create test users
    memberUser = await prisma.user.create({
      data: {
        email: `search_member_${ts}@collabai.internal`,
        name: 'Harshitha Member',
        password: 'hashed-password-123',
      },
    });

    nonMemberUser = await prisma.user.create({
      data: {
        email: `search_intruder_${ts}@collabai.internal`,
        name: 'Intruder NonMember',
        password: 'hashed-password-123',
      },
    });

    // 2. Create workspaces
    workspaceA = await prisma.workspace.create({
      data: {
        name: `Authorized Workspace A ${ts}`,
      },
    });

    workspaceB = await prisma.workspace.create({
      data: {
        name: `Isolated Workspace B ${ts}`,
      },
    });

    // 3. Memberships
    await prisma.membership.create({
      data: {
        userId: memberUser.id,
        workspaceId: workspaceA.id,
        role: Role.ADMIN,
      },
    });

    await prisma.membership.create({
      data: {
        userId: nonMemberUser.id,
        workspaceId: workspaceB.id,
        role: Role.OWNER,
      },
    });

    // 4. Create Projects
    projectA = await prisma.project.create({
      data: {
        name: `Mobile Payment Infrastructure ${ts}`,
        description: 'Core microservices backend for mobile payment processing and transactions',
        workspaceId: workspaceA.id,
        creatorId: memberUser.id,
      },
    });

    projectB = await prisma.project.create({
      data: {
        name: `Secret Quantum Project ${ts}`,
        description: 'Confidential research project in workspace B',
        workspaceId: workspaceB.id,
        creatorId: nonMemberUser.id,
      },
    });

    // 5. Seed Entity 1: Task in Workspace A (delayed task for grounding tests)
    taskA = await prisma.task.create({
      data: {
        title: 'Payment Gateway Integration',
        description: 'Integrate payment provider gateway with 3D Secure authentication and webhooks.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: new Date(Date.now() - 3 * 86400000), // 3 days overdue
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        creatorId: memberUser.id,
        assigneeId: memberUser.id,
      },
    });

    // 6. Seed Entity 2: TaskComment in Workspace A
    commentA = await prisma.taskComment.create({
      data: {
        taskId: taskA.id,
        authorId: memberUser.id,
        content: 'Completed TLS 1.3 audit. Waiting for webhook signing secret from payment provider.',
      },
    });

    // 7. Seed Entity 3: Meeting in Workspace A (with windowed transcript)
    meetingA = await prisma.meeting.create({
      data: {
        title: 'Q4 Payment Architecture Sync',
        description: 'Quarterly review of transaction processing architecture',
        summary: 'Reviewed PCI-DSS compliance requirements and decided on distributed tokenization.',
        decisions: 'Adopt distributed tokenization for card numbers. Reject client-side key storage.',
        transcript:
          'Speaker 1: Welcome everyone to the payment sync. Speaker 2: We must address the database encryption protocols before the November deadline. Speaker 1: Agreed, we will enforce AES-256 for all stored cardholder tokens. Let us wrap up the call.',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 86400000 + 3600000),
        workspaceId: workspaceA.id,
        creatorId: memberUser.id,
      },
    });

    // 8. Seed Entity 4: Dedicated Decision in Workspace A
    decisionA = await prisma.decision.create({
      data: {
        title: 'Adopt Distributed Tokenization Vault',
        description: 'Approved zero-trust tokenization vault architecture to eliminate PCI scope from web servers.',
        category: 'SECURITY',
        type: 'DECISION',
        status: 'APPROVED',
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        meetingId: meetingA.id,
        decidedById: memberUser.id,
      },
    });

    // 9. Seed Entity 5: Document in Workspace A
    documentA = await prisma.document.create({
      data: {
        title: 'Payment Processing API Specification',
        content: 'Detailed OpenAPI 3.0 specification for the payment refund and capture endpoints.',
        type: 'SPECIFICATION',
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        creatorId: memberUser.id,
      },
    });

    // 10. Seed records in isolated Workspace B (to test cross-workspace leakage prevention)
    taskB = await prisma.task.create({
      data: {
        title: 'Super Secret Quantum Cryptography Task',
        description: 'Top secret task in workspace B that should NEVER be visible in workspace A.',
        status: TaskStatus.TODO,
        priority: Priority.URGENT,
        workspaceId: workspaceB.id,
        projectId: projectB.id,
        creatorId: nonMemberUser.id,
      },
    });

    decisionB = await prisma.decision.create({
      data: {
        title: 'Workspace B Secret Decision',
        description: 'Confidential decision for isolated workspace B only.',
        workspaceId: workspaceB.id,
        projectId: projectB.id,
        status: 'APPROVED',
        decidedById: nonMemberUser.id,
      },
    });
  });

  after(async () => {
    // Clean up test data
    try {
      await prisma.taskComment.deleteMany({ where: { taskId: { in: [taskA.id, taskB.id] } } });
      await prisma.decision.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.document.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.meeting.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.task.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.project.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.membership.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.workspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [memberUser.id, nonMemberUser.id] } } });
    } catch (err) {
      console.warn('Cleanup error (non-fatal):', err);
    }
  });

  // ─── STAGE 1: SECURITY FIRST ──────────────────────────────────────────────────

  describe('1. Security & Workspace Membership Authorization', () => {
    function mockResponse() {
      const res: any = {};
      res.statusCode = 200;
      res.jsonData = null;
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data: any) => {
        res.jsonData = data;
        return res;
      };
      return res;
    }

    it('returns 403 Forbidden when a non-member accesses getDecisions', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        query: { workspaceId: workspaceA.id },
      };
      const res = mockResponse();

      await getDecisions(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /access to this workspace/i);
    });

    it('returns 403 Forbidden when a non-member creates a decision in unauthorized workspace', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        body: {
          title: 'Hacked Decision',
          description: 'Intruder should fail',
          workspaceId: workspaceA.id,
        },
      };
      const res = mockResponse();

      await createDecision(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /access to this workspace/i);
    });

    it('returns 403 Forbidden when a non-member calls extractDecisions on unauthorized workspace', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        body: {
          meetingId: meetingA.id,
          workspaceId: workspaceA.id,
        },
      };
      const res = mockResponse();

      await extractDecisions(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /access to this workspace/i);
    });

    it('returns 403 Forbidden when a non-member calls semanticSearch on unauthorized workspace', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        body: {
          query: 'What decisions were made?',
          workspaceId: workspaceA.id,
        },
      };
      const res = mockResponse();

      await semanticSearch(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /access to this workspace/i);
    });

    it('returns 403 Forbidden when a non-member calls getKnowledgeTimeline on unauthorized workspace', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        query: { workspaceId: workspaceA.id },
      };
      const res = mockResponse();

      await getKnowledgeTimeline(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /access to this workspace/i);
    });

    it('returns 403 Forbidden when a non-member calls getContextAssistant on unauthorized workspace', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        query: { contextId: 'ctx-1', title: 'Task Context', workspaceId: workspaceA.id },
      };
      const res = mockResponse();

      await getContextAssistant(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /access to this workspace/i);
    });

    it('returns 403 Forbidden when a non-member calls aiSearch on unauthorized workspace', async () => {
      const req: any = {
        user: { id: nonMemberUser.id },
        body: { query: 'payment gateway', workspaceId: workspaceA.id },
      };
      const res = mockResponse();

      await aiSearch(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.jsonData.success, false);
      assert.match(res.jsonData.error, /Not a member/i);
    });

    it('allows authorized workspace members to access getDecisions with 200 OK', async () => {
      const req: any = {
        user: { id: memberUser.id },
        query: { workspaceId: workspaceA.id },
      };
      const res = mockResponse();

      await getDecisions(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.jsonData));
      assert.ok(res.jsonData.some((d: any) => d.id === decisionA.id));
    });

    it('strictly isolates workspaces: search in Workspace A never returns records from Workspace B', async () => {
      const searchResultA = await SearchEngine.search('Quantum Cryptography Secret', workspaceA.id);
      assert.equal(
        searchResultA.results.some((r) => r.id === taskB.id || r.id === decisionB.id),
        false,
        'Workspace A search leaked records from Workspace B'
      );
      assert.equal(
        searchResultA.sources.some((s) => s.id === taskB.id || s.id === decisionB.id),
        false,
        'Workspace A sources leaked records from Workspace B'
      );
    });
  });

  // ─── STAGE 2: UNIFIED WORKSPACE RETRIEVAL ──────────────────────────────────────

  describe('2. Unified Workspace Retrieval Across All 6 Resource Types', () => {
    it('retrieves Tasks with correct type, metadata, and deep link', async () => {
      const response = await SearchEngine.search('Payment Gateway Integration', workspaceA.id);
      assert.ok(response.results.length > 0);

      const taskResult = response.results.find((r) => r.type === 'task' && r.id === taskA.id);
      assert.ok(taskResult, 'Task was not retrieved');
      assert.equal(taskResult.type, 'task');
      assert.equal(taskResult.title, 'Payment Gateway Integration');
      assert.equal(taskResult.link, `/dashboard/kanban?task=${taskA.id}`);
      assert.equal(taskResult.metadata.status, 'IN_PROGRESS');
      assert.equal(taskResult.metadata.priority, 'HIGH');
    });

    it('retrieves Task Comments with author details and deep link to task and comment', async () => {
      const response = await SearchEngine.search('webhook signing secret', workspaceA.id);
      assert.ok(response.results.length > 0);

      const commentResult = response.results.find((r) => r.type === 'task_comment' && r.id === commentA.id);
      assert.ok(commentResult, 'Task comment was not retrieved');
      assert.equal(commentResult.type, 'task_comment');
      assert.match(commentResult.title, /Comment on "Payment Gateway Integration"/);
      assert.equal(commentResult.link, `/dashboard/kanban?task=${taskA.id}&comment=${commentA.id}`);
      assert.match(commentResult.snippet, /webhook signing secret/);
    });

    it('retrieves Projects with status, creator, and deep link', async () => {
      const response = await SearchEngine.search('Mobile Payment Infrastructure', workspaceA.id);
      assert.ok(response.results.length > 0);

      const projectResult = response.results.find((r) => r.type === 'project' && r.id === projectA.id);
      assert.ok(projectResult, 'Project was not retrieved');
      assert.equal(projectResult.type, 'project');
      assert.equal(projectResult.link, `/dashboard/projects/${projectA.id}`);
      assert.equal(projectResult.metadata.status, 'PLANNING');
    });

    it('retrieves Meetings and applies transcript windowing without dumping full transcript', async () => {
      const response = await SearchEngine.search('AES-256 stored cardholder tokens', workspaceA.id);
      assert.ok(response.results.length > 0);

      const meetingResult = response.results.find((r) => r.type === 'meeting' && r.id === meetingA.id);
      assert.ok(meetingResult, 'Meeting was not retrieved via transcript keyword');
      assert.equal(meetingResult.type, 'meeting');
      assert.equal(meetingResult.link, `/dashboard/meetings?meetingId=${meetingA.id}`);
      // Snippet windowing check: length must be constrained
      assert.ok(meetingResult.snippet.length <= 200, 'Transcript snippet was not windowed');
      assert.match(meetingResult.snippet, /AES-256/i);
    });

    it('retrieves Dedicated Decisions with category and deep link', async () => {
      const response = await SearchEngine.search('Distributed Tokenization Vault', workspaceA.id);
      assert.ok(response.results.length > 0);

      const decisionResult = response.results.find((r) => r.type === 'decision' && r.id === decisionA.id);
      assert.ok(decisionResult, 'Decision record was not retrieved');
      assert.equal(decisionResult.type, 'decision');
      assert.equal(decisionResult.link, '/dashboard/decisions');
      assert.equal(decisionResult.metadata.category, 'SECURITY');
    });

    it('retrieves Documents with content snippet and deep link', async () => {
      const response = await SearchEngine.search('Payment Processing API Specification', workspaceA.id);
      assert.ok(response.results.length > 0);

      const docResult = response.results.find((r) => r.type === 'document' && r.id === documentA.id);
      assert.ok(docResult, 'Document was not retrieved');
      assert.equal(docResult.type, 'document');
      assert.equal(docResult.link, `/dashboard/documents?id=${documentA.id}`);
      assert.match(docResult.snippet, /OpenAPI 3\.0/);
    });
  });

  // ─── STAGE 3: GROUNDED ANSWERS & NO HALLUCINATION ─────────────────────────────

  describe('3. Grounded Answer Synthesis & Absence of Hallucinations', () => {
    it('returns exact insufficient information message when no workspace records match', async () => {
      const response = await SearchEngine.search(
        'What is the secret recipe for quantum cold fusion pancakes?',
        workspaceA.id
      );

      assert.equal(response.isGrounded, false);
      assert.equal(response.answer, INSUFFICIENT_INFORMATION_MESSAGE);
      assert.equal(response.results.length, 0);
      assert.equal(response.sources.length, 0);
      assert.equal(response.facts.length, 0);
    });

    it('strictly does NOT return fictional fallback answer about Rahul Sharma and PostgreSQL migration', async () => {
      const response = await SearchEngine.search(
        'What is the status of the unrecorded migration?',
        workspaceA.id
      );

      assert.ok(!response.answer?.includes('Rahul Sharma'), 'Fictional person Rahul Sharma appeared in search answer');
      assert.ok(
        !response.answer?.includes('PostgreSQL database migration and authentication security framework'),
        'Fictional PostgreSQL migration fallback appeared in search answer'
      );
    });

    it('synthesizes an answer grounded in real overdue task facts and distinguishes inferences', async () => {
      const response = await SearchEngine.search('Why is payment gateway delayed?', workspaceA.id);

      assert.equal(response.isGrounded, true);
      assert.ok(response.answer?.includes('delayed'), 'Grounded answer did not mention delay');
      assert.ok(response.answer?.includes('Payment Gateway Integration'), 'Grounded answer did not cite the real task');

      // Check distinguished facts
      assert.ok(response.facts.length > 0, 'No facts were populated');
      assert.ok(response.facts.some((f) => f.includes('IN_PROGRESS') && f.includes('HIGH')));

      // Check distinguished inferences
      assert.ok(response.inferences.length > 0, 'No inferences were populated');
      assert.ok(response.inferences.some((inf) => inf.toLowerCase().includes('overdue')));
    });

    it('semantic search engine returns insufficient info message when context is empty', async () => {
      const result = await SemanticSearchEngine.query(
        'Are there any plans for interstellar travel?',
        workspaceA.id,
        []
      );

      assert.equal(result.answer, INSUFFICIENT_INFORMATION_MESSAGE);
      assert.equal(result.sources.length, 0);
      assert.equal(result.relevanceScore, 0);
    });

    it('provides sources array with valid deep links and lexical match relevance scores', async () => {
      const response = await SearchEngine.search('tokenization vault', workspaceA.id);

      assert.ok(response.sources.length > 0);
      for (const src of response.sources) {
        assert.ok(src.id, 'Source is missing ID');
        assert.ok(src.title, 'Source is missing title');
        assert.ok(src.type, 'Source is missing type');
        assert.ok(src.snippet, 'Source is missing snippet');
        assert.ok(src.link.startsWith('/dashboard/'), `Invalid link format: ${src.link}`);
        assert.ok(
          typeof src.relevanceScore === 'number' && src.relevanceScore >= 0 && src.relevanceScore <= 100,
          `Invalid relevance score: ${src.relevanceScore}`
        );
      }
    });

    it('accurately resolves queries with trailing punctuation without rejection', async () => {
      const responseWithQuestion = await SearchEngine.search('tokenization vault?', workspaceA.id);
      assert.equal(responseWithQuestion.isGrounded, true);
      assert.ok(responseWithQuestion.sources.length > 0);
      assert.ok(
        responseWithQuestion.sources.some((s) => s.title.toLowerCase().includes('tokenization') || s.snippet.toLowerCase().includes('tokenization')),
        'Failed to match tokenization records due to punctuation'
      );

      const responseWithExclamation = await SearchEngine.search('Payment Gateway Integration!', workspaceA.id);
      assert.equal(responseWithExclamation.isGrounded, true);
      assert.ok(responseWithExclamation.sources.length > 0);
    });

    it('accurately resolves conversational queries with helper prefixes', async () => {
      const response = await SearchEngine.search('Do we have a tokenization vault?', workspaceA.id);
      assert.equal(response.isGrounded, true);
      assert.ok(response.sources.length > 0);
      assert.notEqual(response.answer, INSUFFICIENT_INFORMATION_MESSAGE);

      const responseFind = await SearchEngine.search('Can you please find the payment gateway?', workspaceA.id);
      assert.equal(responseFind.isGrounded, true);
      assert.ok(responseFind.sources.length > 0);
      assert.notEqual(responseFind.answer, INSUFFICIENT_INFORMATION_MESSAGE);
    });

    it('KnowledgeService.semanticSearch indexes all 6 entity types and returns unified results', async () => {
      const searchResult = await KnowledgeService.semanticSearch('payment tokenization gateway', workspaceA.id);
      assert.ok(searchResult.sources.length > 0, 'No sources returned by KnowledgeService.semanticSearch');
      assert.notEqual(searchResult.answer, INSUFFICIENT_INFORMATION_MESSAGE);

      // Verify that across various queries, multiple resource types are retrievable via semantic search
      const meetingResult = await KnowledgeService.semanticSearch('Q4 Payment Architecture Sync', workspaceA.id);
      assert.ok(meetingResult.sources.some((s: any) => s.type === 'MEETING' || s.title?.includes('Q4 Payment')));

      const taskResult = await KnowledgeService.semanticSearch('Payment Gateway Integration', workspaceA.id);
      assert.ok(taskResult.sources.some((s: any) => s.type === 'TASK' || s.title?.includes('Payment Gateway')));
    });
  });
});
