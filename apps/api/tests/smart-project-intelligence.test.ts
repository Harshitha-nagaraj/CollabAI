/**
 * @file tests/smart-project-intelligence.test.ts
 *
 * Automated tests verifying Smart Project Intelligence:
 * 1. Health assessment and explainability (metrics, score deltas, factors, boundaries)
 * 2. Risk detection (overdue, blockers, stalled work, unassigned scope, meeting action items)
 * 3. Workload analysis (transparent overload rules based on hours, high priorities, overdue, concurrency)
 * 4. Actionable recommendations with rationales explaining why they appear
 * 5. Authorization and workspace membership permissions (403 forbidden, 404 not found)
 * 6. Missing data handling (missing due dates, missing assignees, unestimated tasks, malformed meeting JSON)
 * 7. Empty projects (0 tasks, graceful fallback, zero-division protection)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { ProjectService } from '../src/services/project.service.js';
import { ForbiddenError, NotFoundError } from '../src/utils/errors.js';
import { TaskStatus, Priority, ActivityAction, ActivityEntityType } from '@prisma/client';

describe('Smart Project Intelligence Test Suite', () => {
  const ts = Date.now();
  let testUser: any;
  let unauthorizedUser: any;
  let testWorkspace: any;
  let isolatedWorkspace: any;

  let emptyProject: any;
  let healthyProject: any;
  let atRiskProject: any;
  let missingDataProject: any;

  let taskAssignee1: any;
  let taskAssignee2: any;

  before(async () => {
    // 1. Create test users
    testUser = await prisma.user.create({
      data: {
        email: `intelligence_owner_${ts}@collabai.internal`,
        name: 'Intelligence Tester',
        password: 'hashed-password-123',
      },
    });

    taskAssignee1 = await prisma.user.create({
      data: {
        email: `assignee1_${ts}@collabai.internal`,
        name: 'Alex Developer',
        password: 'hashed-password-123',
      },
    });

    taskAssignee2 = await prisma.user.create({
      data: {
        email: `assignee2_${ts}@collabai.internal`,
        name: 'Sam Engineer',
        password: 'hashed-password-123',
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `unauthorized_${ts}@collabai.internal`,
        name: 'Unauthorized Stranger',
        password: 'hashed-password-123',
      },
    });

    // 2. Create workspaces
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `Intelligence Test Workspace ${ts}`,
      },
    });

    isolatedWorkspace = await prisma.workspace.create({
      data: {
        name: `Isolated Workspace ${ts}`,
      },
    });

    // 3. Add memberships
    await prisma.membership.create({
      data: {
        userId: testUser.id,
        workspaceId: testWorkspace.id,
        role: 'OWNER',
      },
    });

    await prisma.membership.create({
      data: {
        userId: taskAssignee1.id,
        workspaceId: testWorkspace.id,
        role: 'MEMBER',
      },
    });

    await prisma.membership.create({
      data: {
        userId: taskAssignee2.id,
        workspaceId: testWorkspace.id,
        role: 'MEMBER',
      },
    });

    await prisma.membership.create({
      data: {
        userId: unauthorizedUser.id,
        workspaceId: isolatedWorkspace.id,
        role: 'MEMBER',
      },
    });

    // 4. Create projects
    emptyProject = await prisma.project.create({
      data: {
        name: `Empty Project ${ts}`,
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    healthyProject = await prisma.project.create({
      data: {
        name: `Healthy Project ${ts}`,
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    atRiskProject = await prisma.project.create({
      data: {
        name: `At-Risk Project ${ts}`,
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    missingDataProject = await prisma.project.create({
      data: {
        name: `Missing Data Project ${ts}`,
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Populate Healthy Project tasks (all on-schedule, assigned, good completion velocity)
    await prisma.task.create({
      data: {
        title: 'Healthy Task 1 - Done',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        dueDate: pastDate,
        projectId: healthyProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee1.id,
        estimatedHours: 8,
        storyPoints: 5,
      },
    });
    await prisma.task.create({
      data: {
        title: 'Healthy Task 2 - In Progress on Track',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        dueDate: futureDate,
        projectId: healthyProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee1.id,
        estimatedHours: 12,
        storyPoints: 3,
      },
    });

    // Populate At-Risk Project tasks:
    // a) Task 1: Overdue task assigned to taskAssignee2
    const overdueTask = await prisma.task.create({
      data: {
        title: 'Critical Overdue Deliverable',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        dueDate: pastDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee2.id,
        estimatedHours: 20,
        storyPoints: 8,
      },
    });

    // b) Task 2: Second overdue task to test multiple overdue triggers
    await prisma.task.create({
      data: {
        title: 'Secondary Overdue Task',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: pastDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee2.id,
        estimatedHours: 15,
        storyPoints: 5,
      },
    });

    // c) Task 3: Heavy effort task to trigger transparent workload overload (estimatedHours >= 40)
    await prisma.task.create({
      data: {
        title: 'Heavy Backend Refactor',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: futureDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee2.id,
        estimatedHours: 15,
        storyPoints: 8,
      },
    });

    // d) Task 4: Predecessor task (still TODO) and Successor task (Blocked)
    const predecessorTask = await prisma.task.create({
      data: {
        title: 'Database Schema Migration',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: futureDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee1.id,
        estimatedHours: 6,
        storyPoints: 3,
      },
    });

    const blockedTask = await prisma.task.create({
      data: {
        title: 'Dependent API Endpoint',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: futureDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee1.id,
        estimatedHours: 8,
        storyPoints: 5,
      },
    });

    await prisma.taskDependency.create({
      data: {
        predecessorId: predecessorTask.id,
        successorId: blockedTask.id,
        type: 'FINISH_TO_START',
      },
    });

    // e) Task 5: Stalled task (updated 10 days ago, no recent activity)
    await prisma.task.create({
      data: {
        title: 'Stalled Integration Pipeline',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        dueDate: futureDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee1.id,
        updatedAt: tenDaysAgo,
        createdAt: tenDaysAgo,
        estimatedHours: 10,
        storyPoints: 3,
      },
    });

    // f) Task 6: Unassigned critical task
    await prisma.task.create({
      data: {
        title: 'Urgent Unassigned Security Audit',
        status: TaskStatus.TODO,
        priority: Priority.URGENT,
        dueDate: futureDate,
        projectId: atRiskProject.id,
        creatorId: testUser.id,
        assigneeId: null,
      },
    });

    // g) Meeting with action items linked to At-Risk Project
    await prisma.meeting.create({
      data: {
        title: 'Sprint Kickoff & Risk Sync',
        startTime: now,
        endTime: new Date(now.getTime() + 3600000),
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
        actionItems: JSON.stringify([
          {
            title: 'Audit third party packages',
            projectId: atRiskProject.id,
            approved: false,
            assignee: 'Alex Developer',
          },
        ]),
      },
    });

    // Populate Missing Data Project: tasks with missing due dates, missing assignees, no hours
    await prisma.task.create({
      data: {
        title: 'Task with No Due Date or Estimate',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: null,
        projectId: missingDataProject.id,
        creatorId: testUser.id,
        assigneeId: null,
        estimatedHours: null,
        storyPoints: null,
      },
    });
    await prisma.task.create({
      data: {
        title: 'Assigned Task with No Dates',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.LOW,
        dueDate: null,
        projectId: missingDataProject.id,
        creatorId: testUser.id,
        assigneeId: taskAssignee1.id,
        estimatedHours: null,
        storyPoints: null,
      },
    });
  });

  after(async () => {
    // Clean up test data safely in reverse order
    const projectIds = [emptyProject?.id, healthyProject?.id, atRiskProject?.id, missingDataProject?.id].filter(Boolean);
    const workspaceIds = [testWorkspace?.id, isolatedWorkspace?.id].filter(Boolean);
    const userIds = [testUser?.id, taskAssignee1?.id, taskAssignee2?.id, unauthorizedUser?.id].filter(Boolean);

    await prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { predecessor: { projectId: { in: projectIds } } },
          { successor: { projectId: { in: projectIds } } },
        ],
      },
    });

    await prisma.meeting.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });

    await prisma.task.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    await prisma.project.deleteMany({
      where: { id: { in: projectIds } },
    });

    await prisma.membership.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });

    await prisma.workspace.deleteMany({
      where: { id: { in: workspaceIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  });

  describe('1. Permissions & Authorization', () => {
    it('allows an authorized workspace member to retrieve project intelligence', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, healthyProject.id);
      assert.ok(intelligence);
      assert.equal(intelligence.projectId, healthyProject.id);
      assert.equal(intelligence.workspaceId, testWorkspace.id);
      assert.ok(intelligence.health);
      assert.ok(Array.isArray(intelligence.risks));
      assert.ok(intelligence.workload);
      assert.ok(Array.isArray(intelligence.recommendations));
    });

    it('denies access (ForbiddenError) when requesting user is not a member of the workspace', async () => {
      await assert.rejects(
        async () => {
          await ProjectService.getProjectIntelligence(unauthorizedUser.id, healthyProject.id);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError || err.statusCode === 403);
          assert.match(err.message, /access to this workspace/i);
          return true;
        }
      );
    });

    it('returns NotFoundError when the requested project does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await assert.rejects(
        async () => {
          await ProjectService.getProjectIntelligence(testUser.id, nonExistentId);
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundError || err.statusCode === 404);
          assert.match(err.message, /project not found/i);
          return true;
        }
      );
    });
  });

  describe('2. Empty Projects', () => {
    it('gracefully evaluates an empty project with 0 tasks without errors or division by zero', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, emptyProject.id);
      assert.equal(intelligence.health.score, 100);
      assert.equal(intelligence.health.status, 'HEALTHY');
      assert.equal(intelligence.health.metrics.totalTasks, 0);
      assert.equal(intelligence.health.metrics.completedTasks, 0);
      assert.equal(intelligence.health.metrics.completionRate, 0);
      assert.equal(intelligence.health.metrics.openTasks, 0);
      assert.equal(intelligence.health.metrics.overdueTasks, 0);
      assert.equal(intelligence.health.metrics.blockedTasks, 0);
      assert.equal(intelligence.health.metrics.stalledTasks, 0);

      // Explainability factor explains empty state
      const taskVolFactor = intelligence.health.explainability.find((f) => f.factor === 'Task Volume');
      assert.ok(taskVolFactor);
      assert.equal(taskVolFactor.impact, 'NEUTRAL');
      assert.match(taskVolFactor.message, /empty with 0 tasks/i);

      // Empty recommendations
      const initRec = intelligence.recommendations.find((r) => r.id === 'rec-empty');
      assert.ok(initRec);
      assert.match(initRec.action, /add initial tasks/i);

      // Workload is empty
      assert.equal(intelligence.workload.totalAssignees, 0);
      assert.equal(intelligence.workload.overloadedCount, 0);
      assert.equal(intelligence.risks.length, 0);
    });
  });

  describe('3. Health Calculations & Explainability', () => {
    it('evaluates healthy project with positive factors and high score', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, healthyProject.id);
      assert.ok(intelligence.health.score >= 75);
      assert.equal(intelligence.health.status, 'HEALTHY');
      assert.equal(intelligence.health.metrics.totalTasks, 2);
      assert.equal(intelligence.health.metrics.completedTasks, 1);
      assert.equal(intelligence.health.metrics.completionRate, 50);
      assert.equal(intelligence.health.metrics.overdueTasks, 0);
      assert.equal(intelligence.health.metrics.blockedTasks, 0);

      // Verify positive explainability factor
      const deadlineFactor = intelligence.health.explainability.find((f) => f.factor === 'On-Schedule Deadlines');
      assert.ok(deadlineFactor);
      assert.equal(deadlineFactor.impact, 'POSITIVE');

      const ownershipFactor = intelligence.health.explainability.find((f) => f.factor === 'Ownership Coverage');
      assert.ok(ownershipFactor);
      assert.equal(ownershipFactor.impact, 'POSITIVE');
    });

    it('evaluates at-risk project with explainable negative deductions and underlying metrics', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);

      // Underlying metrics
      assert.ok(intelligence.health.metrics.totalTasks >= 6);
      assert.ok(intelligence.health.metrics.overdueTasks >= 2, 'Should detect at least 2 overdue tasks');
      assert.ok(intelligence.health.metrics.blockedTasks >= 1, 'Should detect at least 1 blocked task');
      assert.ok(intelligence.health.metrics.stalledTasks >= 1, 'Should detect at least 1 stalled task');
      assert.ok(intelligence.health.metrics.unassignedTasks >= 1, 'Should detect unassigned tasks');

      // Health score must reflect deductions
      assert.ok(intelligence.health.score < 75);
      assert.ok(
        intelligence.health.status === 'NEEDS_ATTENTION' || intelligence.health.status === 'AT_RISK',
        `Status should be at risk or needs attention, got: ${intelligence.health.status}`
      );

      // Explainability must show why the score was reduced
      const overdueFactor = intelligence.health.explainability.find((f) => f.factor === 'Overdue Deadlines');
      assert.ok(overdueFactor, 'Must have overdue factor');
      assert.equal(overdueFactor.impact, 'NEGATIVE');
      assert.ok(overdueFactor.scoreDelta! < 0);

      const blockerFactor = intelligence.health.explainability.find((f) => f.factor === 'Unresolved Blockers');
      assert.ok(blockerFactor, 'Must have blockers factor');
      assert.equal(blockerFactor.impact, 'NEGATIVE');
      assert.ok(blockerFactor.scoreDelta! < 0);

      const stalledFactor = intelligence.health.explainability.find((f) => f.factor === 'Stalled In-Progress Work');
      assert.ok(stalledFactor, 'Must have stalled factor');
      assert.equal(stalledFactor.impact, 'NEGATIVE');
      assert.ok(stalledFactor.scoreDelta! < 0);

      const unassignedFactor = intelligence.health.explainability.find((f) => f.factor === 'Unassigned Critical Scope');
      assert.ok(unassignedFactor, 'Must have unassigned critical factor');
      assert.equal(unassignedFactor.impact, 'NEGATIVE');
      assert.ok(unassignedFactor.scoreDelta! < 0);
    });
  });

  describe('4. Risk Detection', () => {
    it('identifies overdue tasks with affected item previews', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);
      const overdueRisk = intelligence.risks.find((r) => r.type === 'OVERDUE');
      assert.ok(overdueRisk, 'Should include OVERDUE risk');
      assert.equal(overdueRisk.severity, 'HIGH');
      assert.ok(overdueRisk.affectedCount >= 2);
      assert.ok(overdueRisk.items.length > 0);
      assert.ok(overdueRisk.items.some((i) => i.title === 'Critical Overdue Deliverable'));
    });

    it('identifies blocked tasks with prerequisite details', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);
      const blockedRisk = intelligence.risks.find((r) => r.type === 'BLOCKED');
      assert.ok(blockedRisk, 'Should include BLOCKED risk');
      assert.equal(blockedRisk.severity, 'HIGH');
      assert.ok(blockedRisk.affectedCount >= 1);
      assert.ok(blockedRisk.items.some((i) => i.title === 'Dependent API Endpoint'));
      assert.match(blockedRisk.items[0].details || '', /Database Schema Migration/i);
    });

    it('identifies stalled in-progress tasks lacking recent activity', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);
      const stalledRisk = intelligence.risks.find((r) => r.type === 'STALLED');
      assert.ok(stalledRisk, 'Should include STALLED risk');
      assert.equal(stalledRisk.severity, 'MEDIUM');
      assert.ok(stalledRisk.affectedCount >= 1);
      assert.ok(stalledRisk.items.some((i) => i.title === 'Stalled Integration Pipeline'));
    });

    it('identifies unassigned tasks and flags high priority appropriately', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);
      const unassignedRisk = intelligence.risks.find((r) => r.type === 'UNASSIGNED');
      assert.ok(unassignedRisk, 'Should include UNASSIGNED risk');
      assert.equal(unassignedRisk.severity, 'HIGH');
      assert.ok(unassignedRisk.items.some((i) => i.title === 'Urgent Unassigned Security Audit'));
    });

    it('identifies incomplete meeting action items', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);
      const meetingRisk = intelligence.risks.find((r) => r.type === 'MEETING_ACTION');
      assert.ok(meetingRisk, 'Should include MEETING_ACTION risk');
      assert.ok(meetingRisk.affectedCount >= 1);
      assert.ok(meetingRisk.items.some((i) => i.title.includes('Audit third party packages')));
    });
  });

  describe('5. Workload Analysis & Effort-Aware Transparent Rules', () => {
    it('summarizes open tasks by assignee and flags overload using transparent effort hours and overdue count', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);

      assert.ok(intelligence.workload.totalAssignees >= 2);
      const assignee2Load = intelligence.workload.members.find((m) => m.userId === taskAssignee2.id);
      assert.ok(assignee2Load, 'Assignee 2 should be in members workload');

      // taskAssignee2 has:
      // - 3 tasks (Critical Overdue 20h, Secondary Overdue 15h, Heavy Refactor 15h) = 50h totalEstimatedHours
      // - 2 overdue tasks
      // - 3 urgent/high tasks
      assert.equal(assignee2Load.openTasks, 3);
      assert.ok(assignee2Load.totalEstimatedHours >= 45, 'Hours should exceed 45h');
      assert.equal(assignee2Load.status, 'OVERLOADED');

      // Transparent reasons must be present
      assert.ok(assignee2Load.overloadReasons.length >= 2);
      assert.ok(assignee2Load.overloadReasons.some((r) => r.includes('40h capacity')));
      assert.ok(assignee2Load.overloadReasons.some((r) => r.includes('overdue tasks')));
      assert.ok(assignee2Load.overloadReasons.some((r) => r.includes('high/urgent priority')));

      // Overall overloadedCount
      assert.ok(intelligence.workload.overloadedCount >= 1);
    });

    it('summarizes unassigned work separately', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);
      assert.ok(intelligence.workload.unassignedWork.openTasks >= 1);
      assert.ok(intelligence.workload.unassignedWork.urgentOrHighTasks >= 1);
    });
  });

  describe('6. Actionable Recommendations with Rationales', () => {
    it('generates recommendations with explanations of why each appears', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, atRiskProject.id);

      // Overdue recommendation
      const overdueRec = intelligence.recommendations.find((r) => r.id === 'rec-overdue');
      assert.ok(overdueRec);
      assert.equal(overdueRec.category, 'DEADLINES');
      assert.equal(overdueRec.priority, 'HIGH');
      assert.ok(overdueRec.rationale.includes('passed their scheduled completion dates'));
      assert.ok(overdueRec.suggestedSteps.length > 0);

      // Blockers recommendation
      const blockerRec = intelligence.recommendations.find((r) => r.id === 'rec-blockers');
      assert.ok(blockerRec);
      assert.equal(blockerRec.category, 'BLOCKERS');
      assert.ok(blockerRec.rationale.includes('unable to proceed until their prerequisite tasks reach completion'));

      // Unassigned recommendation
      const unassignedRec = intelligence.recommendations.find((r) => r.id === 'rec-unassigned');
      assert.ok(unassignedRec);
      assert.equal(unassignedRec.category, 'ASSIGNMENT');
      assert.ok(unassignedRec.rationale.includes('lack owners'));

      // Stalled work recommendation
      const stalledRec = intelligence.recommendations.find((r) => r.id === 'rec-stalled');
      assert.ok(stalledRec);
      assert.equal(stalledRec.category, 'PROCESS');
      assert.ok(stalledRec.action.includes('no activity for >7 days'));
      assert.ok(stalledRec.rationale.includes('silent blockers'));

      // Workload rebalancing recommendation
      const workloadRec = intelligence.recommendations.find((r) => r.id === 'rec-workload');
      assert.ok(workloadRec);
      assert.equal(workloadRec.category, 'WORKLOAD');
      assert.ok(workloadRec.rationale.includes('single points of failure'));
      assert.ok(workloadRec.action.includes('burnout'));

      // Meeting commitments recommendation
      const meetingRec = intelligence.recommendations.find((r) => r.id === 'rec-meetings');
      assert.ok(meetingRec);
      assert.equal(meetingRec.category, 'MEETINGS');
    });
  });

  describe('7. Missing Data Handling', () => {
    it('handles tasks with missing due dates, missing assignees, and missing hours gracefully', async () => {
      const intelligence = await ProjectService.getProjectIntelligence(testUser.id, missingDataProject.id);
      assert.ok(intelligence);
      assert.equal(intelligence.health.metrics.totalTasks, 2);
      assert.equal(intelligence.health.metrics.targetDueDate, null);
      assert.equal(intelligence.health.metrics.isDeliveryOverdue, false);

      // Missing due date explainability is neutral
      const dateFactor = intelligence.health.explainability.find((f) => f.factor === 'Task Due Dates');
      assert.ok(dateFactor);
      assert.equal(dateFactor.impact, 'NEUTRAL');

      // Assignee with null hours is handled without NaN
      const member = intelligence.workload.members.find((m) => m.userId === taskAssignee1.id);
      assert.ok(member);
      assert.equal(member.totalEstimatedHours, 0);
      assert.equal(member.storyPoints, 0);
      assert.ok(Number.isFinite(member.totalEstimatedHours));
    });
  });
});
