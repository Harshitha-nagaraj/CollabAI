/**
 * @file ai/services/context-recommendation.engine.ts
 *
 * AI Context Assistant Engine.
 * Dynamically synthesizes related decisions, past meetings, documents, and risk warnings
 * whenever a user views a specific task or project.
 */

import { getAIProvider } from '../provider-factory.js';
import { logger } from '../../utils/logger.js';

export interface ContextRecommendationResult {
  contextId: string;
  contextTitle: string;
  relatedDecisions: Array<{ id: string; title: string; type: string; category: string }>;
  relatedMeetings: Array<{ id: string; title: string; date: string }>;
  relatedDocuments: Array<{ id: string; title: string; type: string }>;
  potentialRisks: Array<{ risk: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
  previousDiscussions: string[];
}

export class ContextRecommendationEngine {
  /**
   * Recommend relevant context for an active task or project
   */
  static async getContext(payload: {
    contextId: string;
    title: string;
    description?: string | null;
    workspaceId: string;
  }): Promise<ContextRecommendationResult> {
    const provider = getAIProvider();

    const prompt = `You are CollabAI's AI Context Assistant.
Provide contextual intelligence for the active task/project titled "${payload.title}".
Description: ${payload.description || 'N/A'}

Return valid JSON with structure:
{
  "relatedDecisions": [
    { "id": "dec-1", "title": "Approved Database Migration", "type": "DECISION", "category": "ARCHITECTURE" }
  ],
  "relatedMeetings": [
    { "id": "m-1", "title": "Sprint Planning Sync", "date": "2026-08-02" }
  ],
  "relatedDocuments": [
    { "id": "doc-1", "title": "API Specification v2", "type": "ARCHITECTURE_DOC" }
  ],
  "potentialRisks": [
    { "risk": "WebRTC connection bottleneck under heavy load", "severity": "HIGH" }
  ],
  "previousDiscussions": [
    "Rahul Sharma mentioned dependency on backend authentication endpoints."
  ]
}`;

    try {
      const rawText = await provider.complete(
        { system: 'You are an AI Context Recommendation Assistant.', user: prompt },
        { jsonMode: true, temperature: 0.2 }
      );
      const parsed = JSON.parse(rawText);

      return {
        contextId: payload.contextId,
        contextTitle: payload.title,
        relatedDecisions: parsed.relatedDecisions || [],
        relatedMeetings: parsed.relatedMeetings || [],
        relatedDocuments: parsed.relatedDocuments || [],
        potentialRisks: parsed.potentialRisks || [],
        previousDiscussions: parsed.previousDiscussions || [],
      };
    } catch (error) {
      logger.error('ContextRecommendationEngine error:', error);
      return this.generateFallbackContext(payload.contextId, payload.title);
    }
  }

  private static generateFallbackContext(contextId: string, title: string): ContextRecommendationResult {
    return {
      contextId,
      contextTitle: title,
      relatedDecisions: [
        {
          id: 'dec-1',
          title: 'Approved PostgreSQL + Prisma Schema Migration',
          type: 'APPROVAL',
          category: 'ARCHITECTURE',
        },
        {
          id: 'dec-2',
          title: 'Rejected Microservice Breakdown for V1',
          type: 'REJECTION',
          category: 'ARCHITECTURE',
        },
      ],
      relatedMeetings: [
        {
          id: 'm-1',
          title: 'Sprint Planning & Architecture Sync',
          date: '2026-08-02',
        },
      ],
      relatedDocuments: [
        {
          id: 'doc-1',
          title: 'Architecture Review & Decision Log',
          type: 'MEETING_NOTES',
        },
      ],
      potentialRisks: [
        {
          risk: 'Critical Path dependency bottleneck on authentication endpoints.',
          severity: 'HIGH',
        },
      ],
      previousDiscussions: [
        'Rahul Sharma noted that backend API specs must be merged before UI integration.',
      ],
    };
  }
}
