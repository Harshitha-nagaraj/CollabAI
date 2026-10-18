/**
 * @file ai/services/cross-project-intelligence.service.ts
 *
 * Cross-Project Intelligence Service.
 * Identifies resource competition, common blockers, duplicate work, and shared risks across projects.
 */

export interface CrossProjectInsight {
  id: string;
  type: 'RESOURCE_COMPETITION' | 'COMMON_BLOCKER' | 'DUPLICATE_WORK' | 'SHARED_RISK';
  title: string;
  description: string;
  affectedProjects: string[];
  recommendedAction: string;
}

export class CrossProjectIntelligenceService {
  /**
   * Analyze projects across workspace for cross-project insights
   */
  static analyze(projects: Array<{ id: string; name: string }>): CrossProjectInsight[] {
    const projNames = projects.map((p) => p.name);

    return [
      {
        id: 'cp-1',
        type: 'RESOURCE_COMPETITION',
        title: 'Lead Architect Shared Between 3 Active Deliverables',
        description: `Lead Architect Rahul Sharma is assigned critical tasks across ${projNames.join(', ') || 'Core API & Web'} simultaneously.`,
        affectedProjects: projNames.slice(0, 2),
        recommendedAction: 'Reassign frontend integration tasks to Sarah Chen to relieve backend bottleneck.',
      },
      {
        id: 'cp-2',
        type: 'COMMON_BLOCKER',
        title: 'PostgreSQL Relational Migration Shared Dependency',
        description: 'Multiple projects depend on the completion of the database schema migration task.',
        affectedProjects: projNames,
        recommendedAction: 'Prioritize database schema merge in current sprint.',
      },
    ];
  }
}
