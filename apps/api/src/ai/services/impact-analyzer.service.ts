/**
 * @file ai/services/impact-analyzer.service.ts
 *
 * AI Impact Analyzer Service.
 * Compares baseline project state with simulated project state and computes:
 * - Sprint & Project completion dates and delays
 * - Critical path shifts
 * - Member workload distribution & utilization
 * - Delivery confidence score (%)
 * - Risk level classification
 * - Future-ready cost estimations ($ rate / developer hour)
 * - Clear explanations for every impact point.
 */

import type {
  ImpactAnalysis,
  SimulatedTask,
  WorkloadMember,
  SimulationAction,
} from '../types/simulation.types.js';
import type { RawTaskInput, RawMemberInput } from './simulation-engine.service.js';

export class ImpactAnalyzer {
  static analyzeImpact(
    baselineTasks: RawTaskInput[],
    simulatedTasks: SimulatedTask[],
    membersMap: Map<string, RawMemberInput>,
    actions: SimulationAction[]
  ): ImpactAnalysis {
    let baselineMaxDue = 0;
    for (const t of baselineTasks) {
      if (t.dueDate) {
        const d = new Date(t.dueDate).getTime();
        if (d > baselineMaxDue) baselineMaxDue = d;
      }
    }
    if (baselineMaxDue === 0) baselineMaxDue = Date.now() + 14 * 86400000;

    let simMaxDue = 0;
    for (const t of simulatedTasks) {
      if (t.dueDate) {
        const d = new Date(t.dueDate).getTime();
        if (d > simMaxDue) simMaxDue = d;
      }
    }
    if (simMaxDue === 0) simMaxDue = baselineMaxDue;

    const baselineDateObj = new Date(baselineMaxDue);
    const simDateObj = new Date(simMaxDue);

    const projectDelayDays = Math.max(
      0,
      Math.round((simMaxDue - baselineMaxDue) / (1000 * 60 * 60 * 24))
    );

    const sprintDelayDays = Math.max(0, projectDelayDays);

    const baselineSprintCompletionDate = baselineDateObj.toISOString().split('T')[0] || 'N/A';
    const sprintCompletionDate = simDateObj.toISOString().split('T')[0] || 'N/A';
    const baselineProjectCompletionDate = baselineDateObj.toISOString().split('T')[0] || 'N/A';
    const projectCompletionDate = simDateObj.toISOString().split('T')[0] || 'N/A';

    const criticalPathTaskIds = simulatedTasks.filter((t) => t.isCritical).map((t) => t.id);
    const criticalPathTaskTitles = simulatedTasks.filter((t) => t.isCritical).map((t) => t.title);
    const criticalPathChanged = criticalPathTaskIds.length > 0;

    const workloadDistribution: Record<string, WorkloadMember> = {};
    const memberHours: Record<string, number> = {};
    const memberBaselineHours: Record<string, number> = {};

    for (const mId of membersMap.keys()) {
      memberHours[mId] = 0;
      memberBaselineHours[mId] = 0;
    }

    for (const t of baselineTasks) {
      if (t.assigneeId && memberBaselineHours[t.assigneeId] !== undefined) {
        memberBaselineHours[t.assigneeId] = (memberBaselineHours[t.assigneeId] || 0) + (t.estimatedHours || 16);
      }
    }

    for (const t of simulatedTasks) {
      if (t.assigneeId && memberHours[t.assigneeId] !== undefined) {
        memberHours[t.assigneeId] = (memberHours[t.assigneeId] || 0) + t.estimatedHours;
      }
    }

    let totalSimHours = 0;
    let totalCapacityHours = 0;

    for (const [mId, m] of membersMap.entries()) {
      const simH = memberHours[mId] || 0;
      const baseH = memberBaselineHours[mId] || 0;
      const capacityH = 80;

      totalSimHours += simH;
      totalCapacityHours += capacityH;

      const utilPct = Math.round((simH / capacityH) * 100);

      workloadDistribution[mId] = {
        userId: mId,
        userName: m.name,
        role: m.role || 'Team Member',
        baselineHours: baseH,
        simulatedHours: simH,
        capacityHours: capacityH,
        utilizationPercentage: utilPct,
        isOverloaded: utilPct > 100,
        assignedTaskCount: simulatedTasks.filter((t) => t.assigneeId === mId).length,
      };
    }

    const resourceUtilizationPercentage = totalCapacityHours > 0
      ? Math.min(100, Math.round((totalSimHours / totalCapacityHours) * 100))
      : 75;

    const blockedTasksCount = simulatedTasks.filter((t) => t.isBlocked).length;

    const HOURLY_RATE = 85;
    let baselineTotalHours = 0;
    for (const t of baselineTasks) {
      baselineTotalHours += t.estimatedHours || 16;
    }
    const baselineCost = baselineTotalHours * HOURLY_RATE;
    const simulatedCost = totalSimHours * HOURLY_RATE;
    const costDelta = simulatedCost - baselineCost;

    let confidenceScore = 90;
    confidenceScore -= projectDelayDays * 4;
    confidenceScore -= blockedTasksCount * 8;

    const overloadedMembersCount = Object.values(workloadDistribution).filter((w) => w.isOverloaded).length;
    confidenceScore -= overloadedMembersCount * 12;

    if (confidenceScore < 30) confidenceScore = 30;
    if (confidenceScore > 98) confidenceScore = 98;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (projectDelayDays > 7 || confidenceScore < 50 || overloadedMembersCount > 2) {
      riskLevel = 'CRITICAL';
    } else if (projectDelayDays > 3 || confidenceScore < 70 || overloadedMembersCount > 0) {
      riskLevel = 'HIGH';
    } else if (projectDelayDays > 0 || confidenceScore < 85) {
      riskLevel = 'MEDIUM';
    }

    const impactExplanations: string[] = [];

    if (projectDelayDays > 0) {
      impactExplanations.push(
        `Project completion date is pushed back by ${projectDelayDays} days (New Target: ${projectCompletionDate}).`
      );
    } else if (projectDelayDays === 0 && actions.length > 0) {
      impactExplanations.push(
        `Project completion timeline remains on schedule with zero net delay.`
      );
    }

    if (criticalPathTaskTitles.length > 0) {
      impactExplanations.push(
        `Critical Path includes ${criticalPathTaskTitles.length} key deliverables: ${criticalPathTaskTitles.slice(0, 3).join(', ')}.`
      );
    }

    if (overloadedMembersCount > 0) {
      const overloadedNames = Object.values(workloadDistribution)
        .filter((w) => w.isOverloaded)
        .map((w) => w.userName)
        .join(', ');
      impactExplanations.push(
        `Workload warning: ${overloadedMembersCount} team member(s) (${overloadedNames}) exceed capacity limit.`
      );
    }

    if (blockedTasksCount > 0) {
      impactExplanations.push(
        `${blockedTasksCount} task(s) are currently unassigned or blocked by predecessor dependencies.`
      );
    }

    if (costDelta !== 0) {
      const formattedDelta = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(costDelta);
      impactExplanations.push(
        `Cost variance estimated at ${costDelta > 0 ? '+' : ''}${formattedDelta} based on dev rate of $${HOURLY_RATE}/hr.`
      );
    }

    return {
      sprintCompletionDate,
      baselineSprintCompletionDate,
      projectCompletionDate,
      baselineProjectCompletionDate,
      sprintDelayDays,
      projectDelayDays,
      criticalPathTaskIds,
      criticalPathTaskTitles,
      criticalPathChanged,
      workloadDistribution,
      blockedTasksCount,
      resourceUtilizationPercentage,
      deliveryConfidenceScore: Math.round(confidenceScore),
      riskLevel,
      costEstimation: {
        baselineCost,
        simulatedCost,
        costDelta,
        currency: 'USD',
        breakdown: [
          { label: 'Engineering Labor', amount: Math.round(simulatedCost * 0.8) },
          { label: 'QA & Integration', amount: Math.round(simulatedCost * 0.15) },
          { label: 'Overhead & Contingency', amount: Math.round(simulatedCost * 0.05) },
        ],
      },
      impactExplanations,
    };
  }
}
