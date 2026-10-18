/**
 * @file ai/services/commit-analyzer.service.ts
 *
 * Commit Intelligence Engine.
 * Matches commit messages and issue keys (e.g. `fix(#123)` or `collab-101`) to Tasks, Projects, and Sprints.
 */

export interface AnalyzedCommit {
  hash: string;
  message: string;
  authorName: string;
  matchedTaskKey?: string | null;
  category: 'FEATURE' | 'BUGFIX' | 'REFACTOR' | 'DOCS' | 'CHORE';
}

export class CommitAnalyzerEngine {
  /**
   * Extract task references and categorize commit messages
   */
  static analyze(commitMessage: string, authorName: string, hash: string): AnalyzedCommit {
    const lower = commitMessage.toLowerCase();

    // Regex match issue keys e.g. #123 or TASK-456 or COLLAB-101
    const match = commitMessage.match(/(?:#|collab-|task-)(\d+)/i);
    const matchedTaskKey = match ? match[0] : null;

    let category: 'FEATURE' | 'BUGFIX' | 'REFACTOR' | 'DOCS' | 'CHORE' = 'FEATURE';
    if (lower.startsWith('fix') || lower.includes('bug')) category = 'BUGFIX';
    else if (lower.startsWith('refactor')) category = 'REFACTOR';
    else if (lower.startsWith('docs')) category = 'DOCS';
    else if (lower.startsWith('chore') || lower.startsWith('build')) category = 'CHORE';

    return {
      hash,
      message: commitMessage,
      authorName,
      matchedTaskKey,
      category,
    };
  }
}
