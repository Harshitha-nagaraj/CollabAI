import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task, TaskStatus, Priority, TaskComment } from '@/types';

// ─── Query Filters ───────────────────────────────────────────────────────────

export interface TaskFilters {
  workspaceId?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  unassigned?: boolean;
  sortBy?: 'dueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

function buildQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== '' && val !== null) {
      params.set(key, val);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api<{ tasks: Task[] }>(`/tasks${buildQueryString(filters)}`),
    staleTime: 30_000,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api<{ task: Task }>(`/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  projectId: string;
  assigneeId?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      api<{ task: Task }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['kanban'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project-activities'] });
      if (variables.projectId) {
        qc.invalidateQueries({ queryKey: ['project', variables.projectId] });
      }
    },
  });
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export function useUpdateTask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) =>
      api<{ task: Task }>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['kanban'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['project-activities'] });
    },
  });
}

export function useUpdateAnyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateTaskPayload & { id: string }) =>
      api<{ task: Task }>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', variables.id] });
      qc.invalidateQueries({ queryKey: ['kanban'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['project-activities'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api(`/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['kanban'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['project-activities'] });
    },
  });
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => api<{ comments: TaskComment[] }>(`/tasks/${taskId}/comments`),
    enabled: !!taskId,
    staleTime: 10_000,
  });
}

export function useCreateTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) => {
      const cleanTaskId = taskId?.trim();
      if (!cleanTaskId) {
        throw new Error('Task ID is required to post a comment');
      }
      return api<{ comment: TaskComment }>(`/tasks/${cleanTaskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
      qc.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}
