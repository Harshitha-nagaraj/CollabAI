'use client';

import React from 'react';
import type { MeetingItem, MeetingFollowThroughTask } from '@/lib/queries/meetings';
import {
  useJoinMeeting,
  useLeaveMeeting,
  useMeetingDetails,
  useMeetingFollowThrough,
  useSendMeetingFollowUpReminders,
} from '@/lib/queries/meetings';
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
  Mic,
  AlertCircle,
  Bell,
  ListTodo,
  TrendingUp,
  ExternalLink,
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

function MeetingFollowThroughSection({
  meetingId,
  workspaceId,
}: {
  meetingId: string;
  workspaceId: string;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const { data: followThrough, isLoading, refetch } = useMeetingFollowThrough(meetingId, workspaceId);
  const sendRemindersMutation = useSendMeetingFollowUpReminders();

  const metrics = followThrough?.metrics || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    completionRate: 0,
    overdueCount: 0,
  };

  const tasksList = followThrough?.tasks;
  const filteredTasks: MeetingFollowThroughTask[] = React.useMemo(() => {
    if (!tasksList) return [];
    if (filter === 'PENDING') return tasksList.pending;
    if (filter === 'IN_PROGRESS') return tasksList.inProgress;
    if (filter === 'COMPLETED') return tasksList.completed;
    return tasksList.all;
  }, [tasksList, filter]);

  const openTasksWithAssignees = React.useMemo(() => {
    if (!tasksList?.all) return [];
    return tasksList.all.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.assignee?.id);
  }, [tasksList]);

  const handleSendReminders = async () => {
    try {
      const res = await sendRemindersMutation.mutateAsync({ meetingId, workspaceId });
      toast(res.message, res.sentCount > 0 ? 'success' : 'info');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Failed to dispatch follow-up reminders', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#1F4D3A]/10 border border-[#1F4D3A]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#1F4D3A]">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
            <Clock className="h-3 w-3" />
            In Review
          </span>
        );
      case 'TODO':
      case 'BACKLOG':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#E4DED4] px-1.5 py-0.5 text-[10px] font-semibold text-[#525B56]">
            <ListTodo className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return <span className="text-[9px] font-bold text-[#C96B4A] uppercase bg-[#C96B4A]/10 px-1.5 py-0.5 rounded">{priority}</span>;
      case 'MEDIUM':
        return <span className="text-[9px] font-semibold text-[#525B56] uppercase bg-[#E2DCD2]/50 px-1.5 py-0.5 rounded">{priority}</span>;
      default:
        return <span className="text-[9px] text-[#525B56] uppercase bg-[#E2DCD2]/40 px-1.5 py-0.5 rounded">Low</span>;
    }
  };

  return (
    <div className="space-y-3 border-t border-[#E2DCD2] pt-4" data-testid="meeting-follow-through-section">
      {/* Header with Title & Send Reminders Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E2DCD2] pb-2">
        <div>
          <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            AI Meeting Follow-Through & Tasks ({metrics.total})
          </span>
          <p className="text-[11px] text-[#525B56]">
            Approved action items tracked in real-time Kanban with PostgreSQL status
          </p>
        </div>

        {metrics.total > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendReminders}
            loading={sendRemindersMutation.isPending}
            disabled={openTasksWithAssignees.length === 0}
            data-testid="send-follow-up-reminders-btn"
            className="text-[11px] gap-1.5 border-[#1F4D3A]/30 text-[#1F4D3A] hover:bg-[#1F4D3A]/5 self-start sm:self-auto shrink-0"
            title="Sends non-spam notification reminders to assignees (24h cooldown per assignee)"
          >
            <Bell className="h-3.5 w-3.5 text-[#1F4D3A]" />
            Send Follow-up Reminders
            {openTasksWithAssignees.length > 0 && (
              <span className="ml-1 rounded-full bg-[#1F4D3A] px-1.5 py-0.2 text-[9px] font-bold text-white">
                {openTasksWithAssignees.length}
              </span>
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 text-center space-y-2">
          <div className="h-4 w-1/3 bg-[#E2DCD2] rounded animate-pulse mx-auto" />
          <p className="text-[11px] text-[#525B56]">Loading linked follow-through tasks...</p>
        </div>
      ) : metrics.total === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E2DCD2] bg-[#F7F5F0] p-4 text-center space-y-2">
          <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-[#E2DCD2]/70 text-[#525B56]">
            <ListTodo className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold text-[#1C2421]">No approved tasks linked to this meeting yet</p>
          <p className="text-[11px] text-[#525B56] max-w-md mx-auto leading-relaxed">
            CollabAI enforces strict human approval: AI-extracted action items do not auto-create tasks without explicit review.
            Open the meeting in the AI Workspace or Task Approval Hub to approve proposed tasks into Kanban.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Progress Bar & KPI Cards */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1C2421] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F4D3A]" />
                Execution Progress: {metrics.completed} of {metrics.total} Done
              </span>
              <span className="font-bold text-[#1F4D3A] font-mono">{metrics.completionRate}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
              <div
                className="h-full bg-[#1F4D3A] transition-all duration-500 rounded-full"
                style={{ width: `${metrics.completionRate}%` }}
              />
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="rounded-lg bg-white p-1.5 border border-[#E2DCD2]/70">
                <span className="block text-[10px] text-[#525B56] uppercase tracking-wider font-semibold">Total</span>
                <span className="text-sm font-bold text-[#1C2421]">{metrics.total}</span>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-[#E2DCD2]/70">
                <span className="block text-[10px] text-[#525B56] uppercase tracking-wider font-semibold">Pending</span>
                <span className="text-sm font-bold text-[#525B56]">{metrics.pending}</span>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-[#E2DCD2]/70">
                <span className="block text-[10px] text-sky-700 uppercase tracking-wider font-semibold">In Progress</span>
                <span className="text-sm font-bold text-sky-800">{metrics.inProgress}</span>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-[#E2DCD2]/70">
                <span className="block text-[10px] text-[#1F4D3A] uppercase tracking-wider font-semibold">Completed</span>
                <span className="text-sm font-bold text-[#1F4D3A]">{metrics.completed}</span>
              </div>
            </div>

            {metrics.overdueCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[#C96B4A]/10 border border-[#C96B4A]/30 p-2 text-xs text-[#C96B4A]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-semibold">
                  {metrics.overdueCount} task(s) are overdue past their scheduled due dates.
                </span>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 border-b border-[#E2DCD2] pb-1 overflow-x-auto text-xs">
            <button
              onClick={() => setFilter('ALL')}
              data-testid="follow-through-filter-all"
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[#1F4D3A] text-white'
                  : 'text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421]'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              data-testid="follow-through-filter-pending"
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filter === 'PENDING'
                  ? 'bg-[#1F4D3A] text-white'
                  : 'text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421]'
              }`}
            >
              Pending ({metrics.pending})
            </button>
            <button
              onClick={() => setFilter('IN_PROGRESS')}
              data-testid="follow-through-filter-in-progress"
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filter === 'IN_PROGRESS'
                  ? 'bg-[#1F4D3A] text-white'
                  : 'text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421]'
              }`}
            >
              In Progress ({metrics.inProgress})
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              data-testid="follow-through-filter-completed"
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filter === 'COMPLETED'
                  ? 'bg-[#1F4D3A] text-white'
                  : 'text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421]'
              }`}
            >
              Completed ({metrics.completed})
            </button>
          </div>

          {/* Filtered Tasks List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filteredTasks.length === 0 ? (
              <p className="text-xs text-[#525B56] italic py-2 text-center">
                No tasks matching the selected &quot;{filter.toLowerCase().replace('_', ' ')}&quot; filter.
              </p>
            ) : (
              filteredTasks.map((task) => {
                const assigneeName = task.assignee?.name || task.assignee?.email?.split('@')[0] || 'Unassigned';
                const assigneeInitials = (assigneeName.slice(0, 2)).toUpperCase();
                const dueDateFormatted = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

                return (
                  <div
                    key={task.id}
                    data-testid="follow-through-task-item"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-[#E2DCD2] bg-white p-2.5 text-xs hover:border-[#1F4D3A]/40 transition-colors shadow-2xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                        {task.projectName && (
                          <span className="text-[10px] text-[#525B56] bg-[#F7F5F0] border border-[#E2DCD2] px-1.5 py-0.5 rounded">
                            {task.projectName}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-[#1C2421] truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-[11px] text-[#525B56] line-clamp-1">{task.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                      {/* Assignee Badge */}
                      <div className="flex items-center gap-1.5" title={task.assignee?.email || 'Unassigned'}>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A] text-[9px] font-bold text-white uppercase">
                          {assigneeInitials}
                        </div>
                        <span className="text-[11px] text-[#1C2421] max-w-[100px] truncate">{assigneeName}</span>
                      </div>

                      {/* Due Date & Overdue Indicator */}
                      {dueDateFormatted ? (
                        <div className={`flex items-center gap-1 text-[11px] ${task.isOverdue ? 'text-[#C96B4A] font-bold' : 'text-[#525B56]'}`}>
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{dueDateFormatted}</span>
                          {task.isOverdue && (
                            <span className="rounded bg-[#C96B4A]/10 px-1 py-0.2 text-[9px] text-[#C96B4A] font-bold">
                              Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#525B56] italic">No due date</span>
                      )}

                      {/* Link to Kanban */}
                      <a
                        href="/dashboard/kanban"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1F4D3A] transition-colors"
                        title="View in Kanban Board"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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
      const msg = err?.message || 'Failed to join meeting';
      if (err?.isNetworkError || msg.includes('Unable to reach') || msg.includes('Failed to fetch')) {
        toast('Unable to connect to CollabAI API server. Please ensure the backend is running on port 4000 to record attendance.', 'error');
      } else {
        toast(msg, 'error');
      }
    }
  };

  const handleLeave = async () => {
    if (!meetingId || !workspaceId) return;
    try {
      await leaveMeetingMutation.mutateAsync({ meetingId, workspaceId });
      toast('You left the meeting.', 'info');
      refetch();
    } catch (err: any) {
      const msg = err?.message || 'Failed to leave meeting';
      if (err?.isNetworkError || msg.includes('Unable to reach') || msg.includes('Failed to fetch')) {
        toast('Unable to connect to CollabAI API server. Please ensure the backend is running on port 4000 to update attendance.', 'error');
      } else {
        toast(msg, 'error');
      }
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
                      data-testid="leave-meeting-modal-btn"
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
                      data-testid="join-meeting-btn"
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

            {/* AI Meeting Follow-Through & Task Execution Section */}
            <MeetingFollowThroughSection
              meetingId={meeting.id}
              workspaceId={workspaceId || meeting.workspaceId}
            />

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

            {/* Meeting Audio Transcript */}
            <div className="space-y-2 border-t border-[#E2DCD2] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" />
                  Meeting Audio Transcript {meeting.transcript ? '(Available)' : '(Not yet transcribed)'}
                </span>
                {meeting.transcript && (
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Local Whisper
                  </span>
                )}
              </div>

              {meeting.transcript ? (
                <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3">
                  <p className="text-xs text-[#252D2A] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                    {meeting.transcript}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#525B56] italic">
                  No audio transcript recorded for this meeting yet. Open in Live Room to upload recorded audio for local transcription.
                </p>
              )}
            </div>

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
