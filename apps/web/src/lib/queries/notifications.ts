/**
 * @file lib/queries/notifications.ts
 *
 * React Query hooks for User Notifications.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface NotificationItem {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export function useUserNotifications(workspaceId: string | null) {
  return useQuery<NotificationItem[]>({
    queryKey: ['notifications', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await api<any>(`/notifications?workspaceId=${workspaceId}`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.notifications)) return res.notifications;
      return [];
    },
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ notificationId, workspaceId }: { notificationId: string; workspaceId: string }) => {
      return api(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      return api(`/notifications/read-all`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
