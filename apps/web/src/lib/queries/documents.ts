import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { User, Workspace } from '@/types';

export interface Document {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  projectId?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  creator?: User;
  workspace?: Workspace;
}

interface CreateDocumentPayload {
  title: string;
  content?: string;
  workspaceId: string;
  projectId?: string;
}

interface UpdateDocumentPayload {
  id: string;
  title?: string;
  content?: string;
}

export function useDocuments(workspaceId: string | null) {
  return useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { documents: [] as Document[] };
      return api<{ documents: Document[] }>(`/documents?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      if (!id) return { document: null };
      return api<{ document: Document }>(`/documents/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDocumentPayload) => {
      return api<{ document: Document }>('/documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.workspaceId] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateDocumentPayload) => {
      return api<{ document: Document }>(`/documents/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: payload.title, content: payload.content }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', data.document.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['document', data.document.id] });
    },
  });
}
