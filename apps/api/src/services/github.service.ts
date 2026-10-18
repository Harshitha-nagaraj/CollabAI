/**
 * @file services/github.service.ts
 *
 * Service for GitHub Repository management, PR sync, commit records, and engineering metrics.
 */

import { prisma } from '../lib/prisma.js';
import { PRSummaryEngine } from '../ai/services/pr-summary.service.js';
import { ReleaseGeneratorEngine } from '../ai/services/release-generator.service.js';
import { DependencyCodeAnalyzerEngine } from '../ai/services/dependency-code-analyzer.service.js';

export class GitHubService {
  /**
   * List connected GitHub repositories for a workspace
   */
  static async getRepositories(workspaceId: string) {
    return prisma.gitHubRepository.findMany({
      where: { workspaceId },
      include: {
        pullRequests: { take: 5, orderBy: { createdAt: 'desc' } },
        commits: { take: 5, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Connect a new GitHub repository
   */
  static async connectRepository(payload: {
    name: string;
    owner: string;
    fullName: string;
    url: string;
    isPrivate?: boolean;
    workspaceId: string;
    projectId?: string | null;
  }) {
    return prisma.gitHubRepository.create({
      data: {
        name: payload.name,
        owner: payload.owner,
        fullName: payload.fullName,
        url: payload.url,
        isPrivate: payload.isPrivate || false,
        workspaceId: payload.workspaceId,
        projectId: payload.projectId || null,
      },
    });
  }

  /**
   * Fetch pull requests for workspace
   */
  static async getPullRequests(workspaceId: string) {
    return prisma.pullRequest.findMany({
      where: { repository: { workspaceId } },
      include: {
        repository: { select: { id: true, name: true, fullName: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Trigger AI PR Summarization
   */
  static async summarizePullRequest(prId: string) {
    const pr = await prisma.pullRequest.findUnique({ where: { id: prId } });
    if (!pr) throw new Error('Pull Request not found');

    const summary = await PRSummaryEngine.summarize(pr.title, pr.description);

    return prisma.pullRequest.update({
      where: { id: prId },
      data: {
        aiSummary: summary.summary,
        securityNotes: summary.securityNotes,
      },
    });
  }

  /**
   * Generate Release Notes
   */
  static async generateReleaseNotes(payload: {
    version: string;
    workspaceId: string;
    projectId?: string | null;
  }) {
    const prs = await prisma.pullRequest.findMany({
      where: { repository: { workspaceId: payload.workspaceId }, state: 'MERGED' },
      take: 10,
    });

    const tasks = await prisma.task.findMany({
      where: { project: { workspaceId: payload.workspaceId }, status: 'DONE' },
      take: 10,
    });

    const decisions = await prisma.decision.findMany({
      where: { workspaceId: payload.workspaceId },
      take: 5,
    });

    const generated = await ReleaseGeneratorEngine.generate({
      version: payload.version,
      mergedPRs: prs.map((p) => ({ title: p.title, number: p.number ?? p.prNumber, author: p.author })),
      completedTasks: tasks.map((t) => ({ title: t.title, priority: t.priority })),
      meetingDecisions: decisions.map((d) => ({ title: d.title, category: d.category || 'GENERAL' })),
    });

    return prisma.releaseNote.create({
      data: {
        version: generated.version,
        title: generated.title,
        content: generated.content,
        workspaceId: payload.workspaceId,
        projectId: payload.projectId || null,
      },
    });
  }

  /**
   * Fetch Release Notes
   */
  static async getReleaseNotes(workspaceId: string) {
    return prisma.releaseNote.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch Engineering Dashboard Analytics
   */
  static async getEngineeringAnalytics(workspaceId: string) {
    const repos = await prisma.gitHubRepository.findMany({ where: { workspaceId } });
    const prs = await prisma.pullRequest.findMany({ where: { repository: { workspaceId } } });

    const openPRs = prs.filter((p) => p.state === 'OPEN');
    const mergedPRs = prs.filter((p) => p.state === 'MERGED');

    const codeDependencyAnalysis = DependencyCodeAnalyzerEngine.analyze(
      openPRs.map((p) => ({ number: p.number ?? p.prNumber, title: p.title, headBranch: p.headBranch || 'main' }))
    );

    return {
      connectedRepositoriesCount: repos.length,
      openPullRequestsCount: openPRs.length,
      mergedPullRequestsCount: mergedPRs.length,
      reviewQueueCount: openPRs.length,
      deploymentStatus: 'PRODUCTION_HEALTHY',
      codeHealthScore: 94,
      sprintCompletionPercentage: 78,
      codeDependencyAnalysis,
    };
  }
}
