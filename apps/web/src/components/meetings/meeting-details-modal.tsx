'use client';

import React from 'react';
import type { MeetingItem } from '@/lib/queries/meetings';
import { useJoinMeeting, useLeaveMeeting, useMeetingDetails } from '@/lib/queries/meetings';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  Calendar,
  Clock,
  User,
  Users,
  Video,
  X,
  FileText,
  Sparkles,
  CheckCircle2,
  Globe,
  UserCheck,
  UserMinus,
} from 'lucide-react';

interface MeetingDetailsModalProps {
  isOpen: boolean;
  meetingId: string | null;
  workspaceId: string | null;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  onClose: () => void;
  onOpenInRoom: (meeting: MeetingItem) => void;
}

export function MeetingDetailsModal({
  isOpen,
  meetingId,
  workspaceId,
  currentUserId,
  currentUserEmail,
  onClose,
  onOpenInRoom,
}: MeetingDetailsModalProps) {
  const { toast } = useToast();
  const { data: meeting, isLoading, isError, refetch } = useMeetingDetails(meetingId, workspaceId);
  const joinMeetingMutation = useJoinMeeting();
  const leaveMeetingMutation = useLeaveMeeting();

  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getTimezoneInfo = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offsetMinutes = -new Date().getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const formattedOffset = `UTC${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      return `${tz} (${formattedOffset})`;
    } catch {
      return 'Local Timezone';
    }
  };

  const isUserJoined = meeting?.participants?.some(
    (p) =>
      (currentUserId && (p.userId === currentUserId || p.user?.id === currentUserId)) ||
      (currentUserEmail && p.user?.email?.toLowerCase() === currentUserEmail.toLowerCase())
  );

  const handleJoin = async () => {
    if (!meetingId || !workspaceId) return;
    try {
      await joinMeetingMutation.mutateAsync({ meetingId, workspaceId });
      toast('You joined the meeting! Attendance recorded in database.', 'success');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Failed to join meeting', 'error');
    }
  };

  const handleLeave = async () => {
    if (!meetingId || !workspaceId) return;
    try {
      await leaveMeetingMutation.mutateAsync({ meetingId, workspaceId });
      toast('You left the meeting.', 'info');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Failed to leave meeting', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E2DCD2] bg-white p-6 shadow-xl scrollbar-thin">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-6 w-1/3 bg-[#E2DCD2] rounded-md animate-pulse mx-auto" />
            <div className="h-4 w-1/2 bg-[#E2DCD2]/60 rounded-md animate-pulse mx-auto" />
            <p className="text-xs text-[#525B56]">Loading meeting details from PostgreSQL...</p>
          </div>
        ) : isError || !meeting ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-[#C96B4A]">Unable to load meeting details.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header / Badges */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-[#F0EEE6] px-2.5 py-0.5 text-[11px] font-bold text-[#525B56] uppercase tracking-wider">
                  {meeting.type?.replace(/_/g, ' ') || 'GENERAL MEETING'}
                </span>
                <span className="rounded-full border border-[#1F4D3A]/25 bg-[#1F4D3A]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1F4D3A]">
                  • {meeting.status}
                </span>
                {meeting.workspace?.name && (
                  <span className="rounded-md bg-[#F7F5F0] border border-[#E2DCD2] px-2 py-0.5 text-[11px] text-[#525B56]">
                    Workspace: <strong className="text-[#1C2421]">{meeting.workspace.name}</strong>
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-[#1C2421] capitalize">
                {meeting.title}
              </h2>

              {meeting.description && (
                <p className="mt-1 text-xs text-[#525B56] leading-relaxed">
                  {meeting.description}
                </p>
              )}
            </div>

            {/* Time & Timezone Box */}
            <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#1F4D3A]" />
                Scheduled Date & Time (Timezone Validated)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="flex items-center gap-2 text-[#1C2421]">
                  <Calendar className="h-4 w-4 text-[#1F4D3A] shrink-0" />
                  <div>
                    <span className="font-semibold block">{formatDate(meeting.startTime)}</span>
                    <span className="text-[11px] text-[#525B56]">
                      {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#1C2421]">
                  <Globe className="h-4 w-4 text-[#1F4D3A] shrink-0" />
                  <div>
                    <span className="font-semibold block">{getTimezoneInfo()}</span>
                    <span className="text-[10px] text-[#525B56] font-mono block">
                      UTC: {new Date(meeting.startTime).toISOString().replace('T', ' ').slice(0, 19)}Z
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Organizer & Attendance Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organizer Card */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 space-y-2 shadow-2xs">
                <span className="text-[11px] font-bold text-[#525B56] uppercase tracking-wider block">
                  Organizer
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A] text-xs font-bold text-white uppercase shadow-xs">
                    {(meeting.creator?.name || meeting.creator?.email || 'O').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#1C2421]">
                      {meeting.creator?.name || 'Workspace Member'}
                    </p>
                    <p className="truncate text-[11px] text-[#525B56]">{meeting.creator?.email}</p>
                  </div>
                </div>
              </div>

              {/* Attendance Action Card */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 space-y-2 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#525B56] uppercase tracking-wider block">
                    Your Attendance
                  </span>
                  <p className="text-xs text-[#525B56] mt-0.5">
                    {isUserJoined
                      ? 'You are currently recorded as an attendee in PostgreSQL.'
                      : 'You have not joined this meeting yet.'}
                  </p>
                </div>
                <div className="pt-2">
                  {isUserJoined ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLeave}
                      loading={leaveMeetingMutation.isPending}
                      className="text-xs border-[#C96B4A]/40 text-[#C96B4A] hover:bg-[#C96B4A]/10 w-full"
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                      Leave Meeting
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleJoin}
                      loading={joinMeetingMutation.isPending}
                      className="text-xs w-full bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                      Join & Confirm Attendance
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Persisted Participants List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-1.5">
                <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Confirmed Attendees in PostgreSQL ({meeting.participants?.length || 0})
                </span>
                <span className="text-[10px] text-[#525B56]">Persistent Records</span>
              </div>

              {meeting.participants && meeting.participants.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {meeting.participants.map((p, idx) => {
                    const userName = p.user?.name || p.user?.email?.split('@')[0] || 'Attendee';
                    return (
                      <div
                        key={p.id || idx}
                        className="flex items-center gap-2.5 rounded-lg border border-[#E2DCD2]/70 bg-[#F7F5F0] p-2 text-xs"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A] text-[10px] font-bold text-white uppercase">
                          {userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#1C2421]">{userName}</p>
                          <p className="truncate text-[10px] text-[#525B56]">{p.user?.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#525B56] italic py-2">
                  No participant attendance recorded in PostgreSQL yet. Click &quot;Join & Confirm Attendance&quot; above to add your record.
                </p>
              )}
            </div>

            {/* Stored Documents & Notes */}
            {meeting.documents && meeting.documents.length > 0 && (
              <div className="space-y-2 border-t border-[#E2DCD2] pt-4">
                <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Stored Documents & AI Logs ({meeting.documents.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {meeting.documents.map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#1C2421]">{doc.title}</strong>
                        <span className="text-[10px] font-semibold text-[#1F4D3A] bg-[#1F4D3A]/10 px-2 py-0.5 rounded">
                          {doc.type}
                        </span>
                      </div>
                      {doc.content && (
                        <p className="mt-1 text-[11px] text-[#525B56] line-clamp-2 font-mono bg-white p-1.5 rounded border border-[#E2DCD2]/60">
                          {doc.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[#E2DCD2] pt-4">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenInRoom(meeting);
                }}
                className="text-xs gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
              >
                <Video className="h-3.5 w-3.5" />
                Open in Live Room
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
