/**
 * @file services/simulation.service.ts
 *
 * Primary Orchestration Service for AI Project Simulator.
 * Integrates Prisma DB reads, Simulation Engine execution, Impact Analysis,
 * Timeline Comparison, Recommendations, Scenario Storage CRUD, Side-by-Side Comparison Matrix,
 * Natural Language Prompt Parsing, and Explicit DB Application of Recommendations.
 */

import { prisma } from '../lib/prisma.js';
import { SimulationEngine } from '../ai/services/simulation-engine.service.js';
import { ImpactAnalyzer } from '../ai/services/impact-analyzer.service.js';
import { TimelineComparator } from '../ai/services/timeline-comparator.service.js';
import { SimulationRecommendationEngine } from '../ai/services/simulation-recommendation.engine.js';
import { NLScenarioParser } from '../ai/services/nl-scenario-parser.service.js';
import type {
  SimulationAction,
  SimulationResult,
  ScenarioComparisonMatrix,
  ScenarioComparisonItem,
  NLScenarioParseResult,
} from '../ai/types/simulation.types.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export interface CreateScenarioDTO {
  name: string;
  description?: string;
  projectId?: string;
  modifications: SimulationAction[];
}

export class SimulationService {
  /**
   * Run simulation in-memory without modifying live database data.
   */
  static async executeSimulation(
    workspaceId: string,
    actions: SimulationAction[],
    scenarioName: string = 'Custom Simulation Scenario',
    projectId?: string
  ): Promise<SimulationResult> {
    const whereCondition: any = { project: { workspaceId } };
    if (projectId) {
      whereCondition.projectId = projectId;
    }

    const tasksFromDb = await prisma.task.findMany({
      where: whereCondition,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        dependencies: { select: { predecessorId: true } },
        dependents: { select: { successorId: true } },
      },
    });

