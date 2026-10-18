'use client';

import { useState, useMemo } from 'react';
import { useProjectActivities } from '@/lib/queries/projects';
import type { ProjectActivity, ActivityAction, ActivityEntityType, ProjectStatus, TaskStatus } from '@/types';
import { Badge, StatusBadge, ProjectStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  Filter,
  FolderPlus,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';

interface ProjectActivityFeedProps {
  projectId: string;
  projectName?: string;
}

type FilterCategory = 'ALL' | 'TASKS' | 'PROJECT' | 'ASSIGNMENTS' | 'STATUS_CHANGES';

/**
 * Formats date into a human-friendly relative time string.
 */
function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 45) return 'Just now';
  if (diffInSeconds < 90) return '1 minute ago';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats full human-readable date and time for tooltip/hover.
 */
function formatExactTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Extracts initials from an actor's name or email.
 */
function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'CA';
}

/**
 * Returns icon and color styling based on action type.
 */
function getActionVisuals(action: ActivityAction) {
  switch (action) {
    case 'PROJECT_CREATED':
      return {
        icon: Sparkles,
        bg: 'bg-[#1F4D3A] text-white ring-4 ring-[#1F4D3A]/10',
        badgeColor: 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/25',
        label: 'Project Created',
      };
    case 'PROJECT_STATUS_CHANGED':
      return {
        icon: RefreshCw,
        bg: 'bg-[#FAF3E0] text-[#B88728] border border-[#B88728]/30 ring-4 ring-[#B88728]/10',
        badgeColor: 'bg-[#FAF3E0] text-[#B88728] border-[#B88728]/30',
        label: 'Status Changed',
      };
    case 'PROJECT_UPDATED':
      return {
        icon: Edit2,
        bg: 'bg-[#EBF2FA] text-[#2D68C4] border border-[#2D68C4]/30 ring-4 ring-[#2D68C4]/10',
        badgeColor: 'bg-[#EBF2FA] text-[#2D68C4] border-[#2D68C4]/30',
        label: 'Project Updated',
      };
    case 'TASK_CREATED':
      return {
        icon: Plus,
        bg: 'bg-[#E8EFE9] text-[#1F4D3A] border border-[#1F4D3A]/30 ring-4 ring-[#1F4D3A]/10',
        badgeColor: 'bg-[#E8EFE9] text-[#1F4D3A] border-[#1F4D3A]/25',
        label: 'Task Created',
      };
    case 'TASK_COMPLETED':
      return {
        icon: CheckCircle2,
        bg: 'bg-[#1F4D3A] text-white ring-4 ring-[#1F4D3A]/15',
        badgeColor: 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/25',
        label: 'Task Completed',
      };
    case 'TASK_STATUS_CHANGED':
      return {
        icon: ArrowUpDown,
        bg: 'bg-[#FAF3E0] text-[#9E731D] border border-[#C89B3C]/30 ring-4 ring-[#C89B3C]/10',
        badgeColor: 'bg-[#C89B3C]/15 text-[#9E731D] border-[#C89B3C]/30',
        label: 'Status Changed',
      };
    case 'TASK_ASSIGNED':
      return {
        icon: UserCheck,
        bg: 'bg-[#F2EDFB] text-[#6E48AA] border border-[#6E48AA]/30 ring-4 ring-[#6E48AA]/10',
        badgeColor: 'bg-[#F2EDFB] text-[#6E48AA] border-[#6E48AA]/30',
        label: 'Task Assigned',
      };
    case 'TASK_REASSIGNED':
      return {
        icon: Users,
        bg: 'bg-[#F2EDFB] text-[#6E48AA] border border-[#6E48AA]/30 ring-4 ring-[#6E48AA]/10',
        badgeColor: 'bg-[#F2EDFB] text-[#6E48AA] border-[#6E48AA]/30',
        label: 'Task Reassigned',
      };
    case 'TASK_UNASSIGNED':
      return {
        icon: UserX,
        bg: 'bg-[#FAF1EC] text-[#C96B4A] border border-[#C96B4A]/30 ring-4 ring-[#C96B4A]/10',
        badgeColor: 'bg-[#FAF1EC] text-[#C96B4A] border-[#C96B4A]/30',
        label: 'Task Unassigned',
      };
    case 'TASK_DUE_DATE_CHANGED':
      return {
        icon: Calendar,
        bg: 'bg-[#FAF1EC] text-[#C96B4A] border border-[#C96B4A]/30 ring-4 ring-[#C96B4A]/10',
        badgeColor: 'bg-[#FAF1EC] text-[#C96B4A] border-[#C96B4A]/30',
        label: 'Due Date Changed',
      };
    case 'TASK_DELETED':
      return {
        icon: Trash2,
        bg: 'bg-[#FFF5F5] text-[#C93B3B] border border-[#C93B3B]/30 ring-4 ring-[#C93B3B]/10',
        badgeColor: 'bg-[#FFF5F5] text-[#C93B3B] border-[#C93B3B]/25',
        label: 'Task Deleted',
      };
    case 'TASK_UPDATED':
    default:
      return {
        icon: Edit2,
        bg: 'bg-[#F0EEE6] text-[#525B56] border border-[#E2DCD2] ring-4 ring-[#E2DCD2]/20',
        badgeColor: 'bg-[#F0EEE6] text-[#525B56] border-[#E2DCD2]',
        label: 'Updated',
      };
  }
}

