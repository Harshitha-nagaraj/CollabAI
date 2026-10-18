import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project, ProjectDetailsResponse, ProjectActivitiesResponse } from '@/types';

export function useProjects(workspaceId: string | null, search?: string, status?: string) {
  const queryParams = new URLSearchParams();
  if (workspaceId) queryParams.set('workspaceId', workspaceId);
  if (search) queryParams.set('search', search);
  if (status && status !== 'ALL') queryParams.set('status', status);

  const queryString = queryParams.toString();

  return useQuery({
    queryKey: ['projects', workspaceId, search, status],
    queryFn: () => api<{ projects: Project[] }>(`/projects?${queryString}`),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useProjectDetails(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api<ProjectDetailsResponse>(`/projects/${projectId}`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useProjectActivities(projectId: string | null, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['project-activities', projectId, limit],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (pageParam) params.set('cursor', pageParam as string);
      return api<ProjectActivitiesResponse>(`/projects/${projectId}/activity?${params.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage?.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined),
    enabled: !!projectId,
    staleTime: 15_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string; key?: string; status?: Project['status']; workspaceId: string }) =>
      api<{ project: Project }>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['project-activities'] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; name?: string; description?: string; key?: string; status?: Project['status'] }) =>
      api<{ project: Project }>(`/projects/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.key !== undefined ? { key: payload.key } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
        }),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', variables.id] });
      qc.invalidateQueries({ queryKey: ['project-activities', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api<{ message: string }>(`/projects/${projectId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project-activities'] });
    },
  });
}
