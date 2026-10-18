/**
 * @file ai/services/simulation-recommendation.engine.ts
 *
 * AI Simulation Recommendation Engine.
 * Analyzes impact output, workload bottlenecks, critical path delays, and blocked tasks
 * to generate actionable recommendations with reasons, expected improvements,
 * confidence scores, and executable action payloads for live project application.
 */

import type {
  ImpactAnalysis,
  SimulatedTask,
  SimulationRecommendation,
} from '../types/simulation.types.js';

export class SimulationRecommendationEngine {
  static generateRecommendations(
    impact: ImpactAnalysis,
    simulatedTasks: SimulatedTask[]
  ): SimulationRecommendation[] {
    const recommendations: SimulationRecommendation[] = [];

    const overloadedMembers = Object.values(impact.workloadDistribution).filter((w) => w.isOverloaded);
    const underloadedMembers = Object.values(impact.workloadDistribution).filter(
      (w) => w.utilizationPercentage < 65
    );

    if (overloadedMembers.length > 0 && underloadedMembers.length > 0) {
      const topOverloaded = overloadedMembers[0];
      const topUnderloaded = underloadedMembers[0];

      if (topOverloaded && topUnderloaded) {
        const candidateTask = simulatedTasks.find(
          (t) => t.assigneeId === topOverloaded.userId && t.status !== 'DONE'
        );

        if (candidateTask) {
          recommendations.push({
            id: `rec-reassign-${Date.now()}-1`,
            title: `Reassign "${candidateTask.title}" to ${topUnderloaded.userName}`,
            action: `Reassign ${candidateTask.title} from ${topOverloaded.userName} (${topOverloaded.utilizationPercentage}% load) to ${topUnderloaded.userName} (${topUnderloaded.utilizationPercentage}% load).`,
            reason: `${topOverloaded.userName} is currently overloaded at ${topOverloaded.utilizationPercentage}% capacity, creating a velocity bottleneck on critical path.`,
            expectedImprovement: `Reduces project risk by 25% and balances workload utilization across team members.`,
            confidenceScore: 92,
            actionPayload: {
              type: 'REASSIGN_TASK',
              taskId: candidateTask.id,
              assigneeId: topUnderloaded.userId,
              assigneeName: topUnderloaded.userName,
            },
          });
        }
      }
    }

    if (impact.sprintDelayDays > 0) {
      recommendations.push({
        id: `rec-sprint-${Date.now()}-2`,
        title: `Extend current sprint by ${Math.min(7, impact.sprintDelayDays + 2)} days`,
        action: `Increase sprint duration by ${Math.min(7, impact.sprintDelayDays + 2)} days to absorb delayed critical path items.`,
        reason: `Current critical path task sequence delays sprint completion date beyond original target.`,
        expectedImprovement: `Prevents technical debt accumulation and recovers delivery confidence to ${Math.min(95, impact.deliveryConfidenceScore + 18)}%.`,
        confidenceScore: 89,
        actionPayload: {
          type: 'EXTEND_SPRINT',
          days: Math.min(7, impact.sprintDelayDays + 2),
        },
      });
    }

    const unassignedTasks = simulatedTasks.filter((t) => !t.assigneeId || t.isBlocked);
    if (unassignedTasks.length > 0) {
      const target = unassignedTasks[0];
      const availableDev = Object.values(impact.workloadDistribution).sort(
        (a, b) => a.utilizationPercentage - b.utilizationPercentage
      )[0];

      if (target && availableDev) {
        recommendations.push({
          id: `rec-unassigned-${Date.now()}-3`,
          title: `Assign ${availableDev.userName} to ${target.title}`,
          action: `Assign unallocated task "${target.title}" directly to ${availableDev.userName}.`,
          reason: `Task is currently unassigned/blocked and risks falling off current sprint scope.`,
          expectedImprovement: `Eliminates 1 blocked task dependency and accelerates completion by 3 days.`,
          confidenceScore: 95,
          actionPayload: {
            type: 'ASSIGN_TASK',
            taskId: target.id,
            assigneeId: availableDev.userId,
            assigneeName: availableDev.userName,
          },
        });
      }
    }

    const largeTasks = simulatedTasks.filter((t) => t.estimatedHours >= 40 && t.status !== 'DONE');
    if (largeTasks.length > 0) {
      const large = largeTasks[0];
      if (large) {
        recommendations.push({
          id: `rec-split-${Date.now()}-4`,
          title: `Split "${large.title}" into 2 smaller tasks`,
          action: `Decompose task "${large.title}" (${large.estimatedHours}h) into Phase 1 Core Implementation and Phase 2 Integration.`,
          reason: `Monolithic tasks (>40 hours) have high variance and increase critical path float uncertainty.`,
          expectedImprovement: `Improves sprint progress tracking visibility and reduces estimation variance by 35%.`,
          confidenceScore: 88,
          actionPayload: {
            type: 'SPLIT_TASK',
            taskId: large.id,
          },
        });
      }
    }

    if (impact.projectDelayDays >= 5 || impact.resourceUtilizationPercentage > 95) {
      recommendations.push({
        id: `rec-hire-${Date.now()}-5`,
        title: `Add 1 Additional Senior Developer to Backend Team`,
        action: `Onboard 1 temporary engineering resource to absorb critical path workload.`,
        reason: `Overall team utilization is near maximum (${impact.resourceUtilizationPercentage}%) with ${impact.projectDelayDays} days project delay.`,
        expectedImprovement: `Recovers ${Math.max(4, impact.projectDelayDays)} days of project schedule delay and reduces team burnout score.`,
        confidenceScore: 91,
        actionPayload: {
          type: 'ADD_DEVELOPER',
          developerRole: 'Senior Backend Engineer',
        },
      });
    }

    return recommendations;
  }
}