export function ProjectActivityFeed({ projectId, projectName }: ProjectActivityFeedProps) {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProjectActivities(projectId, 20);

  const activities = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.activities);
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount ?? activities.length;

  const filteredActivities = useMemo(() => {
    if (filterCategory === 'ALL') return activities;

    return activities.filter((act) => {
      if (filterCategory === 'TASKS') {
        return act.entityType === 'TASK';
      }
      if (filterCategory === 'PROJECT') {
        return act.entityType === 'PROJECT';
      }
      if (filterCategory === 'ASSIGNMENTS') {
        return (
          act.action === 'TASK_ASSIGNED' ||
          act.action === 'TASK_REASSIGNED' ||
          act.action === 'TASK_UNASSIGNED'
        );
      }
      if (filterCategory === 'STATUS_CHANGES') {
        return (
          act.action === 'PROJECT_STATUS_CHANGED' ||
          act.action === 'TASK_STATUS_CHANGED' ||
          act.action === 'TASK_COMPLETED'
        );
      }
      return true;
    });
  }, [activities, filterCategory]);

  return (
    <div className="space-y-4">
      {/* Feed Header & Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E2DCD2] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8EFE9] text-[#1F4D3A]">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1C2421]">Project Audit Trail</h3>
              <span className="inline-flex items-center rounded-full bg-[#F0EEE6] px-2 py-0.5 text-[10px] font-semibold text-[#525B56] border border-[#E2DCD2]">
                {totalCount} {totalCount === 1 ? 'event' : 'events'}
              </span>
            </div>
            <p className="text-[11px] text-[#525B56]">
              Real-time audit log of team actions, task updates, and project status transitions.
            </p>
          </div>
        </div>

        {/* Filter Pills & Refresh */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-1 text-xs">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterCategory === 'ALL'
                  ? 'bg-white font-semibold text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('STATUS_CHANGES')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterCategory === 'STATUS_CHANGES'
                  ? 'bg-white font-semibold text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setFilterCategory('ASSIGNMENTS')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterCategory === 'ASSIGNMENTS'
                  ? 'bg-white font-semibold text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => setFilterCategory('TASKS')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterCategory === 'TASKS'
                  ? 'bg-white font-semibold text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setFilterCategory('PROJECT')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterCategory === 'PROJECT'
                  ? 'bg-white font-semibold text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Project
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1 border-[#E2DCD2] bg-white px-2.5 text-xs text-[#525B56] hover:text-[#1F4D3A]"
            title="Refresh Activity Log"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin text-[#1F4D3A]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 rounded-2xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-[#E2DCD2]/60 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 rounded bg-[#E2DCD2]/60" />
                <div className="h-2.5 w-72 rounded bg-[#E2DCD2]/40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-2xl border border-[#C93B3B]/20 bg-[#FFF5F5] p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-8 w-8 text-[#C93B3B]" />
          <h4 className="mt-2 text-sm font-bold text-[#1C2421]">Failed to load project activity</h4>
          <p className="mt-1 text-xs text-[#525B56]">
            {(error as any)?.message || 'An unexpected error occurred while fetching audit log events.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 border-[#C93B3B]/30 text-xs text-[#C93B3B] hover:bg-[#FFF0F0]"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredActivities.length === 0 && (
        <div className="rounded-2xl border border-[#E2DCD2] bg-white p-12 text-center shadow-xs space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5F0] text-[#525B56] border border-[#E2DCD2]">
            <Clock className="h-6 w-6 text-[#1F4D3A]/60" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#1C2421]">
              {filterCategory === 'ALL'
                ? 'No activity recorded yet'
                : 'No matching events found for filter'}
            </h4>
            <p className="mx-auto max-w-md text-xs text-[#525B56] leading-relaxed">
              {filterCategory === 'ALL'
                ? `Actions in this project — such as task creation, assignments, and status updates — will automatically record in this verifiable audit trail.`
                : 'Try selecting "All" or a different category to view other audit trail records.'}
            </p>
          </div>
          {filterCategory !== 'ALL' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterCategory('ALL')}
              className="border-[#E2DCD2] text-xs text-[#1F4D3A]"
            >
              Show All Events
            </Button>
          )}
        </div>
      )}

      {/* Activity Timeline Stream */}
      {!isLoading && !isError && filteredActivities.length > 0 && (
        <div className="rounded-2xl border border-[#E2DCD2] bg-white p-5 sm:p-6 shadow-xs">
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2DCD2]">
            <div className="space-y-6">
              {filteredActivities.map((activity, idx) => (
                <TimelineEventItem key={activity.id || idx} activity={activity} />
              ))}
            </div>
          </div>

          {/* Load More Pagination */}
          {hasNextPage && (
            <div className="mt-8 pt-4 border-t border-[#E2DCD2]/70 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="gap-1.5 border-[#E2DCD2] bg-[#F7F5F0] text-xs font-semibold text-[#1F4D3A] hover:bg-[#E8EFE9]"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading Earlier Events...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Load Earlier Activity
                  </>
                )}
              </Button>
            </div>
          )}

          {!hasNextPage && activities.length > 5 && (
            <div className="mt-8 pt-4 border-t border-[#E2DCD2]/60 text-center">
              <span className="text-[11px] font-medium text-[#8A948D]">
                Beginning of recorded project history • {totalCount} events logged
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Timeline Event Component with rich description and badge rendering.
 */
function TimelineEventItem({ activity }: { activity: ProjectActivity }) {
  const visuals = getActionVisuals(activity.action);
  const IconComponent = visuals.icon;
  const actorName = activity.actor?.name || activity.actor?.email?.split('@')[0] || 'Team Member';
  const actorEmail = activity.actor?.email;
  const initials = getInitials(activity.actor?.name, activity.actor?.email);
  const relativeTime = formatRelativeTime(activity.createdAt);
  const exactTime = formatExactTime(activity.createdAt);

  return (
    <div className="relative group">
      {/* Left Icon Node on the spine */}
      <div
        className={`absolute -left-6 sm:-left-8 top-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shadow-xs transition-transform group-hover:scale-105 ${visuals.bg}`}
      >
        <IconComponent className="h-3.5 w-3.5" />
      </div>

      {/* Event Details Card */}
      <div className="rounded-xl border border-[#E2DCD2]/80 bg-[#FAF9F5] p-3.5 transition-all hover:border-[#1F4D3A]/30 hover:bg-white shadow-2xs">
        {/* Header row: Actor & Action & Timestamp */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Actor Avatar or Initials */}
            {activity.actor?.avatarUrl ? (
              <img
                src={activity.actor.avatarUrl}
                alt={actorName}
                className="h-5 w-5 rounded-full object-cover border border-[#E2DCD2]"
              />
            ) : (
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[9px] font-bold text-[#1F4D3A]"
                title={actorEmail || actorName}
              >
                {initials}
              </div>
            )}

            <span className="text-xs font-semibold text-[#1C2421]">{actorName}</span>

            {/* Action pill */}
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${visuals.badgeColor}`}
            >
              {visuals.label}
            </span>
          </div>

          {/* Time with accessible hover tooltip */}
          <div
            className="flex items-center gap-1 text-[11px] text-[#8A948D] cursor-help"
            title={exactTime}
          >
            <Clock className="h-3 w-3 opacity-60" />
            <span>{relativeTime}</span>
          </div>
        </div>

        {/* Narrative Description & Context */}
        <div className="mt-2 text-xs text-[#2D3330] leading-relaxed">
          <ActivityDescription activity={activity} />
        </div>
      </div>
    </div>
  );
}

/**
 * Human-readable narrative description formatter for each event type.
 */
function ActivityDescription({ activity }: { activity: ProjectActivity }) {
  const { action, entityTitle, details } = activity;

  switch (action) {
    case 'PROJECT_CREATED':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Created project workspace</span>
          <strong className="text-[#1C2421] font-semibold">"{entityTitle}"</strong>
          {details?.key && (
            <Badge variant="outline" className="text-[10px] py-0 font-mono">
              {details.key}
            </Badge>
          )}
        </div>
      );

    case 'PROJECT_STATUS_CHANGED': {
      const prev = details?.previousStatus as ProjectStatus | undefined;
      const next = details?.newStatus as ProjectStatus | undefined;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Transitioned project status from</span>
          {prev ? <ProjectStatusBadge status={prev} /> : <span className="italic text-[#8A948D]">initial</span>}
          <span>to</span>
          {next ? <ProjectStatusBadge status={next} /> : <span className="font-semibold">{entityTitle}</span>}
        </div>
      );
    }

    case 'PROJECT_UPDATED': {
      const changes = details?.changes;
      if (changes?.name) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>Renamed project from</span>
            <span className="line-through text-[#8A948D]">"{changes.name.from}"</span>
            <span>to</span>
            <strong className="text-[#1C2421]">"{changes.name.to}"</strong>
          </div>
        );
      }
      if (changes?.description) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>Updated project description for</span>
            <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          </div>
        );
      }
      return (
        <div>
          <span>Updated project settings for</span>{' '}
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
        </div>
      );
    }

    case 'TASK_CREATED':
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Created new task</span>
          <strong className="text-[#1C2421] font-semibold">"{entityTitle}"</strong>
          {details?.priority && (
            <span className="text-[10px] text-[#525B56] font-medium">({details.priority.toLowerCase()} priority)</span>
          )}
        </div>
      );

    case 'TASK_STATUS_CHANGED': {
      const prev = details?.previousStatus as TaskStatus | undefined;
      const next = details?.newStatus as TaskStatus | undefined;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Moved task</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          <span>from</span>
          {prev ? <StatusBadge status={prev} /> : <span className="italic text-[#8A948D]">previous state</span>}
          <span>to</span>
          {next ? <StatusBadge status={next} /> : <span className="font-semibold">new status</span>}
        </div>
      );
    }

    case 'TASK_COMPLETED':
      return (
        <div className="flex items-center gap-1.5 flex-wrap text-[#1F4D3A]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Marked deliverable</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          <span>as completed</span>
        </div>
      );

    case 'TASK_ASSIGNED': {
      const assigneeName = details?.newAssignee?.name || details?.newAssignee?.email || 'a team member';
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Assigned task</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          <span>to</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F2EDFB] px-1.5 py-0.5 text-[11px] font-semibold text-[#6E48AA] border border-[#6E48AA]/25">
            <UserCheck className="h-3 w-3" />
            {assigneeName}
          </span>
        </div>
      );
    }

    case 'TASK_REASSIGNED': {
      const prevName = details?.previousAssignee?.name || details?.previousAssignee?.email || 'previous assignee';
      const newName = details?.newAssignee?.name || details?.newAssignee?.email || 'new assignee';
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Reassigned task</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          <span>from</span>
          <span className="line-through text-[#8A948D]">{prevName}</span>
          <span>to</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F2EDFB] px-1.5 py-0.5 text-[11px] font-semibold text-[#6E48AA] border border-[#6E48AA]/25">
            <UserCheck className="h-3 w-3" />
            {newName}
          </span>
        </div>
      );
    }

    case 'TASK_UNASSIGNED': {
      const prevName = details?.previousAssignee?.name || details?.previousAssignee?.email;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Unassigned task</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          {prevName && (
            <span className="text-[#8A948D] text-[11px]">
              (previously assigned to {prevName})
            </span>
          )}
        </div>
      );
    }

    case 'TASK_DUE_DATE_CHANGED': {
      const newDateStr = details?.newDueDate
        ? new Date(details.newDueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : null;
      const prevDateStr = details?.previousDueDate
        ? new Date(details.previousDueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : null;

      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Updated due date for</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
          <span>to</span>
          {newDateStr ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF1EC] px-1.5 py-0.5 text-[11px] font-semibold text-[#C96B4A] border border-[#C96B4A]/25">
              <Calendar className="h-3 w-3" />
              {newDateStr}
            </span>
          ) : (
            <span className="italic text-[#8A948D]">none (due date removed)</span>
          )}
          {prevDateStr && (
            <span className="text-[10px] text-[#8A948D]">(was {prevDateStr})</span>
          )}
        </div>
      );
    }

    case 'TASK_DELETED':
      return (
        <div className="flex items-center gap-1.5 flex-wrap text-[#C93B3B]">
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span>Permanently removed task</span>
          <strong className="line-through">"{entityTitle}"</strong>
          <span>from project</span>
        </div>
      );

    case 'TASK_UPDATED':
    default:
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Updated task details for</span>
          <strong className="text-[#1C2421]">"{entityTitle}"</strong>
        </div>
      );
  }
}
