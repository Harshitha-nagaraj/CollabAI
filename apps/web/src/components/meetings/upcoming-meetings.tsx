'use client';

import React, { useState, useMemo } from 'react';
import type { MeetingItem } from '@/lib/queries/meetings';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  Users,
  Sparkles,
  RefreshCw,
  Plus,
  AlertCircle,
  Video,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface UpcomingMeetingsProps {
  meetings: MeetingItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh?: () => void;
  onScheduleClick: () => void;
  onSelectMeeting: (meeting: MeetingItem) => void;
  onViewDetails?: (meeting: MeetingItem) => void;
  selectedMeetingId?: string | null;
  workspaceName?: string;
  workspaces?: Array<{ id: string; name: string }>;
  selectedWorkspaceId?: string | null;
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function UpcomingMeetings({
  meetings,
  isLoading,
  isError,
  error,
  onRefresh,
  onScheduleClick,
  onSelectMeeting,
  onViewDetails,
  selectedMeetingId,
  workspaceName,
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
}: UpcomingMeetingsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // Simulator mode for testing loading, empty, and error states
  const [simulationState, setSimulationState] = useState<'real' | 'loading' | 'empty' | 'error'>('real');

  const effectiveLoading = simulationState === 'loading' || (simulationState === 'real' && isLoading);
  const effectiveError = simulationState === 'error' || (simulationState === 'real' && isError);
  const effectiveMeetings = useMemo(() => {
    if (simulationState === 'empty') return [];
    if (simulationState !== 'real') return meetings;
    return meetings;
  }, [simulationState, meetings]);

  const filteredMeetings = useMemo(() => {
    if (!searchTerm.trim()) return effectiveMeetings;
    const q = searchTerm.toLowerCase();
    return effectiveMeetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.creator?.name?.toLowerCase().includes(q) ||
        m.creator?.email?.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
    );
  }, [effectiveMeetings, searchTerm]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTimeRange = (startStr: string, endStr?: string) => {
    try {
      const start = new Date(startStr);
      if (isNaN(start.getTime())) return startStr;
      const formattedStart = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(start);

      if (!endStr) return formattedStart;
      const end = new Date(endStr);
      if (isNaN(end.getTime())) return formattedStart;

      const formattedEnd = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(end);

      return `${formattedStart} - ${formattedEnd}`;
    } catch {
      return startStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const norm = status?.toUpperCase() || 'SCHEDULED';
    switch (norm) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1F4D3A]/25 bg-[#1F4D3A]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1F4D3A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1F4D3A]" />
            SCHEDULED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            LIVE NOW
          </span>
        );
      case 'COMPLETED':
      case 'SUMMARIZED':
      case 'PROCESSED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DCD2] bg-[#F0EEE6] px-2.5 py-0.5 text-[11px] font-semibold text-[#525B56]">
            <CheckCircle2 className="h-3 w-3 text-[#1F4D3A]" />
            {norm}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-[#E2DCD2] bg-[#F7F5F0] px-2.5 py-0.5 text-[11px] font-medium text-[#525B56]">
            {norm}
          </span>
        );
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2]/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1C2421] tracking-tight flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#1F4D3A]" />
              Upcoming & Scheduled Meetings
            </h3>
            {!effectiveLoading && !effectiveError && (
              <span className="rounded-full bg-[#1F4D3A]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1F4D3A]">
                {effectiveMeetings.length} {effectiveMeetings.length === 1 ? 'Meeting' : 'Meetings'}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#525B56] flex items-center gap-1.5 flex-wrap">
            <span>Sync sessions, AI-assisted standups, and sprint planning for</span>
            {workspaces && workspaces.length > 0 && onWorkspaceChange ? (
              <select
                id="meetings-workspace-select"
                data-testid="meetings-workspace-select"
                value={selectedWorkspaceId || ''}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="rounded-md border border-[#E2DCD2] bg-[#F7F5F0] px-2 py-0.5 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-hidden cursor-pointer"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-[#1C2421]">{workspaceName || 'this workspace'}</span>
            )}
          </p>
        </div>

        {/* Controls & Test State Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dev State Simulator Selector */}
          <div className="flex items-center rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-0.5 text-[11px]">
            <span className="px-2 font-medium text-[#767676]">State:</span>
            <button
              type="button"
              onClick={() => setSimulationState('real')}
              className={`rounded-md px-2 py-1 font-semibold transition-all cursor-pointer ${
                simulationState === 'real'
                  ? 'bg-white text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Real Data
            </button>
            <button
              type="button"
              onClick={() => setSimulationState('loading')}
              className={`rounded-md px-2 py-1 font-semibold transition-all cursor-pointer ${
                simulationState === 'loading'
                  ? 'bg-white text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Loading
            </button>
            <button
              type="button"
              onClick={() => setSimulationState('empty')}
              className={`rounded-md px-2 py-1 font-semibold transition-all cursor-pointer ${
                simulationState === 'empty'
                  ? 'bg-white text-[#1F4D3A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Empty
            </button>
            <button
              type="button"
              onClick={() => setSimulationState('error')}
              className={`rounded-md px-2 py-1 font-semibold transition-all cursor-pointer ${
                simulationState === 'error'
                  ? 'bg-white text-[#C96B4A] shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              Error
            </button>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2 text-xs"
              title="Refresh scheduled meetings"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#525B56]" />
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onScheduleClick}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Search Bar when meetings exist */}
      {!effectiveLoading && !effectiveError && effectiveMeetings.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#767676]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meetings by title or creator..."
            className="w-full rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] py-1.5 pl-9 pr-3 text-xs text-[#1C2421] placeholder-[#767676] focus:border-[#1F4D3A] focus:bg-white focus:outline-hidden"
          />
        </div>
      )}

      {/* STATE 1: LOADING STATE */}
      {effectiveLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded-full bg-[#E2DCD2]" />
                <div className="h-4 w-16 rounded-full bg-[#E2DCD2]" />
              </div>
              <div className="h-5 w-3/4 rounded bg-[#E2DCD2]" />
              <div className="h-14 rounded-lg bg-[#EFEBE3]" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#E2DCD2]" />
                  <div className="h-3.5 w-24 rounded bg-[#E2DCD2]" />
                </div>
                <div className="h-7 w-20 rounded bg-[#E2DCD2]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATE 2: ERROR STATE */}
      {!effectiveLoading && effectiveError && (
        <div className="rounded-xl border border-[#C96B4A]/30 bg-[#C96B4A]/5 p-6 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-[#C96B4A] mb-2" />
          <h4 className="text-sm font-bold text-[#1C2421]">Unable to Load Scheduled Meetings</h4>
          <p className="mt-1 text-xs text-[#525B56] max-w-md mx-auto">
            {error?.message || 'An error occurred while fetching meetings from the database.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSimulationState('real');
                onRefresh?.();
              }}
              className="text-xs"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* STATE 3: EMPTY STATE */}
      {!effectiveLoading && !effectiveError && filteredMeetings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2DCD2] bg-[#F7F5F0]/50 p-8 text-center">
          <div className="rounded-full bg-[#F0EEE6] p-3 text-[#1F4D3A] mb-3">
            <Calendar className="h-6 w-6 text-[#1F4D3A]" />
          </div>
          <h4 className="text-sm font-bold text-[#1C2421]">No Upcoming Meetings Scheduled</h4>
          <p className="mt-1 text-xs text-[#525B56] max-w-sm">
            {searchTerm
              ? `No meetings match "${searchTerm}". Try a different search term.`
              : 'There are no meetings scheduled in this workspace yet. Schedule one now or use the AI command bar (e.g. "schedule meeting sprint planning tomorrow at 3pm").'}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {searchTerm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="text-xs"
              >
                Clear Search
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onScheduleClick}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Schedule First Meeting
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STATE 4: SUCCESS WITH MEETINGS */}
      {!effectiveLoading && !effectiveError && filteredMeetings.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((meeting) => {
            const isSelected = selectedMeetingId === meeting.id;
            const creatorName = meeting.creator?.name || meeting.creator?.email?.split('@')[0] || 'Member';
            const creatorEmail = meeting.creator?.email || '';

            return (
              <div
                key={meeting.id}
                data-testid={`meeting-card-${meeting.id}`}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-[#1F4D3A] bg-[#1F4D3A]/[0.02] ring-1 ring-[#1F4D3A] shadow-xs'
                    : 'border-[#E2DCD2] bg-white hover:border-[#1F4D3A]/40 hover:shadow-xs'
                }`}
              >
                {/* Card Top: Type & Status Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#F0EEE6] px-2 py-0.5 text-[10px] font-bold text-[#525B56] uppercase tracking-wider">
                      {meeting.type?.replace(/_/g, ' ') || 'MEETING'}
                    </span>
                    {getStatusBadge(meeting.status)}
                  </div>

                  {/* Title */}
                  <h4
                    className="text-sm font-bold text-[#1C2421] capitalize tracking-tight group-hover:text-[#1F4D3A] transition-colors"
                    title={meeting.title}
                  >
                    {meeting.title}
                  </h4>

                  {/* Description if available */}
                  {meeting.description && (
                    <p className="text-xs text-[#525B56] line-clamp-1">
                      {meeting.description}
                    </p>
                  )}

                  {/* Time & Date Box */}
                  <div className="rounded-lg border border-[#E2DCD2]/60 bg-[#F7F5F0] p-2.5 space-y-1 text-xs">
                    <div className="flex items-center gap-2 font-medium text-[#1C2421]">
                      <Calendar className="h-3.5 w-3.5 text-[#1F4D3A] shrink-0" />
                      <span>{formatDate(meeting.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#525B56]">
                      <Clock className="h-3.5 w-3.5 text-[#1F4D3A] shrink-0" />
                      <span>{formatTimeRange(meeting.startTime, meeting.endTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Creator info & Open Room button */}
                <div className="mt-4 flex items-center justify-between border-t border-[#E2DCD2]/60 pt-3">
                  {/* Creator */}
                  <div className="flex items-center gap-2 min-w-0" title={`Organized by ${creatorName} (${creatorEmail})`}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A] text-[10px] font-bold text-white uppercase">
                      {getInitials(meeting.creator?.name, meeting.creator?.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#1C2421] leading-tight">
                        {creatorName}
                      </p>
                      <p className="text-[10px] text-[#767676] leading-tight">Organizer</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {onViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(meeting)}
                        data-testid={`meeting-details-btn-${meeting.id}`}
                        className="h-7 px-2 text-xs font-semibold text-[#525B56] hover:text-[#1C2421] border-[#E2DCD2]"
                      >
                        Details
                      </Button>
                    )}
                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => onSelectMeeting(meeting)}
                      data-testid={`open-in-room-btn-${meeting.id}`}
                      className={`h-7 px-2.5 text-xs font-semibold gap-1 ${
                        isSelected
                          ? 'bg-[#1F4D3A] text-white hover:bg-[#163E32]'
                          : 'border-[#1F4D3A]/30 text-[#1F4D3A] hover:bg-[#1F4D3A]/10'
                      }`}
                      title={isSelected ? 'Meeting currently loaded in room - click to view' : 'Load this meeting into the Live Meeting Room'}
                    >
                      <Video className="h-3 w-3" />
                      {isSelected ? 'Open in Room (Active)' : 'Open in Room'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
