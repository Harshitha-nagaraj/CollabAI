'use client';

import type { Task } from '@/types';
import { TaskCard } from '@/components/task-card';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  color: string;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ title, tasks, color, onTaskClick }: KanbanColumnProps) {
  return (
    <div className="flex min-w-[300px] max-w-[340px] flex-1 flex-col rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/70 p-3.5 shadow-xs">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <h3 className="text-xs font-bold text-[#1C2421] uppercase tracking-wider">{title}</h3>
        </div>
        <span className="flex h-5 min-w-[22px] px-2 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#1C2421] border border-[#E2DCD2]">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1 min-h-[140px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#E2DCD2] bg-white/60 p-6 text-center text-xs font-medium text-[#525B56]">
            No tasks in {title}
          </div>
        )}
      </div>
    </div>
  );
}

