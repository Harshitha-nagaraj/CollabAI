/**
 * @file lib/queries/meetings.ts
 *
 * React Query hooks for Meetings & AI Meeting Intelligence.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface MeetingItem {
  id: string;
  title: string;
  description?: string;
  type: 'STANDUP' | 'SPRINT_PLANNING' | 'ARCHITECTURE_REVIEW' | 'CLIENT_SYNC' | 'ONE_ON_ONE' | 'GENERAL';
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUMMARIZED' | 'PROCESSED';
  transcript?: string;
  summary?: string;
  decisions?: string;
  actionItems?: string;
  risks?: string;
  deadlines?: string;
  pendingQuestions?: string;
  followUps?: string;
  sentiment?: string;
  sprintPlan?: string;
  workspaceId: string;
  workspace?: { id: string; name: string };
  creator: { id: string; name?: string; email: string; avatarUrl?: string };
  participants: Array<{
    id?: string;
    userId?: string;
    createdAt?: string;
    user: { id: string; name?: string; email: string; avatarUrl?: string };
  }>;
  chatMessages?: Array<{ id: string; message: string; createdAt: string; user: { id: string; name?: string; avatarUrl?: string } }>;
  documents?: Array<{ id: string; title: string; content?: string; type: string; createdAt: string }>;
  roomName?: string;
  createdAt: string;
}

export interface MeetingAccessInfo {
  meetingId: string;
  title: string;
  workspaceId: string;
  creatorId?: string;
  isHost?: boolean;
  hostName?: string;
  roomName: string;
  domain: string;
  isPublicProvider: boolean;
  user: {
    id: string;
    name?: string;
    email: string;
  };
  lowResourceConstraints: {
    resolution: number;
    maxFramerate: number;
    channelLastN: number;
    enableLayerSuspension: boolean;
    p2p: boolean;
  };
  privacyNotice: string;
}

export interface MeetingParticipantItem {
  id: string;
  meetingId: string;
  userId: string;
  createdAt: string;
  user: { id: string; name?: string; email: string; avatarUrl?: string };
}

export function useWorkspaceMeetings(workspaceId: string | null) {
  return useQuery<MeetingItem[]>({
    queryKey: ['meetings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return api<MeetingItem[]>(`/meetings?workspaceId=${workspaceId}`);
    },
    enabled: !!workspaceId,
  });
}

export function useMeetingDetails(meetingId: string | null, workspaceId: string | null) {
  return useQuery<MeetingItem>({
    queryKey: ['meeting-details', meetingId, workspaceId],
    queryFn: async () => {
      if (!meetingId || !workspaceId) throw new Error('Missing parameters');
      return api<MeetingItem>(`/meetings/${meetingId}?workspaceId=${workspaceId}`);
    },
    enabled: !!meetingId && !!workspaceId,
    // Avoid aggressive polling during active meetings (only revalidate on window focus or explicit mutations)
    staleTime: 10000,
  });
}

export function useMeetingAccess(meetingId: string | null, workspaceId: string | null) {
  return useQuery<MeetingAccessInfo>({
    queryKey: ['meeting-access', meetingId, workspaceId],
    queryFn: async () => {
      if (!meetingId || !workspaceId) throw new Error('Missing meetingId or workspaceId');
      return api<MeetingAccessInfo>(`/meetings/${meetingId}/access?workspaceId=${workspaceId}`);
    },
    enabled: !!meetingId && !!workspaceId,
    staleTime: 60000,
  });
}

export function useMeetingParticipants(meetingId: string | null, workspaceId: string | null) {
  return useQuery<MeetingParticipantItem[]>({
    queryKey: ['meeting-participants', meetingId, workspaceId],
    queryFn: async () => {
      if (!meetingId || !workspaceId) return [];
      return api<MeetingParticipantItem[]>(`/meetings/${meetingId}/participants?workspaceId=${workspaceId}`);
    },
    enabled: !!meetingId && !!workspaceId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      type?: string;
      startTime: string;
      endTime: string;
      workspaceId: string;
      participantIds?: string[];
    }) => {
      return api<MeetingItem>('/meetings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.workspaceId] });
    },
  });
}

export function useJoinMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, workspaceId }: { meetingId: string; workspaceId: string }) => {
      return api<MeetingParticipantItem>(`/meetings/${meetingId}/join`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', variables.meetingId] });
    },
  });
}

export function useLeaveMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, workspaceId }: { meetingId: string; workspaceId: string }) => {
      return api<{ success: boolean; message: string }>(`/meetings/${meetingId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', variables.meetingId] });
    },
  });
}

export function useUpdateMeetingNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      workspaceId,
      notes,
    }: {
      meetingId: string;
      workspaceId: string;
      notes: string;
    }) => {
      return api<{ meeting: MeetingItem; document: any }>(`/meetings/${meetingId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ workspaceId, notes }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.workspaceId] });
    },
  });
}

export function usePostChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, message, workspaceId }: { meetingId: string; message: string; workspaceId?: string }) => {
      return api(`/meetings/${meetingId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, workspaceId }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', variables.meetingId] });
    },
  });
}

export function useProcessMeetingIntelligence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      workspaceId,
      transcript,
      notes,
    }: {
      meetingId: string;
      workspaceId: string;
      transcript?: string;
      notes?: string;
    }) => {
      return api<{ meeting: MeetingItem; intelligence: any }>(`/meetings/${meetingId}/process`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId, transcript, notes }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', variables.meetingId, variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.workspaceId] });
    },
  });
}

export function useApproveMeetingTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      workspaceId,
      projectId,
      tasks,
    }: {
      meetingId: string;
      workspaceId: string;
      projectId: string;
      tasks: Array<{
        title: string;
        description?: string;
        priority: string;
        assigneeId?: string | null;
        dueDate?: string | null;
      }>;
    }) => {
      return api(`/meetings/${meetingId}/approve-tasks`, {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          projectId,
          tasks,
        }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.workspaceId] });
    },
  });
}
