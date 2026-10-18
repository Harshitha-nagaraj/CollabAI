/**
 * @file tests/integration-status.test.ts
 *
 * Automated tests for Enterprise Integrations Hub status verification,
 * provider diagnostics, and tenant isolation.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { IntegrationService } from '../src/services/integration.service.js';

describe('Enterprise Integrations Hub Test Suite', () => {
  let testUser: any;
  let workspaceWithRepos: any;
  let emptyWorkspace: any;
  let createdRepo: any;

  before(async () => {
    const ts = Date.now();

    // 1. Create test user
    testUser = await prisma.user.create({
      data: {
        email: `integrations_tester_${ts}@collabai.internal`,
        name: 'Integrations Tester',
        password: 'hashed-password-123',
      },
    });

    // 2. Create workspace A (will have a connected repo)
    workspaceWithRepos = await prisma.workspace.create({
      data: {
        name: `Integrated WS ${ts}`,
        memberships: {
          create: {
            userId: testUser.id,
            role: 'OWNER',
          },
        },
      },
    });

    // 3. Create workspace B (empty workspace, no repos)
    emptyWorkspace = await prisma.workspace.create({
      data: {
        name: `Empty WS ${ts}`,
        memberships: {
          create: {
            userId: testUser.id,
            role: 'OWNER',
          },
        },
      },
    });

    // 4. Connect a GitHub repository to Workspace A
    createdRepo = await prisma.gitHubRepository.create({
      data: {
        name: 'collabai-web',
        owner: 'collabai',
        fullName: 'collabai/collabai-web',
        url: 'https://github.com/collabai/collabai-web',
        workspaceId: workspaceWithRepos.id,
      },
    });
  });

  after(async () => {
    if (createdRepo) {
      await prisma.gitHubRepository.deleteMany({ where: { id: createdRepo.id } });
    }
    if (workspaceWithRepos) {
      await prisma.membership.deleteMany({ where: { workspaceId: workspaceWithRepos.id } });
      await prisma.workspace.delete({ where: { id: workspaceWithRepos.id } });
    }
    if (emptyWorkspace) {
      await prisma.membership.deleteMany({ where: { workspaceId: emptyWorkspace.id } });
      await prisma.workspace.delete({ where: { id: emptyWorkspace.id } });
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  it('accurately reports GitHub as CONNECTED only when real repositories exist for that workspace', async () => {
    // Workspace A has 1 repository
    const wsAIntegrations = await IntegrationService.getWorkspaceIntegrations(workspaceWithRepos.id);
    const gitHubWsA = wsAIntegrations.find((i) => i.id === 'github');

    assert.ok(gitHubWsA, 'GitHub integration must exist in integrations list');
    assert.equal(gitHubWsA.status, 'CONNECTED', 'GitHub status must be CONNECTED when repos exist');
    assert.equal(gitHubWsA.isVerified, true, 'GitHub connection must be marked verified');
    assert.equal(gitHubWsA.connectedItems?.length, 1);
    assert.equal(gitHubWsA.connectedItems?.[0]?.name, 'collabai/collabai-web');

    // Workspace B has 0 repositories
    const wsBIntegrations = await IntegrationService.getWorkspaceIntegrations(emptyWorkspace.id);
    const gitHubWsB = wsBIntegrations.find((i) => i.id === 'github');

    assert.ok(gitHubWsB, 'GitHub integration must exist in integrations list');
    assert.equal(gitHubWsB.status, 'NOT_CONNECTED', 'GitHub status must be NOT_CONNECTED when no repos exist');
    assert.equal(gitHubWsB.isVerified, false, 'GitHub must not be verified when no repos exist');
    assert.equal(gitHubWsB.connectedItems?.length, 0);
  });

  it('never displays un-implemented integrations as CONNECTED', async () => {
    const integrations = await IntegrationService.getWorkspaceIntegrations(workspaceWithRepos.id);

    const nonImplementedIds = [
      'google-meet',
      'microsoft-teams',
      'zoom',
      'google-calendar',
      'microsoft-outlook',
      'slack',
    ];

    for (const id of nonImplementedIds) {
      const item = integrations.find((i) => i.id === id);
      assert.ok(item, `Integration ${id} must exist in the integrations hub`);
      assert.notEqual(
        item.status,
        'CONNECTED',
        `Un-implemented integration ${id} MUST NOT display status as CONNECTED`
      );
      assert.equal(item.isVerified, false, `Integration ${id} must not be verified`);
      assert.ok(item.setupGuide, `Integration ${id} must provide setup guide`);
      assert.ok(item.setupGuide.steps.length > 0, `Integration ${id} must have setup steps`);
      assert.ok(item.setupGuide.redirectUri, `Integration ${id} must specify redirect URI`);
    }
  });

  it('provides real-time verification and diagnostic feedback for providers', async () => {
    // 1. Verify GitHub on Workspace A (has repo)
    const githubResultA = await IntegrationService.verifyProvider(workspaceWithRepos.id, 'github');
    assert.equal(githubResultA.status, 'CONNECTED');
    assert.equal(githubResultA.isVerified, true);
    assert.equal(githubResultA.details?.connectedCount, 1);

    // 2. Verify GitHub on Workspace B (no repo)
    const githubResultB = await IntegrationService.verifyProvider(emptyWorkspace.id, 'github');
    assert.equal(githubResultB.status, 'NOT_CONNECTED');
    assert.equal(githubResultB.isVerified, false);

    // 3. Verify Google Calendar (honest diagnostic feedback)
    const googleResult = await IntegrationService.verifyProvider(workspaceWithRepos.id, 'google-calendar');
    assert.notEqual(googleResult.status, 'CONNECTED');
    assert.equal(googleResult.isVerified, false);
    assert.ok(googleResult.message.length > 0);

    // 4. Verify unknown provider
    const unknownResult = await IntegrationService.verifyProvider(workspaceWithRepos.id, 'random-tool');
    assert.equal(unknownResult.status, 'NOT_CONNECTED');
    assert.equal(unknownResult.isVerified, false);
    assert.equal(unknownResult.title, 'Unknown Provider');
  });
});
