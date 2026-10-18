'use client';

import type { TaskStatus, Priority } from '@/types';
import { Search } from 'lucide-react';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: TaskStatus | '';
  onStatusChange: (val: TaskStatus | '') => void;
  priorityFilter: Priority | '';
  onPriorityChange: (val: Priority | '') => void;
}

export function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#525B56]" />
        <input
          type="text"
          placeholder="Search task title or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-[#E2DCD2] bg-white py-2 pl-9 pr-4 text-xs font-medium text-[#1C2421] placeholder:text-[#525B56]/70 focus:border-[#1F4D3A] focus:outline-none"
        />
      </div>

      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as TaskStatus | '')}
        className="rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
      >
        <option value="">All Statuses</option>
        <option value="BACKLOG">Backlog</option>
        <option value="TODO">Todo</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {/* Priority Filter */}
      <select
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value as Priority | '')}
        className="rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
      >
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
    </div>
  );
}

