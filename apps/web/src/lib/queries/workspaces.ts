import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Workspace, KanbanBoard, WorkspaceDetails } from '@/types';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api<{ workspaces: Workspace[] }>('/workspaces'),
    staleTime: 60_000,
  });
}

export function useWorkspaceDetails(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api<WorkspaceDetails>(`/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useKanbanBoard(workspaceId: string | null) {
  return useQuery({
    queryKey: ['kanban', workspaceId],
    queryFn: () => api<{ board: KanbanBoard }>(`/workspaces/${workspaceId}/kanban`),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api<{ workspace: Workspace }>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useAddWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workspaceId: string; email: string; role?: string }) =>
      api<{ member: any }>(`/workspaces/${payload.workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: payload.email, role: payload.role }),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workspaceId: string; userId: string }) =>
      api(`/workspaces/${payload.workspaceId}/members/${payload.userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

