/**
 * @file ai/services/command-parser.ts
 *
 * Parses natural language commands into structured platform actions.
 */

import { getAIProvider } from '../provider-factory.js';
import { naturalLanguagePrompt } from '../prompts/index.js';
import type { ParsedCommand } from '../types.js';
import { logger } from '../../utils/logger.js';
import { TaskMatchingService, normalizeTaskStatus } from '../../services/task-matching.service.js';

export class CommandParser {
  static async parse(command: string): Promise<ParsedCommand> {
    const provider = getAIProvider();
    const prompt = naturalLanguagePrompt.buildPrompt({ command });

    try {
      const raw = await provider.complete(prompt, { jsonMode: true, temperature: 0.1 });
      const parsed = JSON.parse(raw) as ParsedCommand;

      const action = parsed.action || 'unknown';
      const confidence = parsed.confidence || 50;
      const parameters = parsed.parameters || {};

      let executablePayload: Record<string, any> = {};

      if (action === 'create_task') {
        executablePayload = {
          type: 'create_task',
          title: parameters.title || command,
          priority: parameters.priority || 'HIGH',
          assigneeName: parameters.assignee || null,
        };
      } else if (action === 'assign_task') {
        const rawQuery = parameters.query || parameters.title || command;
        const targetQuery = TaskMatchingService.cleanQuery(rawQuery);
        executablePayload = {
          type: 'assign_task',
          targetQuery: targetQuery || rawQuery,
          assigneeName: parameters.assignee || null,
        };
      } else if (action === 'move_task') {
        const rawQuery = parameters.query || parameters.title || command;
        const targetQuery = TaskMatchingService.cleanQuery(rawQuery);
        const targetStatus = normalizeTaskStatus(parameters.status);
        executablePayload = {
          type: 'move_task',
          targetQuery: targetQuery || rawQuery,
          targetStatus,
        };
      }
 else if (action === 'schedule_meeting') {
        executablePayload = {
          type: 'schedule_meeting',
          title: parameters.title || 'Sprint Planning',
          date: 'tomorrow',
        };
      } else if (action === 'show_overdue' || action === 'show_blocked') {
        executablePayload = {
          type: 'filter_view',
          filter: action === 'show_overdue' ? 'overdue' : 'blocked',
        };
      }

      return {
        action,
        confidence,
        parameters,
        originalText: command,
        explanation: parsed.explanation || 'Parsed natural language command',
        executablePayload,
      };
    } catch (error) {
      logger.error('CommandParser.parse failed:', error);
      return {
        action: 'unknown',
        confidence: 0,
        parameters: {},
        originalText: command,
        explanation: 'Failed to parse command',
      };
    }
  }
}
