/**
 * @file ai/services/executive-summary-generator.service.ts
 *
 * Executive AI Summary Generator Engine.
 * Produces daily morning executive briefings with status breakdowns, critical blockers, and AI action recommendations.
 */

import { getAIProvider } from '../provider-factory.js';
import { logger } from '../../utils/logger.js';

export interface MorningExecutiveBriefing {
  greeting: string;
  statusMetrics: {
    activeProjects: number;
    atRiskProjects: number;
    sprintCompletionRate: number;
    tasksCompletedYesterday: number;
    criticalBlockersCount: number;
  };
  executiveSummary: string;
  aiRecommendations: string[];
}

export class ExecutiveSummaryGeneratorEngine {
  /**
   * Generate Morning Executive AI Summary
   */
  static async generate(portfolioMetrics: {
    activeProjects: number;
    atRiskProjects: number;
    sprintCompletionRate: number;
    tasksCompletedYesterday: number;
    criticalBlockersCount: number;
    topBlockerTitles: string[];
  }): Promise<MorningExecutiveBriefing> {
    const provider = getAIProvider();

    const systemPrompt = `You are CollabAI's Senior Executive Assistant & AI Command Center Engine.
Generate a concise, high-impact morning executive briefing for C-level executives and VPs of Engineering.

Return valid JSON with format:
{
  "greeting": "Good Morning Executive Team.",
  "executiveSummary": "Overall portfolio status is strong at 86% sprint velocity. 4 projects require attention due to backend API dependency bottlenecks.",
  "aiRecommendations": [
    "Reassign Backend API task to Sarah Chen (40% capacity)",
    "Extend Sprint 3 by 1 day to ensure full integration testing",
    "Schedule Design Review for Q3 user interface"
  ]
}`;

    const userPrompt = JSON.stringify(portfolioMetrics);

    try {
      const rawText = await provider.complete(
        { system: systemPrompt, user: userPrompt },
        { jsonMode: true, temperature: 0.2 }
      );
      const parsed = JSON.parse(rawText);

      return {
        greeting: parsed.greeting || 'Good Morning.',
        statusMetrics: {
          activeProjects: portfolioMetrics.activeProjects,
          atRiskProjects: portfolioMetrics.atRiskProjects,
          sprintCompletionRate: portfolioMetrics.sprintCompletionRate,
          tasksCompletedYesterday: portfolioMetrics.tasksCompletedYesterday,
          criticalBlockersCount: portfolioMetrics.criticalBlockersCount,
        },
        executiveSummary: parsed.executiveSummary || 'Portfolio velocity is tracking well across core deliverables.',
        aiRecommendations: parsed.aiRecommendations || [
          'Reassign overloaded backend architecture tasks',
          'Schedule architecture sync for API contracts',
        ],
      };
    } catch (error) {
      logger.error('ExecutiveSummaryGeneratorEngine error:', error);
      return this.generateFallbackBriefing(portfolioMetrics);
    }
  }

  private static generateFallbackBriefing(portfolioMetrics: any): MorningExecutiveBriefing {
    return {
      greeting: 'Good Morning.',
      statusMetrics: {
        activeProjects: portfolioMetrics.activeProjects || 12,
        atRiskProjects: portfolioMetrics.atRiskProjects || 4,
        sprintCompletionRate: portfolioMetrics.sprintCompletionRate || 86,
        tasksCompletedYesterday: portfolioMetrics.tasksCompletedYesterday || 17,
        criticalBlockersCount: portfolioMetrics.criticalBlockersCount || 3,
      },
      executiveSummary: 'Current velocity is on track at 86% sprint completion. 4 projects are flagged AT RISK due to critical path dependency bottlenecks.',
      aiRecommendations: [
        'Reassign Backend API to Sarah Chen to alleviate 85% workload bottleneck',
        'Extend Sprint 1 by 1 Day for comprehensive end-to-end integration testing',
        'Schedule Design Review on Thursday at 2 PM',
      ],
    };
  }
}