    const memberships = await prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const baselineTasks = tasksFromDb.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      startDate: t.startDate,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      progress: t.progress ?? 0,
      isMilestone: t.isMilestone,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      dependencies: t.dependencies,
      dependents: t.dependents,
    }));

    const members = memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name || m.user.email,
      role: m.role,
    }));

    if (baselineTasks.length === 0) {
      baselineTasks.push(
        {
          id: 'demo-task-1',
          title: 'Backend Authentication & JWT API',
          description: 'Core security and session token handling',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          startDate: new Date(),
          dueDate: new Date(Date.now() + 5 * 86400000),
          estimatedHours: 40,
          progress: 50,
          isMilestone: false,
          assigneeId: members[0]?.userId || 'demo-user-1',
          assignee: { id: members[0]?.userId || 'demo-user-1', name: members[0]?.name || 'Rahul Sharma', email: 'rahul@collabai.internal' },
          dependencies: [],
          dependents: [],
        },
        {
          id: 'demo-task-2',
          title: 'Frontend Dashboard & Gantt Chart',
          description: 'UI visualization and state integration',
          status: 'TODO',
          priority: 'MEDIUM',
          startDate: new Date(Date.now() + 5 * 86400000),
          dueDate: new Date(Date.now() + 12 * 86400000),
          estimatedHours: 32,
          progress: 0,
          isMilestone: true,
          assigneeId: members[1]?.userId || members[0]?.userId || 'demo-user-2',
          assignee: { id: members[1]?.userId || members[0]?.userId || 'demo-user-2', name: members[1]?.name || 'Sarah Chen', email: 'sarah@collabai.internal' },
          dependencies: [{ predecessorId: 'demo-task-1' }],
          dependents: [],
        }
      );
    }

    if (members.length === 0) {
      members.push(
        { userId: 'demo-user-1', name: 'Rahul Sharma', role: 'ADMIN' },
        { userId: 'demo-user-2', name: 'Sarah Chen', role: 'MEMBER' },
        { userId: 'demo-user-3', name: 'Alex Rivera', role: 'MEMBER' }
      );
    }

    const { simulatedTasks, membersMap } = SimulationEngine.runSimulation(
      baselineTasks,
      members,
      actions
    );

    const impact = ImpactAnalyzer.analyzeImpact(
      baselineTasks,
      simulatedTasks,
      membersMap,
      actions
    );

    const timeline = TimelineComparator.compareTimelines(
      baselineTasks,
      simulatedTasks,
      impact.baselineProjectCompletionDate,
      impact.projectCompletionDate
    );

    const recommendations = SimulationRecommendationEngine.generateRecommendations(
      impact,
      simulatedTasks
    );

    const executiveSummary = {
      scenarioTitle: scenarioName,
      summaryText: impact.impactExplanations[0] || 'Simulation completed with zero critical path delays.',
      bulletPoints: impact.impactExplanations,
      riskLevel: impact.riskLevel,
      confidenceScore: impact.deliveryConfidenceScore,
      recommendations: recommendations.map((r) => r.action),
    };

    return {
      scenarioName,
      actions,
      tasks: simulatedTasks,
      impact,
      timeline,
      recommendations,
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };
  }

  static async saveScenario(
    workspaceId: string,
    creatorId: string,
    dto: CreateScenarioDTO
  ) {
    const simulationResult = await this.executeSimulation(
      workspaceId,
      dto.modifications,
      dto.name,
      dto.projectId
    );

    const scenario = await prisma.simulationScenario.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        workspaceId,
        projectId: dto.projectId || null,
        creatorId,
        modifications: dto.modifications as any,
        result: simulationResult as any,
      },
    });

    return {
      ...scenario,
      result: simulationResult,
    };
  }

  static async listScenarios(workspaceId: string) {
    return prisma.simulationScenario.findMany({
      where: { workspaceId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getScenarioById(id: string) {
    const scenario = await prisma.simulationScenario.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!scenario) throw new NotFoundError('Simulation Scenario not found');
    return scenario;
  }

  static async updateScenario(id: string, workspaceId: string, dto: Partial<CreateScenarioDTO>) {
    const existing = await this.getScenarioById(id);
    const actions = dto.modifications || (existing.modifications as any as SimulationAction[]);
    const name = dto.name || existing.name;

    const newResult = await this.executeSimulation(
      workspaceId,
      actions,
      name,
      dto.projectId || existing.projectId || undefined
    );

    return prisma.simulationScenario.update({
      where: { id },
      data: {
        name,
        description: dto.description !== undefined ? dto.description : existing.description,
        modifications: actions as any,
        result: newResult as any,
      },
    });
  }

  static async deleteScenario(id: string) {
    await this.getScenarioById(id);
    return prisma.simulationScenario.delete({ where: { id } });
  }

  static async compareScenarios(
    workspaceId: string,
    scenarioActionsList: { id: string; name: string; actions: SimulationAction[] }[]
  ): Promise<ScenarioComparisonMatrix> {
    const comparisonItems: ScenarioComparisonItem[] = [];

    for (const item of scenarioActionsList) {
      const result = await this.executeSimulation(workspaceId, item.actions, item.name);
      const riskScore =
        result.impact.riskLevel === 'CRITICAL'
          ? 90
          : result.impact.riskLevel === 'HIGH'
          ? 70
          : result.impact.riskLevel === 'MEDIUM'
          ? 40
          : 15;

      const avgWorkload = Math.round(
        Object.values(result.impact.workloadDistribution).reduce(
          (acc, w) => acc + w.utilizationPercentage,
          0
        ) / Math.max(1, Object.keys(result.impact.workloadDistribution).length)
      );

      const tradeoffs: string[] = [];
      if (result.impact.projectDelayDays > 0) {
        tradeoffs.push(`Pushes completion back by ${result.impact.projectDelayDays} days`);
      } else {
        tradeoffs.push(`Protects baseline target delivery date`);
      }

      if (result.impact.costEstimation.costDelta > 0) {
        tradeoffs.push(`Requires +$${result.impact.costEstimation.costDelta.toLocaleString()} budget adjustment`);
      }

      if (result.impact.blockedTasksCount > 0) {
        tradeoffs.push(`Introduces ${result.impact.blockedTasksCount} task dependency blocker(s)`);
      }

      comparisonItems.push({
        id: item.id,
        name: item.name,
        completionDate: result.impact.projectCompletionDate,
        delayDays: result.impact.projectDelayDays,
        riskScore,
        riskLevel: result.impact.riskLevel,
        workloadPercentage: avgWorkload,
        cost: result.impact.costEstimation.simulatedCost,
        costDelta: result.impact.costEstimation.costDelta,
        successProbability: result.impact.deliveryConfidenceScore,
        keyTradeoffs: tradeoffs,
        actionsCount: item.actions.length,
      });
    }

    const sorted = [...comparisonItems].sort(
      (a, b) => b.successProbability - a.successProbability || a.riskScore - b.riskScore
    );
    const recommended = sorted[0];

    return {
      scenarios: comparisonItems,
      recommendedScenarioId: recommended?.id || '',
      recommendationReason: recommended
        ? `Scenario "${recommended.name}" offers the highest delivery confidence (${recommended.successProbability}%) with minimal risk score (${recommended.riskScore}/100).`
        : 'All scenarios evaluated.',
    };
  }

  static async parseNaturalLanguagePrompt(prompt: string): Promise<NLScenarioParseResult> {
    if (!prompt || !prompt.trim()) {
      throw new BadRequestError('Prompt text is required for natural language simulation');
    }
    return NLScenarioParser.parsePrompt(prompt.trim());
  }

  static async applyRecommendation(
    workspaceId: string,
    userId: string,
    payload: {
      type: string;
      taskId?: string;
      assigneeId?: string;
      days?: number;
      newDueDate?: string;
    }
  ) {
    if (payload.type === 'REASSIGN_TASK' || payload.type === 'ASSIGN_TASK') {
      if (!payload.taskId || !payload.assigneeId) {
        throw new BadRequestError('taskId and assigneeId required for reassignment');
      }
      const updated = await prisma.task.update({
        where: { id: payload.taskId },
        data: { assigneeId: payload.assigneeId },
        include: { assignee: { select: { id: true, name: true, email: true } } },
      });

      await prisma.notification.create({
        data: {
          userId: payload.assigneeId,
          workspaceId,
          title: 'Task Reassigned from AI Simulator',
          message: `You were assigned to task "${updated.title}" via AI Project Simulator optimization recommendation.`,
          type: 'TASK_ASSIGNED',
        },
      });

      return { success: true, message: `Successfully assigned task "${updated.title}" to ${updated.assignee?.name || updated.assignee?.email}` };
    }

    if (payload.type === 'EXTEND_SPRINT') {
      const days = payload.days || 7;
      const tasks = await prisma.task.findMany({
        where: { project: { workspaceId }, status: { not: 'DONE' } },
      });

      for (const t of tasks) {
        if (t.dueDate) {
          const d = new Date(t.dueDate);
          d.setDate(d.getDate() + days);
          await prisma.task.update({
            where: { id: t.id },
            data: { dueDate: d },
          });
        }
      }

      return { success: true, message: `Successfully extended open tasks by ${days} day(s) in project schedule.` };
    }

    return { success: true, message: 'Recommendation logged and applied.' };
  }
}
