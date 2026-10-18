'use client';

import type { KanbanBoard as KanbanBoardType, Task } from '@/types';
import { KanbanColumn } from '@/components/kanban-column';

interface KanbanBoardProps {
  board: KanbanBoardType;
  onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ board, onTaskClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <KanbanColumn
        title="Todo"
        tasks={board.Todo || []}
        color="bg-[#C89B3C]"
        onTaskClick={onTaskClick}
      />
      <KanbanColumn
        title="In Progress"
        tasks={board.InProgress || []}
        color="bg-[#C96B4A]"
        onTaskClick={onTaskClick}
      />
      <KanbanColumn
        title="Done"
        tasks={board.Done || []}
        color="bg-[#1F4D3A]"
        onTaskClick={onTaskClick}
      />
    </div>
  );
}

