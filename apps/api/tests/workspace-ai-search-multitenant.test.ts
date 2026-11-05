/**
 * @file tests/workspace-ai-search-multitenant.test.ts
 *
 * Verifies Workspace AI Search multi-tenant security isolation across separate accounts:
 * 1. User Alpha & User Beta authentication via AuthService.loginUser
 * 2. Workspace membership isolation (WorkspaceService.listWorkspaces)
 * 3. Complete retrieval of all 6 entity types in authorized workspace
 * 4. Strict cross-tenant isolation (zero leakage of Alpha data into Beta queries)
 * 5. Strict 403 Forbidden enforcement on unauthorized cross-workspace queries
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { AuthService } from '../src/services/auth.service.js';
import { WorkspaceService } from '../src/services/workspace.service.js';
import { aiSearch } from '../src/controllers/ai.controller.js';
import { INSUFFICIENT_INFORMATION_MESSAGE } from '../src/ai/services/semantic-search.service.js';

describe('Workspace AI Search Multi-Tenant Isolation Test Suite', () => {
  let userAlpha: any;
  let userBeta: any;
  let workspaceAlpha: any;
  let workspaceBeta: any;
  let tokenAlpha: string;
  let tokenBeta: string;

  before(async () => {
    // Fetch seeded accounts
    userAlpha = await prisma.user.findUnique({
      where: { email: 'alpha.tester@collabai.internal' },
    });
    userBeta = await prisma.user.findUnique({
      where: { email: 'beta.tester@collabai.internal' },
    });

    assert.ok(userAlpha, 'User Alpha must exist');
    assert.ok(userBeta, 'User Beta must exist');

    workspaceAlpha = await prisma.workspace.findFirst({
      where: { name: 'Workspace Alpha (Secure Payments)' },
    });
    workspaceBeta = await prisma.workspace.findFirst({
      where: { name: 'Workspace Beta (Fleet Logistics)' },
    });

    assert.ok(workspaceAlpha, 'Workspace Alpha must exist');
    assert.ok(workspaceBeta, 'Workspace Beta must exist');

    // Authenticate both accounts through AuthService
    const loginAlpha = await AuthService.loginUser({
      email: 'alpha.tester@collabai.internal',
      password: 'Password123!',
    });
    tokenAlpha = loginAlpha.token;

    const loginBeta = await AuthService.loginUser({
      email: 'beta.tester@collabai.internal',
      password: 'Password123!',
    });
    tokenBeta = loginBeta.token;

    assert.ok(tokenAlpha, 'User Alpha must receive a valid JWT');
    assert.ok(tokenBeta, 'User Beta must receive a valid JWT');
  });

  it('1. User Alpha and User Beta can only list workspaces where they have active membership', async () => {
    const alphaWorkspaces = await WorkspaceService.listWorkspaces(userAlpha.id);
    const betaWorkspaces = await WorkspaceService.listWorkspaces(userBeta.id);

    // Alpha can see Alpha workspace, but NOT Beta
    assert.ok(alphaWorkspaces.some((w) => w.id === workspaceAlpha.id));
    assert.ok(!alphaWorkspaces.some((w) => w.id === workspaceBeta.id));

    // Beta can see Beta workspace, but NOT Alpha
    assert.ok(betaWorkspaces.some((w) => w.id === workspaceBeta.id));
    assert.ok(!betaWorkspaces.some((w) => w.id === workspaceAlpha.id));
  });

  it('2. User Alpha in Workspace Alpha retrieves tasks, comments, meetings, decisions, and documents', async () => {
    const req: any = {
      user: { id: userAlpha.id, email: userAlpha.email },
      query: {
        workspaceId: workspaceAlpha.id,
        q: 'tokenization vault HSM payment',
      },
    };

    let resultStatus = 200;
    let resultBody: any = null;
    const res: any = {
      status(s: number) {
        resultStatus = s;
        return this;
      },
      json(data: any) {
        resultBody = data;
        return this;
      },
    };

    await aiSearch(req, res);

    assert.equal(resultStatus, 200);
    assert.equal(resultBody.success, true);
    assert.equal(resultBody.data.isGrounded, true);
    assert.ok(resultBody.data.sources.length >= 4);

    const resourceTypes = resultBody.data.sources.map((s: any) => s.type || s.resourceType);
    assert.ok(resourceTypes.includes('task'), 'Must include task source');
    assert.ok(resourceTypes.includes('task_comment'), 'Must include task_comment source');
    assert.ok(resourceTypes.includes('meeting'), 'Must include meeting source');
    assert.ok(resourceTypes.includes('decision'), 'Must include decision source');
    assert.ok(resourceTypes.includes('document'), 'Must include document source');
  });

  it('3. User Beta in Workspace Beta retrieves tasks, comments, meetings, decisions, and documents', async () => {
    const req: any = {
      user: { id: userBeta.id, email: userBeta.email },
      query: {
        workspaceId: workspaceBeta.id,
        q: 'fleet routing Dijkstra dispatch telemetry GPS',
      },
    };

    let resultStatus = 200;
    let resultBody: any = null;
    const res: any = {
      status(s: number) {
        resultStatus = s;
        return this;
      },
      json(data: any) {
        resultBody = data;
        return this;
      },
    };

    await aiSearch(req, res);

    assert.equal(resultStatus, 200);
    assert.equal(resultBody.success, true);
    assert.equal(resultBody.data.isGrounded, true);
    assert.ok(resultBody.data.sources.length >= 4);

    const resourceTypes = resultBody.data.sources.map((s: any) => s.type || s.resourceType);
    assert.ok(resourceTypes.includes('task'), 'Must include task source');
    assert.ok(resourceTypes.includes('task_comment'), 'Must include task_comment source');
    assert.ok(resourceTypes.includes('meeting'), 'Must include meeting source');
    assert.ok(resourceTypes.includes('decision'), 'Must include decision source');
    assert.ok(resourceTypes.includes('document'), 'Must include document source');
  });

  it('4. User Beta searching Workspace Beta NEVER sees Workspace Alpha data (Zero Cross-Tenant Leakage)', async () => {
    const req: any = {
      user: { id: userBeta.id, email: userBeta.email },
      query: {
        workspaceId: workspaceBeta.id,
        q: 'tokenization vault HSM cardholder PCI-DSS',
      },
    };

    let resultStatus = 200;
    let resultBody: any = null;
    const res: any = {
      status(s: number) {
        resultStatus = s;
        return this;
      },
      json(data: any) {
        resultBody = data;
        return this;
      },
    };

    await aiSearch(req, res);

    assert.equal(resultStatus, 200);
    assert.equal(resultBody.data.isGrounded, false);
    assert.equal(resultBody.data.answer, INSUFFICIENT_INFORMATION_MESSAGE);
    assert.equal(resultBody.data.sources.length, 0, 'Must have 0 sources leaking from Alpha');
    assert.equal(resultBody.data.facts.length, 0);
  });

  it('5. User Alpha searching Workspace Alpha NEVER sees Workspace Beta data (Zero Cross-Tenant Leakage)', async () => {
    const req: any = {
      user: { id: userAlpha.id, email: userAlpha.email },
      query: {
        workspaceId: workspaceAlpha.id,
        q: 'Dijkstra autonomous fleet delivery vehicles MQTT telemetry',
      },
    };

    let resultStatus = 200;
    let resultBody: any = null;
    const res: any = {
      status(s: number) {
        resultStatus = s;
        return this;
      },
      json(data: any) {
        resultBody = data;
        return this;
      },
    };

    await aiSearch(req, res);

    assert.equal(resultStatus, 200);
    assert.equal(resultBody.data.isGrounded, false);
    assert.equal(resultBody.data.answer, INSUFFICIENT_INFORMATION_MESSAGE);
    assert.equal(resultBody.data.sources.length, 0, 'Must have 0 sources leaking from Beta');
  });

  it('6. User Beta attempting to search Workspace Alpha directly receives 403 Forbidden', async () => {
    const req: any = {
      user: { id: userBeta.id, email: userBeta.email },
      query: {
        workspaceId: workspaceAlpha.id,
        q: 'tokenization vault',
      },
    };

    let resultStatus = 200;
    let resultBody: any = null;
    const res: any = {
      status(s: number) {
        resultStatus = s;
        return this;
      },
      json(data: any) {
        resultBody = data;
        return this;
      },
    };

    await aiSearch(req, res);

    assert.equal(resultStatus, 403);
    assert.equal(resultBody.success, false);
    assert.match(resultBody.error, /not have access to this workspace/i);
  });

  it('7. User Alpha attempting to search Workspace Beta directly receives 403 Forbidden', async () => {
    const req: any = {
      user: { id: userAlpha.id, email: userAlpha.email },
      query: {
        workspaceId: workspaceBeta.id,
        q: 'autonomous fleet routing',
      },
    };

    let resultStatus = 200;
    let resultBody: any = null;
    const res: any = {
      status(s: number) {
        resultStatus = s;
        return this;
      },
      json(data: any) {
        resultBody = data;
        return this;
      },
    };

    await aiSearch(req, res);

    assert.equal(resultStatus, 403);
    assert.equal(resultBody.success, false);
    assert.match(resultBody.error, /not have access to this workspace/i);
  });
});
