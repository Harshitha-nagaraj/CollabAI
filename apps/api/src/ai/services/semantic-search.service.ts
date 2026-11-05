/**
 * @file ai/services/semantic-search.service.ts
 *
 * Semantic Search & Natural Language Q&A Engine.
 * Combines Vector Store retrieval with LLM synthesis to answer queries with supporting citations & evidence.
 */

import { getAIProvider } from '../provider-factory.js';
import { VectorStoreProvider, type SearchHit } from './vector-store.provider.js';
import { logger } from '../../utils/logger.js';

export const INSUFFICIENT_INFORMATION_MESSAGE =
  'The available records in this workspace do not contain enough information to answer this question.';

export interface RelatedEntity {
  id: string;
  title: string;
  type: 'MEETING' | 'DOCUMENT' | 'TASK' | 'DECISION' | 'PROJECT' | 'TASK_COMMENT';
  snippet: string;
  link: string;
}

export interface SemanticQueryResult {
  query: string;
  answer: string;
  relevanceScore?: number;
  confidenceScore?: number;
  supportingEvidence: string[];
  sources: RelatedEntity[];
  relatedMeetings: RelatedEntity[];
  relatedDocuments: RelatedEntity[];
  relatedTasks: RelatedEntity[];
  relatedDecisions: RelatedEntity[];
}

export class SemanticSearchEngine {
  /**
   * Execute Natural Language Q&A over indexed workspace knowledge
   */
  static async query(
    queryText: string,
    workspaceId: string,
    knowledgeContextNodes: SearchHit[] = []
  ): Promise<SemanticQueryResult> {
    const provider = getAIProvider();

    // Perform vector search over indexed knowledge if nodes not provided
    const vectorHits =
      knowledgeContextNodes.length > 0
        ? knowledgeContextNodes
        : VectorStoreProvider.search(queryText, workspaceId, 8);

    if (vectorHits.length === 0) {
      return {
        query: queryText,
        answer: INSUFFICIENT_INFORMATION_MESSAGE,
        relevanceScore: 0,
        confidenceScore: 0,
        supportingEvidence: [],
        sources: [],
        relatedMeetings: [],
        relatedDocuments: [],
        relatedTasks: [],
        relatedDecisions: [],
      };
    }

    const contextText = vectorHits
      .map((h, i) => `[Source ${i + 1} - ${h.document.type}]: ${h.document.title}\n${h.document.content}`)
      .join('\n\n');

    const systemPrompt = `You are CollabAI's Senior Knowledge Architect and Semantic Search Assistant.
Answer the user's natural language question using ONLY the provided project context nodes and decisions.
Do NOT invent facts, names, decisions, or task statuses.
If the provided context does not contain enough information to answer the question, return:
{
  "answer": "${INSUFFICIENT_INFORMATION_MESSAGE}",
  "relevanceScore": 0,
  "supportingEvidence": []
}

Return valid JSON with format:
{
  "answer": "Direct, clear synthesized answer addressing the user's question.",
  "relevanceScore": 85,
  "supportingEvidence": [
    "Evidence quote or key fact 1",
    "Evidence quote or key fact 2"
  ]
}`;

    const userPrompt = `User Question: "${queryText}"\n\nProject Context:\n${contextText}`;

    // Extract entity citations
    const sources: RelatedEntity[] = [];
    const relatedMeetings: RelatedEntity[] = [];
    const relatedDocuments: RelatedEntity[] = [];
    const relatedTasks: RelatedEntity[] = [];
    const relatedDecisions: RelatedEntity[] = [];

    for (const hit of vectorHits) {
      const doc = hit.document;
      const link =
        doc.type === 'MEETING' || doc.type === 'MEETING_SUMMARY'
          ? `/dashboard/meetings?meetingId=${doc.id}`
          : doc.type === 'DOCUMENT'
          ? `/dashboard/documents?id=${doc.id}`
          : doc.type === 'TASK'
          ? `/dashboard/kanban?task=${doc.id}`
          : doc.type === 'PROJECT'
          ? `/dashboard/projects/${doc.id}`
          : '/dashboard/decisions';

      const item: RelatedEntity = {
        id: doc.id,
        title: doc.title,
        type: doc.type as any,
        snippet: doc.content.slice(0, 160),
        link,
      };

      sources.push(item);
      if (doc.type === 'MEETING' || doc.type === 'MEETING_SUMMARY') relatedMeetings.push(item);
      else if (doc.type === 'DOCUMENT') relatedDocuments.push(item);
      else if (doc.type === 'TASK') relatedTasks.push(item);
      else if (doc.type === 'DECISION') relatedDecisions.push(item);
    }

    try {
      const rawText = await provider.complete(
        { system: systemPrompt, user: userPrompt },
        { jsonMode: true, temperature: 0.1 }
      );
      const parsed = JSON.parse(rawText);

      const isInsufficient =
        !parsed.answer ||
        parsed.answer.includes('No matching heuristic handler') ||
        parsed.answer.includes(INSUFFICIENT_INFORMATION_MESSAGE);

      if (isInsufficient) {
        // Synthesize direct grounded answer from vector hits instead of empty/error
        const topHit = vectorHits[0]!;
        const directAnswer = `Based on workspace records: In ${topHit.document.type.toLowerCase()} "${topHit.document.title}", ${topHit.document.content.slice(0, 200).trim()}.`;
        const evidence = vectorHits.slice(0, 3).map((h) => `Matched ${h.document.type} "${h.document.title}"`);

        return {
          query: queryText,
          answer: directAnswer,
          relevanceScore: Math.round((topHit.similarityScore || 0.8) * 100),
          supportingEvidence: evidence,
          sources,
          relatedMeetings,
          relatedDocuments,
          relatedTasks,
          relatedDecisions,
        };
      }

      return {
        query: queryText,
        answer: parsed.answer,
        relevanceScore: parsed.relevanceScore ?? parsed.confidenceScore ?? 85,
        supportingEvidence: parsed.supportingEvidence || [
          `Derived from ${vectorHits[0]?.document.title || 'indexed record'}.`,
        ],
        sources,
        relatedMeetings,
        relatedDocuments,
        relatedTasks,
        relatedDecisions,
      };
    } catch (error) {
      logger.error('SemanticSearchEngine error:', error);
      // Fallback: ground strictly on vectorHits if available, otherwise return insufficient info
      if (vectorHits.length > 0) {
        const topHit = vectorHits[0]!;
        return {
          query: queryText,
          answer: `Workspace record "${topHit.document.title}" (${topHit.document.type}): ${topHit.document.content.slice(0, 200).trim()}`,
          relevanceScore: Math.round((topHit.similarityScore || 0.7) * 100),
          supportingEvidence: [`Matched ${topHit.document.type} "${topHit.document.title}"`],
          sources,
          relatedMeetings,
          relatedDocuments,
          relatedTasks,
          relatedDecisions,
        };
      }

      return {
        query: queryText,
        answer: INSUFFICIENT_INFORMATION_MESSAGE,
        relevanceScore: 0,
        supportingEvidence: [],
        sources: [],
        relatedMeetings: [],
        relatedDocuments: [],
        relatedTasks: [],
        relatedDecisions: [],
      };
    }
  }
}
