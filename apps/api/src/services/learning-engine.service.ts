/**
 * @file services/learning-engine.service.ts
 *
 * Primary Orchestration Service for AI Learning Engine.
 * Integrates Project & Sprint Retrospectives, Historical AI Estimations,
 * Team Coaching Insights, Reusable Templates, AI Best Practices, Pre-Flight Recommendations,
 * Organizational Learning Knowledge Base, and Improvement Dashboard Benchmarks.
 */

import { prisma } from '../lib/prisma.js';
import { RetrospectiveGeneratorService } from '../ai/services/retrospective-generator.service.js';
import { EstimationEngineService } from '../ai/services/estimation-engine.service.js';
import { PatternAnalyzerService } from '../ai/services/pattern-analyzer.service.js';
import { TemplateGeneratorService } from '../ai/services/template-generator.service.js';
import { KnowledgeService } from './knowledge.service.js';
import { VectorStoreProvider } from '../ai/services/vector-store.provider.js';
import type {
  ProjectRetrospectiveData,
  SprintRetrospectiveData,
  AIEstimationRequest,
  AIEstimationResult,
  TeamPerformanceInsight,
  ProjectTemplateData,
  LearningPatternData,
  PreFlightRecommendation,
  ImprovementDashboardMetrics,
} from '../ai/types/learning.types.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class LearningEngineService {
  /**
   * Feature 1: Generate or Fetch Project Retrospective
   */
  static async getOrGenerateProjectRetrospective(
    workspaceId: string,
    projectId: string,
    creatorId: string
  ): Promise<ProjectRetrospectiveData> {
    const existing = await prisma.projectRetrospective.findUnique({
      where: { projectId },
    });

    if (existing) {
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      const parseArr = (val: string | null | undefined): string[] => {
        if (!val) return [];
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [val];
        } catch {
          return [val];
        }
      };

      return {
        id: existing.id,
        projectId: existing.projectId,
        projectName: proj?.name || 'Project',
        whatWentWell: parseArr(existing.whatWentWell),
        whatCausedDelays: parseArr(existing.whatCausedDelays),
        biggestBlockers: parseArr(existing.biggestBlockers),
        teamAchievements: parseArr(existing.teamAchievements),
        lessonsLearned: parseArr(existing.lessonsLearned),
        futureRecommendations: parseArr(existing.futureRecommendations),
        summary: existing.summary || '',
        status: existing.status || 'COMPLETED',
        createdAt: existing.createdAt.toISOString(),
      };
    }

    const projectDb = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            estimatedHours: true,
            dueDate: true,
            updatedAt: true,
            assignee: { select: { name: true, email: true } },
          },
        },
        documents: { select: { title: true, content: true } },
      },
    });

    if (!projectDb) throw new NotFoundError('Project not found');

    const generated = await RetrospectiveGeneratorService.generateProjectRetrospective(projectDb as any);

    const created = await prisma.projectRetrospective.create({
      data: {
        projectId,
        workspaceId,
        creatorId,
        whatWentWell: JSON.stringify(generated.whatWentWell),
        whatCausedDelays: JSON.stringify(generated.whatCausedDelays),
        biggestBlockers: JSON.stringify(generated.biggestBlockers),
        teamAchievements: JSON.stringify(generated.teamAchievements),
        lessonsLearned: JSON.stringify(generated.lessonsLearned),
        futureRecommendations: JSON.stringify(generated.futureRecommendations),
        summary: generated.summary,
        status: 'COMPLETED',
      },
    });

    // Automatically index lessons learned into Workspace Knowledge Base & Vector Store
    const kItem = await prisma.knowledgeItem.create({
      data: {
        workspaceId,
        projectId,
        title: `Project Retrospective & Lessons Learned: ${projectDb.name}`,
        content: `Summary: ${generated.summary}\n\nLessons Learned:\n- ${generated.lessonsLearned.join('\n- ')}\n\nFuture Recommendations:\n- ${generated.futureRecommendations.join('\n- ')}`,
        type: 'RETROSPECTIVE',
        tags: ['RETROSPECTIVE', 'LESSONS_LEARNED', projectDb.name].join(','),
      },
    });

    VectorStoreProvider.indexDocument({
      id: kItem.id,
      workspaceId,
      projectId,
      title: kItem.title,
      content: kItem.content,
      type: 'RETROSPECTIVE',
      tags: kItem.tags ? kItem.tags.split(',') : [],
    });

    return {
      ...generated,
      id: created.id,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Save / Update Project Retrospective
   */
  static async updateProjectRetrospective(
    retrospectiveId: string,
    data: Partial<ProjectRetrospectiveData>
  ) {
    const updatePayload: any = {};
    if (data.whatWentWell) updatePayload.whatWentWell = JSON.stringify(data.whatWentWell);
    if (data.whatCausedDelays) updatePayload.whatCausedDelays = JSON.stringify(data.whatCausedDelays);
    if (data.biggestBlockers) updatePayload.biggestBlockers = JSON.stringify(data.biggestBlockers);
    if (data.teamAchievements) updatePayload.teamAchievements = JSON.stringify(data.teamAchievements);
    if (data.lessonsLearned) updatePayload.lessonsLearned = JSON.stringify(data.lessonsLearned);
    if (data.futureRecommendations) updatePayload.futureRecommendations = JSON.stringify(data.futureRecommendations);
    if (data.summary !== undefined) updatePayload.summary = data.summary;

    const updated = await prisma.projectRetrospective.update({
      where: { id: retrospectiveId },
      data: updatePayload,
    });

    return updated;
  }

  /**
   * Feature 2: Historical AI Estimation Engine
   */
  static async estimateTaskEffort(
    workspaceId: string,
    req: AIEstimationRequest
  ): Promise<AIEstimationResult> {
    if (!req.taskTitle || !req.taskTitle.trim()) {
      throw new BadRequestError('Task title is required for estimation');
    }
    return EstimationEngineService.estimateTask(workspaceId, req);
  }

  /**
   * Feature 3: Team Performance Coaching Insights
   */
  static async getTeamPerformanceInsights(workspaceId: string): Promise<TeamPerformanceInsight> {
    return PatternAnalyzerService.getTeamPerformanceInsights(workspaceId);
  }

  /**
   * Feature 4: Reusable Project Templates
   */
  static async getProjectTemplates(workspaceId: string): Promise<ProjectTemplateData[]> {
    return TemplateGeneratorService.getRecommendedTemplates(workspaceId);
  }

  static async instantiateTemplate(
    workspaceId: string,
    creatorId: string,
    templateId: string,
    projectName: string,
    projectDescription?: string
  ) {
    return TemplateGeneratorService.instantiateProjectFromTemplate(
      workspaceId,
      creatorId,
      templateId,
      projectName,
      projectDescription
    );
  }

  /**
   * Feature 5: AI Best Practices Engine
   */
  static async getAIBestPractices(workspaceId: string): Promise<LearningPatternData[]> {
    return PatternAnalyzerService.getAIBestPractices(workspaceId);
  }

  /**
   * Feature 6: Sprint Retrospective
   */
  static async createSprintRetrospective(
    workspaceId: string,
    creatorId: string,
    sprintName: string,
    projectId?: string
  ): Promise<SprintRetrospectiveData> {
    const tasks = await prisma.task.findMany({
      where: { project: { workspaceId } },
      select: { title: true, status: true, estimatedHours: true },
      take: 20,
    });

    const generated = await RetrospectiveGeneratorService.generateSprintRetrospective(
      sprintName,
      tasks
    );

    const created = await prisma.sprintRetrospective.create({
      data: {
        sprintName,
        workspaceId,
        projectId: projectId || null,
        creatorId,
        completedWork: JSON.stringify(generated.completedWork),
        missedGoals: JSON.stringify(generated.missedGoals),
        unexpectedIssues: JSON.stringify(generated.unexpectedIssues),
        successFactors: JSON.stringify(generated.successFactors),
        improvementSuggestions: JSON.stringify(generated.improvementSuggestions),
        actionItems: JSON.stringify(generated.actionItems),
      },
    });

    return {
      ...generated,
      id: created.id,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Feature 7: Organizational Learning Repository Q&A Search
   */
  static async searchOrganizationalKnowledge(workspaceId: string, query: string) {
    return KnowledgeService.semanticSearch(query, workspaceId);
  }

  /**
   * Feature 8: AI Pre-Flight Recommendations
   */
  static async getPreFlightRecommendations(
    workspaceId: string,
    projectName: string
  ): Promise<PreFlightRecommendation> {
    return PatternAnalyzerService.getPreFlightRecommendations(workspaceId, projectName);
  }

  /**
   * Feature 9: Improvement Dashboard Metrics & Benchmarks
   */
  static async getImprovementDashboardMetrics(
    workspaceId: string
  ): Promise<ImprovementDashboardMetrics> {
    return PatternAnalyzerService.getImprovementMetrics(workspaceId);
  }
}
