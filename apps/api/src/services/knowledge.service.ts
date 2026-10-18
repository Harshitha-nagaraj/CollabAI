/**
 * @file services/knowledge.service.ts
 *
 * Full service implementation for AI Decision Memory & Project Knowledge Base.
 */

import { prisma } from '../lib/prisma.js';
import { DecisionExtractionEngine } from '../ai/services/decision-extraction.service.js';
import { SemanticSearchEngine } from '../ai/services/semantic-search.service.js';
import { ContextRecommendationEngine } from '../ai/services/context-recommendation.engine.js';
import { VectorStoreProvider } from '../ai/services/vector-store.provider.js';

export class KnowledgeService {
  /**
   * Fetch Decision Log entries for a workspace
   */
  static async getDecisions(workspaceId: string, filter?: { type?: string; category?: string; projectId?: string }) {
    const where: any = { workspaceId };
    if (filter?.type) where.type = filter.type;
    if (filter?.category) where.category = filter.category;
    if (filter?.projectId) where.projectId = filter.projectId;

    return prisma.decision.findMany({
      where,
      include: {
        decidedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        meeting: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a Decision record manually
   */
  static async createDecision(payload: {
    title: string;
    description: string;
    type?: 'DECISION' | 'APPROVAL' | 'REJECTION' | 'RISK' | 'ASSUMPTION' | 'FOLLOW_UP';
    category?: string;
    status?: string;
    workspaceId: string;
    projectId?: string | null;
    meetingId?: string | null;
    decidedById?: string | null;
  }) {
    const decision = await prisma.decision.create({
      data: {
        title: payload.title,
        description: payload.description,
        type: payload.type || 'DECISION',
        category: payload.category || 'GENERAL',
        status: payload.status || 'APPROVED',
        workspaceId: payload.workspaceId,
        projectId: payload.projectId || null,
        meetingId: payload.meetingId || null,
        decidedById: payload.decidedById || null,
      },
      include: {
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Also index into Vector Store for semantic search
    VectorStoreProvider.indexDocument({
      id: decision.id,
      workspaceId: decision.workspaceId,
      projectId: decision.projectId,
      title: decision.title,
      content: `${decision.title} - ${decision.description} (Category: ${decision.category}, Status: ${decision.status})`,
      type: 'DECISION',
      tags: [decision.type, decision.category].filter((t): t is string => Boolean(t)),
      sourceId: decision.meetingId,
    });

    return decision;
  }

  /**
   * Automatically extract decisions from a meeting transcript and persist to database
   */
  static async extractDecisionsFromMeeting(meetingId: string, workspaceId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });

    if (!meeting) throw new Error('Meeting not found');

    const transcript = meeting.transcript || meeting.summary || '';
    const extracted = await DecisionExtractionEngine.extract(transcript, meeting.title);

    const createdDecisions = [];
    for (const item of extracted) {
      const dec = await this.createDecision({
        title: item.title,
        description: item.description,
        type: item.type,
        category: item.category,
        status: item.status,
        workspaceId,
        meetingId: meeting.id,
        decidedById: meeting.creatorId,
      });
      createdDecisions.push(dec);
    }

    return createdDecisions;
  }

  /**
   * Execute Natural Language Q&A over Workspace Knowledge
   */
  static async semanticSearch(query: string, workspaceId: string) {
    // Populate vector store from DB if empty
    const dbDecisions = await prisma.decision.findMany({ where: { workspaceId } });
    for (const d of dbDecisions) {
      VectorStoreProvider.indexDocument({
        id: d.id,
        workspaceId: d.workspaceId,
        projectId: d.projectId,
        title: d.title,
        content: `${d.title} - ${d.description}`,
        type: 'DECISION',
        tags: [d.type, d.category].filter((t): t is string => Boolean(t)),
      });
    }

    const dbDocs = await prisma.document.findMany({ where: { workspaceId } });
    for (const doc of dbDocs) {
      VectorStoreProvider.indexDocument({
        id: doc.id,
        workspaceId: doc.workspaceId,
        projectId: doc.projectId,
        title: doc.title,
        content: doc.content || '',
        type: 'DOCUMENT',
        tags: [doc.type].filter((t): t is string => Boolean(t)),
      });
    }

    return SemanticSearchEngine.query(query, workspaceId);
  }

  /**
   * Fetch Chronological Project Knowledge & Event Timeline
   */
  static async getKnowledgeTimeline(workspaceId: string, projectId?: string) {
    const decisions = await prisma.decision.findMany({
      where: { workspaceId, ...(projectId ? { projectId } : {}) },
      include: { decidedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const meetings = await prisma.meeting.findMany({
      where: { workspaceId },
      orderBy: { startTime: 'desc' },
      take: 10,
    });

    const events = [
      ...decisions.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        eventType: d.type, // DECISION, APPROVAL, RISK, etc.
        category: d.category,
        date: d.createdAt.toISOString().split('T')[0],
        actor: d.decidedBy?.name || 'Team Decision',
        link: '/dashboard/decisions',
      })),
      ...meetings.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.summary || 'Virtual Meeting Intelligence Session',
        eventType: 'MEETING',
        category: m.type,
        date: m.startTime.toISOString().split('T')[0],
        actor: 'CollabAI Engine',
        link: '/dashboard/meetings',
      })),
    ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

    return events;
  }

  /**
   * Get Context Assistant recommendations for active task/project
   */
  static async getContextAssistant(contextId: string, title: string, workspaceId: string) {
    return ContextRecommendationEngine.getContext({
      contextId,
      title,
      workspaceId,
    });
  }
}
