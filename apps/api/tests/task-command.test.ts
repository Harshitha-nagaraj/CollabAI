/**
 * @file tests/task-command.test.ts
 *
 * Automated tests verifying task matching, command parsing, and platform action execution.
 *
 * Test cases covered:
 * 1. Move API testing to Done.
 * 2. Move [an existing exact task title] to In Progress.
 * 3. A task title with different capitalization.
 * 4. A nonexistent task.
 * 5. Two tasks with similar titles (ambiguous matching -> disambiguation).
 * 6. A task belonging to another workspace (workspace isolation).
 * 7. Existing task creation and overdue-task commands.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TaskMatchingService, normalizeTaskStatus } from '../src/services/task-matching.service.js';
import { CommandParser } from '../src/ai/services/command-parser.js';
import { HeuristicProvider } from '../src/ai/providers/heuristic.provider.js';
import { prisma } from '../src/lib/prisma.js';

describe('AI Command & Task Matching Test Suite', () => {
  const heuristic = new HeuristicProvider();

  describe('Status Normalization', () => {
    it('maps common statuses correctly to valid TaskStatus enum', () => {
      assert.equal(normalizeTaskStatus('Done'), 'DONE');
      assert.equal(normalizeTaskStatus('done'), 'DONE');
      assert.equal(normalizeTaskStatus('completed'), 'DONE');
      assert.equal(normalizeTaskStatus('In Progress'), 'IN_PROGRESS');
      assert.equal(normalizeTaskStatus('in-progress'), 'IN_PROGRESS');
      assert.equal(normalizeTaskStatus('in progress'), 'IN_PROGRESS');
      assert.equal(normalizeTaskStatus('In Review'), 'IN_REVIEW');
      assert.equal(normalizeTaskStatus('todo'), 'TODO');
      assert.equal(normalizeTaskStatus('to-do'), 'TODO');
      assert.equal(normalizeTaskStatus('backlog'), 'BACKLOG');
      assert.equal(normalizeTaskStatus('cancelled'), 'CANCELLED');
      assert.equal(normalizeTaskStatus('canceled'), 'CANCELLED');
    });
  });

  describe('Query Extraction & Cleaning', () => {
    it('Case 1: extracts task title from "Move API testing to Done."', async () => {
      const parsed = await CommandParser.parse('Move API testing to Done.');
      assert.equal(parsed.action, 'move_task');
      assert.equal(parsed.parameters.query, 'API testing');
      assert.equal(parsed.parameters.status, 'done');
      assert.equal(parsed.executablePayload?.type, 'move_task');
      assert.equal(parsed.executablePayload?.targetQuery, 'API testing');
      assert.equal(parsed.executablePayload?.targetStatus, 'DONE');
    });

    it('Case 2: extracts task title from bracketed command "Move [an existing exact task title] to In Progress."', async () => {
      const parsed = await CommandParser.parse('Move [an existing exact task title] to In Progress.');
      assert.equal(parsed.action, 'move_task');
      assert.equal(parsed.parameters.query, 'an existing exact task title');
      assert.equal(parsed.parameters.status, 'in progress');
      assert.equal(parsed.executablePayload?.targetQuery, 'an existing exact task title');
      assert.equal(parsed.executablePayload?.targetStatus, 'IN_PROGRESS');
    });

    it('Case 3: extracts task title with different capitalization "move api testing to done"', async () => {
      const parsed = await CommandParser.parse('move api testing to done');
      assert.equal(parsed.action, 'move_task');
      assert.equal(parsed.parameters.query, 'api testing');
      assert.equal(parsed.parameters.status, 'done');
      assert.equal(parsed.executablePayload?.targetStatus, 'DONE');
    });

    it('Case 7A: preserves existing task creation command "Create a high priority bug."', async () => {
      const parsed = await CommandParser.parse('Create a high priority bug.');
      assert.equal(parsed.action, 'create_task');
      assert.equal(parsed.parameters.priority, 'HIGH');
      assert.equal(parsed.executablePayload?.type, 'create_task');
      assert.equal(parsed.executablePayload?.priority, 'HIGH');
    });

    it('Case 7B: preserves existing overdue tasks command "Show overdue tasks."', async () => {
      const parsed = await CommandParser.parse('Show overdue tasks.');
      assert.equal(parsed.action, 'show_overdue');
      assert.equal(parsed.executablePayload?.type, 'filter_view');
      assert.equal(parsed.executablePayload?.filter, 'overdue');
    });

    it('extracts task title from assign command "Assign login task to Harshitha."', async () => {
      const parsed = await CommandParser.parse('Assign login task to Harshitha.');
      assert.equal(parsed.action, 'assign_task');
      assert.equal(parsed.parameters.query, 'login task');
      assert.equal(parsed.parameters.assignee, 'Harshitha');
      assert.equal(parsed.executablePayload?.targetQuery, 'login task');
    });
  });

  describe('Workspace Task Matching (Database / Scoped Tests)', () => {
    let workspaceAId: string;
    let workspaceBId: string;
    let projectAId: string;
    let projectBId: string;
    let userId: string;
    let apiTestingTaskId: string;
    let exactBracketTaskId: string;
    let similarTask1Id: string;
    let similarTask2Id: string;
    let workspaceBTaskId: string;

    it('sets up isolated test workspaces and tasks in database', async () => {
      const testTimestamp = Date.now();

      // Find or create a demo user
      const user = await prisma.user.upsert({
        where: { email: `test-matcher-${testTimestamp}@collabai.internal` },
        update: {},
        create: {
          email: `test-matcher-${testTimestamp}@collabai.internal`,
          name: 'Task Matcher Tester',
          password: 'hashedPasswordPlaceholder123',
        },
      });
      userId = user.id;

      // Create Workspace A
      const wsA = await prisma.workspace.create({
        data: {
          name: `Test Workspace A ${testTimestamp}`,
          memberships: {
            create: {
              userId,
              role: 'ADMIN',
            },
          },
        },
      });
      workspaceAId = wsA.id;

      const projA = await prisma.project.create({
        data: {
          name: `Project A ${testTimestamp}`,
          workspaceId: workspaceAId,
          creatorId: userId,
        },
      });
      projectAId = projA.id;

      // Create Workspace B (isolated workspace)
      const wsB = await prisma.workspace.create({
        data: {
          name: `Test Workspace B ${testTimestamp}`,
          memberships: {
            create: {
              userId,
              role: 'ADMIN',
            },
          },
        },
      });
      workspaceBId = wsB.id;

      const projB = await prisma.project.create({
        data: {
          name: `Project B ${testTimestamp}`,
          workspaceId: workspaceBId,
          creatorId: userId,
        },
      });
      projectBId = projB.id;

      // Create Case 1 Task: "API testing" in Workspace A
      const task1 = await prisma.task.create({
        data: {
          title: 'API testing',
          status: 'TODO',
          projectId: projectAId,
          workspaceId: workspaceAId,
          creatorId: userId,
        },
      });
      apiTestingTaskId = task1.id;

      // Create Case 2 Task: "an existing exact task title" in Workspace A
      const task2 = await prisma.task.create({
        data: {
          title: 'an existing exact task title',
          status: 'TODO',
          projectId: projectAId,
          workspaceId: workspaceAId,
          creatorId: userId,
        },
      });
      exactBracketTaskId = task2.id;

      // Create Case 5 Tasks: Two tasks with similar titles in Workspace A
      const sim1 = await prisma.task.create({
        data: {
          title: 'Database migration unit tests',
          status: 'TODO',
          projectId: projectAId,
          workspaceId: workspaceAId,
          creatorId: userId,
        },
      });
      similarTask1Id = sim1.id;

      const sim2 = await prisma.task.create({
        data: {
          title: 'Database migration performance tests',
          status: 'TODO',
          projectId: projectAId,
          workspaceId: workspaceAId,
          creatorId: userId,
        },
      });
      similarTask2Id = sim2.id;

      // Create Case 6 Task: Task belonging to Workspace B with title "Secret Workspace B Task"
      const taskB = await prisma.task.create({
        data: {
          title: 'Secret Workspace B Task',
          status: 'TODO',
          projectId: projectBId,
          workspaceId: workspaceBId,
          creatorId: userId,
        },
      });
      workspaceBTaskId = taskB.id;
    });

    it('Case 1: matches exact task "API testing" in authorized workspace', async () => {
      const match = await TaskMatchingService.matchTaskInWorkspace(workspaceAId, 'Move API testing to Done.');
      assert.equal(match.status, 'exact');
      assert.ok(match.task);
      assert.equal(match.task?.id, apiTestingTaskId);
      assert.equal(match.task?.title, 'API testing');
    });

    it('Case 2: matches exact task with brackets "Move [an existing exact task title] to In Progress."', async () => {
      const match = await TaskMatchingService.matchTaskInWorkspace(
        workspaceAId,
        'Move [an existing exact task title] to In Progress.'
      );
      assert.equal(match.status, 'exact');
      assert.ok(match.task);
      assert.equal(match.task?.id, exactBracketTaskId);
      assert.equal(match.task?.title, 'an existing exact task title');
    });

    it('Case 3: matches task with different capitalization ("move api testing to done")', async () => {
      const match = await TaskMatchingService.matchTaskInWorkspace(workspaceAId, 'move api testing to done');
      assert.equal(match.status, 'exact');
      assert.ok(match.task);
      assert.equal(match.task?.id, apiTestingTaskId);
      assert.equal(match.task?.title, 'API testing');
    });

    it('Case 4: returns "none" and helpful message for a nonexistent task', async () => {
      const match = await TaskMatchingService.matchTaskInWorkspace(
        workspaceAId,
        'Move Nonexistent Task 998877 to Done.'
      );
      assert.equal(match.status, 'none');
      assert.equal(match.matches.length, 0);
      assert.match(match.message, /Could not find matching task for "Nonexistent Task 998877"/);
      assert.match(match.message, /Please check the task title or verify you are in the correct workspace/);
    });

    it('Case 5: detects ambiguity for two similar tasks and does NOT update a random task', async () => {
      // Query "Database migration" matches both "Database migration unit tests" and "Database migration performance tests"
      const match = await TaskMatchingService.matchTaskInWorkspace(
        workspaceAId,
        'Move Database migration to Done.'
      );
      assert.equal(match.status, 'multiple');
      assert.equal(match.matches.length, 2);
      assert.equal(match.task, undefined); // Crucial: must NOT pick a task automatically
      assert.match(match.message, /Found 2 tasks matching "Database migration"/);
      assert.match(match.message, /Please choose which task to update/);

      const matchIds = match.matches.map((m) => m.id);
      assert.ok(matchIds.includes(similarTask1Id));
      assert.ok(matchIds.includes(similarTask2Id));
    });

    it('Case 6: strictly isolates workspaces; does not match task belonging to Workspace B from Workspace A', async () => {
      // Searching for Workspace B's task from Workspace A must fail
      const matchInA = await TaskMatchingService.matchTaskInWorkspace(
        workspaceAId,
        'Move Secret Workspace B Task to Done.'
      );
      assert.equal(matchInA.status, 'none');
      assert.equal(matchInA.matches.length, 0);

      // But searching within Workspace B should succeed
      const matchInB = await TaskMatchingService.matchTaskInWorkspace(
        workspaceBId,
        'Move Secret Workspace B Task to Done.'
      );
      assert.equal(matchInB.status, 'exact');
      assert.equal(matchInB.task?.id, workspaceBTaskId);
    });

    it('cleans up test workspace data', async () => {
      const taskIds = [apiTestingTaskId, exactBracketTaskId, similarTask1Id, similarTask2Id, workspaceBTaskId].filter(Boolean);
      if (taskIds.length > 0) {
        await prisma.task.deleteMany({
          where: { id: { in: taskIds } },
        });
      }
      const projectIds = [projectAId, projectBId].filter(Boolean);
      if (projectIds.length > 0) {
        await prisma.project.deleteMany({
          where: { id: { in: projectIds } },
        });
      }
      const workspaceIds = [workspaceAId, workspaceBId].filter(Boolean);
      if (workspaceIds.length > 0) {
        await prisma.membership.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });
        await prisma.workspace.deleteMany({
          where: { id: { in: workspaceIds } },
        });
      }
      if (userId) {
        await prisma.user.deleteMany({
          where: { id: userId },
        });
      }
    });
  });
});
