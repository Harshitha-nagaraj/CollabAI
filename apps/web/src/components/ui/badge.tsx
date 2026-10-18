'use client';

import type { TaskStatus, Priority, ProjectStatus } from '@/types';

export const projectStatusStyles: Record<ProjectStatus, string> = {
  PLANNING: 'bg-[#F0EEE6] text-[#525B56] border border-[#E2DCD2]',
  IN_PROGRESS: 'bg-[#1F4D3A]/10 text-[#1F4D3A] border border-[#1F4D3A]/25',
  COMPLETED: 'bg-[#1F4D3A] text-white border border-[#1F4D3A]',
  ON_HOLD: 'bg-[#C89B3C]/15 text-[#9E731D] border border-[#C89B3C]/30',
  CANCELLED: 'bg-[#C93B3B]/10 text-[#C93B3B] border border-[#C93B3B]/20',
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
};

export function ProjectStatusBadge({
  status,
  className = '',
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const style = projectStatusStyles[status] || projectStatusStyles.PLANNING;
  const label = projectStatusLabels[status] || status;
  return <Badge colorClass={style} className={className}>{label}</Badge>;
}

export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'neutral' | 'primary' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  colorClass?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#1F4D3A]/10 text-[#1F4D3A] border border-[#1F4D3A]/25',
  warning: 'bg-[#C89B3C]/15 text-[#9E731D] border border-[#C89B3C]/30',
  destructive: 'bg-[#C93B3B]/10 text-[#C93B3B] border border-[#C93B3B]/20',
  neutral: 'bg-[#F0EEE6] text-[#525B56] border border-[#E2DCD2]',
  primary: 'bg-[#1F4D3A] text-white shadow-xs',
  outline: 'bg-transparent text-[#1C2421] border border-[#E2DCD2]',
};

export function Badge({
  children,
  variant = 'neutral',
  colorClass,
  className = '',
}: BadgeProps) {
  const style = colorClass || variantStyles[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight ${style} ${className}`}>
      {children}
    </span>
  );
}

const statusStyles: Record<TaskStatus, string> = {
  BACKLOG: 'bg-[#F0EEE6] text-[#525B56] border border-[#E2DCD2]',
  TODO: 'bg-[#F0EEE6] text-[#1C2421] border border-[#E2DCD2]',
  IN_PROGRESS: 'bg-[#C89B3C]/15 text-[#9E731D] border border-[#C89B3C]/30',
  IN_REVIEW: 'bg-[#1F4D3A]/10 text-[#1F4D3A] border border-[#1F4D3A]/25',
  DONE: 'bg-[#1F4D3A] text-white',
  CANCELLED: 'bg-[#C93B3B]/10 text-[#C93B3B] border border-[#C93B3B]/20',
};

const statusLabels: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const style = statusStyles[status];
  return <Badge colorClass={style}>{statusLabels[status]}</Badge>;
}

const priorityStyles: Record<Priority, string> = {
  LOW: 'bg-[#F0EEE6] text-[#525B56] border border-[#E2DCD2]',
  MEDIUM: 'bg-[#C89B3C]/15 text-[#9E731D] border border-[#C89B3C]/30',
  HIGH: 'bg-[#C96B4A]/15 text-[#C96B4A] border border-[#C96B4A]/30',
  URGENT: 'bg-[#C96B4A] text-white shadow-xs',
};

const priorityLabels: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const style = priorityStyles[priority];
  return <Badge colorClass={style}>{priorityLabels[priority]}</Badge>;
}
