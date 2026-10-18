/**
 * @file ai/services/meeting-processor.ts
 *
 * Orchestrates meeting analysis: transcript → LLM → MeetingSummary.
 */

import { getAIProvider } from '../provider-factory.js';
import { meetingSummaryPrompt } from '../prompts/index.js';
import type { MeetingSummary } from '../types.js';
import { logger } from '../../utils/logger.js';

export class MeetingProcessor {
  static async process(transcript: string, participants?: string[]): Promise<MeetingSummary> {
    const provider = getAIProvider();
    const prompt = meetingSummaryPrompt.buildPrompt({ transcript, participants });

    try {
      const raw = await provider.complete(prompt, { jsonMode: true, temperature: 0.2 });
      const parsed = JSON.parse(raw) as MeetingSummary;

      // Validate essential fields exist
      return {
        executiveSummary: parsed.executiveSummary || 'No summary generated.',
        keyDecisions: parsed.keyDecisions || [],
        actionItems: (parsed.actionItems || []).map((item, i) => ({
          title: item.title || `Action Item ${i + 1}`,
          description: item.description || '',
          assignee: item.assignee || null,
          priority: item.priority || 'MEDIUM',
          dueDate: item.dueDate || null,
          confidence: item.confidence || 70,
        })),
        risks: parsed.risks || [],
        pendingQuestions: parsed.pendingQuestions || [],
        suggestedFollowUps: parsed.suggestedFollowUps || [],
      };
    } catch (error) {
      logger.error('MeetingProcessor.process failed:', error);
      return {
        executiveSummary: 'Failed to process meeting transcript.',
        keyDecisions: [],
        actionItems: [],
        risks: ['Processing error occurred'],
        pendingQuestions: [],
        suggestedFollowUps: ['Retry with a clearer transcript'],
      };
    }
  }
}
