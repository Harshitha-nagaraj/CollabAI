'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useKanbanBoard } from '@/lib/queries/workspaces';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { KanbanBoard } from '@/components/kanban-board';
import { KanbanColumnSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { EditTaskModal } from '@/components/edit-task-modal';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { TaskDetailDrawer } from '@/components/task-detail-drawer';
import { AIWorkloadBalancer } from '@/components/ai-workload-balancer';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import type { Task } from '@/types';
import { LayoutGrid, List, Search, User, FolderKanban } from 'lucide-react';

export default function KanbanPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { data, isLoading, isError } = useKanbanBoard(selectedWorkspaceId);
  const { data: wsDetails } = useWorkspaceDetails(selectedWorkspaceId);

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const members = wsDetails?.members || [];
  const board = data?.board;

  const allTasks = [
    ...(board?.Todo || []),
    ...(board?.InProgress || []),
    ...(board?.Done || []),
  ].filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1F4D3A] px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide">
              <FolderKanban className="h-3 w-3" />
              Kanban Board
            </span>
            <span className="text-xs text-[#525B56]">Visual Task Management & Workload Balancing</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Kanban Task Workflow
          </h1>
        </div>
      </div>

      {/* Top Controls Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div className="relative flex items-center flex-1 max-w-md">
          <Search className="absolute left-3 h-4 w-4 text-[#525B56]" />
          <input
            type="text"
            placeholder="Search tasks by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E2DCD2] bg-white pl-9 pr-3 py-1.5 text-xs font-medium text-[#1C2421] placeholder-[#525B56]/60 focus:border-[#1F4D3A] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#E2DCD2] bg-[#F0EEE6] p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === 'board' ? 'bg-[#1F4D3A] text-white shadow-xs' : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === 'list' ? 'bg-[#1F4D3A] text-white shadow-xs' : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </button>
          </div>
        </div>
      </div>

      {selectedWorkspaceId && (
        <section>
          <AIWorkloadBalancer />
        </section>
      )}

      {!selectedWorkspaceId ? (
        <EmptyState
          icon={
            <FolderKanban className="h-10 w-10 text-[#1F4D3A]" />
          }
          title="Select a workspace"
          description="Choose a workspace from the sidebar to view its Kanban board."
        />
      ) : isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <KanbanColumnSkeleton />
          <KanbanColumnSkeleton />
          <KanbanColumnSkeleton />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-[#C96B4A]/30 bg-[#FDF2EE] p-6 text-center">
          <p className="text-xs font-semibold text-[#C96B4A]">Failed to load task board.</p>
        </div>
      ) : viewMode === 'board' && board ? (
        <KanbanBoard
          board={board}
          onTaskClick={(task) => setDetailTask(task)}
        />
      ) : (
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs space-y-2">
          {allTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setDetailTask(task)}
              className="flex items-center justify-between rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3 hover:border-[#1F4D3A]/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-[#1C2421]">{task.title}</span>
                <StatusBadge status={task.status} />
              </div>
              <div className="flex items-center gap-3">
                <PriorityBadge priority={task.priority} />
                {task.assignee && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#E8F3EE] text-[#1F4D3A] border border-[#C2DFD3] px-2 py-0.5 text-[10px] font-bold">
                    <User className="h-3 w-3" />
                    {task.assignee.name || task.assignee.email}
                  </span>
                )}
              </div>
            </div>
          ))}
          {allTasks.length === 0 && (
            <p className="text-xs text-[#525B56] text-center py-6">No tasks match your search filter.</p>
          )}
        </div>
      )}

      {/* Modals */}
      <TaskDetailDrawer
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        task={detailTask}
        onEdit={() => {
          setEditTask(detailTask);
          setDetailTask(null);
        }}
        onDelete={() => {
          setDeleteTask(detailTask);
          setDetailTask(null);
        }}
      />

      <EditTaskModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        members={members}
      />

      <DeleteTaskDialog
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        taskId={deleteTask?.id || null}
        taskTitle={deleteTask?.title || ''}
      />
    </div>
  );
}

