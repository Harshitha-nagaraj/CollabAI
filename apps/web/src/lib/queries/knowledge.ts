/**
 * @file lib/queries/knowledge.ts
 *
 * React Query hooks for AI Decision Memory, Knowledge Base & Semantic Search Q&A.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api';

export interface DecisionRecord {
  id: string;
  title: string;
  description: string;
  type: 'DECISION' | 'APPROVAL' | 'REJECTION' | 'RISK' | 'ASSUMPTION' | 'FOLLOW_UP';
  category: string;
  status: string;
  createdAt: string;
  decidedBy?: { id: string; name?: string; email: string; avatarUrl?: string } | null;
  meeting?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface SemanticSearchResult {
  query: string;
  answer: string;
  confidenceScore: number;
  supportingEvidence: string[];
  relatedMeetings: Array<{ id: string; title: string; type: string; snippet: string; link: string }>;
  relatedDocuments: Array<{ id: string; title: string; type: string; snippet: string; link: string }>;
  relatedTasks: Array<{ id: string; title: string; type: string; snippet: string; link: string }>;
  relatedDecisions: Array<{ id: string; title: string; type: string; snippet: string; link: string }>;
}

export interface ContextAssistantData {
  contextId: string;
  contextTitle: string;
  relatedDecisions: Array<{ id: string; title: string; type: string; category: string }>;
  relatedMeetings: Array<{ id: string; title: string; date: string }>;
  relatedDocuments: Array<{ id: string; title: string; type: string }>;
  potentialRisks: Array<{ risk: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
  previousDiscussions: string[];
}

export function useDecisionLog(workspaceId: string | null, filter?: { type?: string; category?: string }) {
  return useQuery<DecisionRecord[]>({
    queryKey: ['decisions', workspaceId, filter],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      const params = new URLSearchParams({ workspaceId });
      if (filter?.type) params.append('type', filter.type);
      if (filter?.category) params.append('category', filter.category);
      return api<DecisionRecord[]>(`/knowledge/decisions?${params.toString()}`);
    },
    enabled: !!workspaceId,
  });
}

export function useSemanticSearch() {
  return useMutation({
    mutationFn: async ({ query, workspaceId }: { query: string; workspaceId: string }) => {
      return api<SemanticSearchResult>('/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({ query, workspaceId }),
      });
    },
  });
}

export function useKnowledgeTimeline(workspaceId: string | null) {
  return useQuery<Array<{ id: string; title: string; description: string; eventType: string; category: string; date: string; actor: string; link: string }>>({
    queryKey: ['knowledge-timeline', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      return api(`/knowledge/timeline?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useAIContextAssistant(contextId: string | null, title: string | null, workspaceId: string | null) {
  return useQuery<ContextAssistantData>({
    queryKey: ['context-assistant', contextId, title, workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Missing workspaceId');
      const params = new URLSearchParams({ workspaceId });
      if (contextId) params.append('contextId', contextId);
      if (title) params.append('title', title);
      return api<ContextAssistantData>(`/knowledge/context?${params.toString()}`);
    },
    enabled: !!workspaceId,
  });
}
