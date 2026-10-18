/**
 * @file ai/services/release-generator.service.ts
 *
 * AI Release Notes Generator.
 * Aggregates merged PRs, completed tasks, and meeting decisions to produce formatted release notes and changelogs.
 */

import { getAIProvider } from '../provider-factory.js';
import { logger } from '../../utils/logger.js';

export interface ReleaseGeneratorInput {
  version: string;
  mergedPRs: Array<{ title: string; number: number; author: string }>;
  completedTasks: Array<{ title: string; priority: string }>;
  meetingDecisions: Array<{ title: string; category: string }>;
}

export class ReleaseGeneratorEngine {
  /**
   * Auto-generate structured release notes in Markdown
   */
  static async generate(input: ReleaseGeneratorInput): Promise<{ version: string; title: string; content: string }> {
    const provider = getAIProvider();

    const systemPrompt = `You are CollabAI's Technical Writer & Release Manager AI.
Synthesize merged PRs, completed tasks, and meeting decisions into professional release notes in GitHub-style Markdown.

Return valid JSON with format:
{
  "version": "v1.2.0",
  "title": "Release v1.2.0 - Core AI Meeting Intelligence & GitHub Integration",
  "content": "# Release v1.2.0\\n\\n## 🚀 Features\\n- ...\\n\\n## 🐛 Bug Fixes\\n- ...\\n\\n## ⚖️ Architecture Decisions\\n- ..."
}`;

    const userPrompt = JSON.stringify(input);

    try {
      const rawText = await provider.complete(
        { system: systemPrompt, user: userPrompt },
        { jsonMode: true, temperature: 0.2 }
      );
      const parsed = JSON.parse(rawText);

      return {
        version: input.version,
        title: parsed.title || `Release ${input.version}`,
        content: parsed.content || this.generateFallbackNotes(input),
      };
    } catch (error) {
      logger.error('ReleaseGeneratorEngine error:', error);
      return {
        version: input.version,
        title: `Release ${input.version} - Automated Changelog`,
        content: this.generateFallbackNotes(input),
      };
    }
  }

  private static generateFallbackNotes(input: ReleaseGeneratorInput): string {
    const prLines = input.mergedPRs.map((pr) => `- **#${pr.number}**: ${pr.title} (by @${pr.author})`).join('\n') || '- Minor performance enhancements.';
    const taskLines = input.completedTasks.map((t) => `- ${t.title} [${t.priority}]`).join('\n') || '- Resolved sprint backlog tasks.';
    const decisionLines = input.meetingDecisions.map((d) => `- ${d.title} (${d.category})`).join('\n') || '- Standardized database schema migration.';

    return `# Release ${input.version}

## 🚀 Merged Pull Requests
${prLines}

## ✅ Completed Tasks
${taskLines}

## ⚖️ Architectural Decisions & Governance
${decisionLines}

---
*Generated automatically by CollabAI Release Generator Engine.*`;
  }
}
