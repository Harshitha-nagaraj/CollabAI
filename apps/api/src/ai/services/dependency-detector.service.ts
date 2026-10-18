/**
 * @file ai/services/dependency-detector.service.ts
 *
 * AI Dependency Detector Service.
 * Analyzes natural language task descriptions and meeting notes to discover implicit dependencies.
 */

import { getAIProvider } from '../provider-factory.js';
import { logger } from '../../utils/logger.js';

export interface DetectedDependency {
  predecessorId: string;
  predecessorTitle: string;
  successorId: string;
  successorTitle: string;
  type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  confidence: number;
  explanation: string;
}

export class DependencyDetectorEngine {
  /**
   * Automatically detect task dependencies across project tasks
   */
  static async detect(tasks: Array<{ id: string; title: string; description?: string | null }>): Promise<DetectedDependency[]> {
    if (tasks.length < 2) return [];

    const provider = getAIProvider();

    const systemPrompt = `You are the CollabAI Task Dependency Analysis Engine.
Analyze a list of project tasks and identify task dependencies (which task MUST finish or start before another task can begin).

Return valid JSON with format:
{
  "dependencies": [
    {
      "predecessorId": "task-id-1",
      "predecessorTitle": "Task 1 Title",
      "successorId": "task-id-2",
      "successorTitle": "Task 2 Title",
      "type": "FINISH_TO_START",
      "confidence": 95,
      "explanation": "Task 2 requires the API endpoint created in Task 1."
    }
  ]
}`;

    const userPrompt = JSON.stringify({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, description: t.description || '' })),
    });

    try {
      const rawText = await provider.complete(
        { system: systemPrompt, user: userPrompt },
        { jsonMode: true, temperature: 0.1 }
      );
      const parsed = JSON.parse(rawText);
      return parsed.dependencies || [];
    } catch (error) {
      logger.error('DependencyDetectorEngine error:', error);
      // Fallback heuristic matching
      return this.heuristicDetect(tasks);
    }
  }

  private static heuristicDetect(tasks: Array<{ id: string; title: string; description?: string | null }>): DetectedDependency[] {
    const detected: DetectedDependency[] = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = 0; j < tasks.length; j++) {
        const taskA = tasks[i];
        const taskB = tasks[j];
        if (!taskA || !taskB) continue;

        const textB = `${taskB.title} ${taskB.description || ''}`.toLowerCase();
        const titleA = taskA.title.toLowerCase();

        if (textB.includes('after') || textB.includes('requires') || textB.includes('depends on') || textB.includes('block')) {
          if (textB.includes(titleA) || titleA.split(' ').some((word) => word.length > 4 && textB.includes(word))) {
            detected.push({
              predecessorId: taskA.id,
              predecessorTitle: taskA.title,
              successorId: taskB.id,
              successorTitle: taskB.title,
              type: 'FINISH_TO_START',
              confidence: 85,
              explanation: `Task "${taskB.title}" mentions dependency on "${taskA.title}".`,
            });
          }
        }
      }
    }

    return detected;
  }
}
