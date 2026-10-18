'use client';

import type { Task } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  compact?: boolean;
}

export function TaskCard({ task, onClick, compact }: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'DONE';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs transition-all hover:border-[#1F4D3A]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-xs font-bold leading-snug text-[#1C2421] group-hover:text-[#1F4D3A] transition-colors">
          {task.title}
        </h4>
      </div>

      {!compact && task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#525B56]">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />

        {dueDate && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-[#C96B4A] font-semibold' : 'text-[#525B56]'}`}>
            <Calendar className="h-3 w-3" />
            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        
        {task.assignee && (
          <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#1F4D3A] text-[10px] font-bold text-white shadow-xs" title={task.assignee.name || task.assignee.email}>
            {task.assignee.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
    </div>
  );
}

