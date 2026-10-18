/**
 * @file services/github-webhook.service.ts
 *
 * GitHub Webhook Event Processor.
 * Automatically synchronizes PR activity to drive project task status transitions:
 * - PR Opened  -> Moves Task to IN_REVIEW
 * - PR Merged  -> Moves Task to DONE
 * - PR Closed  -> Dispatches alert notification to assignee
 */

import { prisma } from '../lib/prisma.js';
import { NotificationService } from './notification.service.js';
import { CommitAnalyzerEngine } from '../ai/services/commit-analyzer.service.js';
import { logger } from '../utils/logger.js';

export interface GitHubWebhookPayload {
  event: 'pull_request' | 'push' | 'issues';
  action?: 'opened' | 'closed' | 'reopened' | 'synchronize';
  pull_request?: {
    number: number;
    title: string;
    body?: string;
    state: string;
    merged?: boolean;
    head: { ref: string };
    base: { ref: string };
    html_url: string;
    user: { login: string };
  };
  repository?: {
    name: string;
    full_name: string;
    owner: { login: string };
    html_url: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    url: string;
    author: { name: string; email?: string };
  }>;
  workspaceId?: string;
}

export class GitHubWebhookService {
  /**
   * Process incoming GitHub webhook event payload
   */
  static async handleWebhook(payload: GitHubWebhookPayload) {
    logger.info(`Received GitHub Webhook event: ${payload.event} (action: ${payload.action || 'N/A'})`);

    const repoName = payload.repository?.full_name || 'collabai/core';

    // Find linked repository record
    const repository = await prisma.gitHubRepository.findFirst({
      where: { fullName: repoName },
    });

    const workspaceId = repository?.workspaceId || payload.workspaceId || 'demo-workspace';

    // 1. Process Pull Request Events
    if (payload.event === 'pull_request' && payload.pull_request) {
      const prData = payload.pull_request;
      const isMerged = prData.merged || prData.state === 'closed';

      // Match linked task in title or description e.g. #123 or TASK-101
      const textToMatch = `${prData.title} ${prData.body || ''}`;
      const match = textToMatch.match(/(?:#|collab-|task-)([0-9a-fA-F-]+)/i);
      const matchedTaskId = match ? match[1] : null;

      // Find task if valid UUID or title match
      let linkedTask = matchedTaskId
        ? await prisma.task.findFirst({ where: { OR: [{ id: matchedTaskId }, { title: { contains: prData.title } }] } })
        : await prisma.task.findFirst({ where: { project: { workspaceId } } });

      const prState = isMerged ? 'MERGED' : prData.state.toUpperCase();

      // Upsert PullRequest record
      const prRecord = await prisma.pullRequest.upsert({
        where: { id: `pr-${repoName.replace('/', '-')}-${prData.number}` },
        update: {
          title: prData.title,
          description: prData.body || null,
          state: prState,
          headBranch: prData.head.ref,
          baseBranch: prData.base.ref,
          taskId: linkedTask?.id || null,
        },
        create: {
          id: `pr-${repoName.replace('/', '-')}-${prData.number}`,
          number: prData.number,
          title: prData.title,
          description: prData.body || null,
          state: prState,
          headBranch: prData.head.ref,
          baseBranch: prData.base.ref,
          author: prData.user.login,
          url: prData.html_url,
          repoId: repository?.id || 'demo-repo-id',
          taskId: linkedTask?.id || null,
        },
      });

      // ─── AUTOMATIC TASK UPDATES ──────────────────────────────────────────
      if (linkedTask) {
        if (payload.action === 'opened') {
          // Rule 1: PR Opened -> Move Task to IN_REVIEW
          await prisma.task.update({
            where: { id: linkedTask.id },
            data: { status: 'IN_REVIEW', progress: 80 },
          });

          if (linkedTask.assigneeId) {
            await NotificationService.createNotification({
              userId: linkedTask.assigneeId,
              workspaceId,
              title: `PR Opened for Task: ${linkedTask.title}`,
              message: `Pull Request #${prData.number} opened by @${prData.user.login}. Task status set to IN_REVIEW.`,
              type: 'PR_OPENED',
              link: '/dashboard/github',
            });
          }
        } else if (payload.action === 'closed' && prData.merged) {
          // Rule 2: PR Merged -> Move Task to DONE
          await prisma.task.update({
            where: { id: linkedTask.id },
            data: { status: 'DONE', progress: 100 },
          });

          if (linkedTask.assigneeId) {
            await NotificationService.createNotification({
              userId: linkedTask.assigneeId,
              workspaceId,
              title: `🎉 PR Merged! Task Completed`,
              message: `Pull Request #${prData.number} was merged into ${prData.base.ref}. Task marked as DONE.`,
              type: 'PR_MERGED',
              link: '/dashboard/kanban',
            });
          }
        } else if (payload.action === 'closed' && !prData.merged) {
          // Rule 3: PR Closed (Unmerged) -> Notify Assignee
          if (linkedTask.assigneeId) {
            await NotificationService.createNotification({
              userId: linkedTask.assigneeId,
              workspaceId,
              title: `PR Closed Unmerged: ${linkedTask.title}`,
              message: `Pull Request #${prData.number} was closed without merging. Check PR status.`,
              type: 'PR_CLOSED',
              link: '/dashboard/github',
            });
          }
        }
      }

      return { success: true, event: 'pull_request', prId: prRecord.id, linkedTaskId: linkedTask?.id };
    }

    // 2. Process Push Events (Commits)
    if (payload.event === 'push' && payload.commits?.length) {
      const processedCommits = [];
      for (const c of payload.commits) {
        const analyzed = CommitAnalyzerEngine.analyze(c.message, c.author.name, c.id);

        if (repository?.id) {
          const record = await prisma.commitRecord.create({
            data: {
              hash: c.id,
              message: c.message,
              author: c.author.name,
              authorName: c.author.name,
              authorEmail: c.author.email || null,
              url: c.url,
              repoId: repository.id,
            },
          });
          processedCommits.push(record);
        }
      }
      return { success: true, event: 'push', commitsProcessed: processedCommits.length };
    }

    return { success: true, message: 'Webhook event processed successfully.' };
  }
}
