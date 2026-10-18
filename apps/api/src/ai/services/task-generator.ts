/**
 * @file ai/services/task-generator.ts
 *
 * Extracts structured AITaskProposal[] from freeform text.
 * Fuzzy-matches suggested assignee names against actual workspace members.
 */

import { getAIProvider } from '../provider-factory.js';
import { taskExtractionPrompt } from '../prompts/index.js';
import type { AITaskProposal } from '../types.js';
import { logger } from '../../utils/logger.js';

interface MemberInfo {
  userId: string;
  name: string | null;
  email: string;
}

export class TaskGenerator {
  static async generate(text: string, members: MemberInfo[]): Promise<AITaskProposal[]> {
    const provider = getAIProvider();
    const memberNames = members.map(m => m.name || m.email.split('@')[0]);
    const prompt = taskExtractionPrompt.buildPrompt({ text, members: memberNames });

    try {
      const raw = await provider.complete(prompt, { jsonMode: true, temperature: 0.3 });
      const parsed = JSON.parse(raw) as { tasks: AITaskProposal[] };
      const tasks = parsed.tasks || [];

      // Resolve assignee names to actual member IDs
      return tasks.map((task, i) => ({
        ...task,
        id: task.id || `ai-task-${i}`,
        assigneeId: task.assigneeName ? this.resolveAssignee(task.assigneeName, members) : null,
        confidence: task.confidence || 70,
      }));
    } catch (error) {
      logger.error('TaskGenerator.generate failed:', error);
      return [];
    }
  }

  private static resolveAssignee(name: string, members: MemberInfo[]): string | null {
    const lower = name.toLowerCase();
    for (const m of members) {
      const memberName = (m.name || m.email.split('@')[0] || '').toLowerCase();
      // Match full name or first name
      const firstName = memberName.split(' ')[0] ?? '';
      if (memberName === lower || firstName === lower) {
        return m.userId;
      }
    }
    return null;
  }
}
