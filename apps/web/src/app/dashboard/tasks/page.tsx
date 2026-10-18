'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useTasks, useUpdateTask } from '@/lib/queries/tasks';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { CreateTaskModal } from '@/components/create-task-modal';
import { EditTaskModal } from '@/components/edit-task-modal';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { TaskDetailDrawer } from '@/components/task-detail-drawer';
import type { Task, TaskStatus, Priority } from '@/types';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  User,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  ArrowUpDown,
  Folder,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export default function TasksPage() {
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const { toast } = useToast();

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'priority'>('createdAt');

  // Modals & Drawers State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  // Queries
  const { data: wsDetails } = useWorkspaceDetails(selectedWorkspaceId);
  const { data: tasksData, isLoading, isError, refetch } = useTasks({
    workspaceId: selectedWorkspaceId || undefined,
    projectId: selectedProjectId || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const rawTasks = tasksData?.tasks || [];
  const members = wsDetails?.members || [];
  // Derive projects list if present on workspace tasks or fallback to demo projects list
  const projects = useMemo(() => {
    const projMap = new Map<string, { id: string; name: string }>();
    rawTasks.forEach((t) => {
      if (t.project) {
        projMap.set(t.project.id, { id: t.project.id, name: t.project.name });
      }
    });
    return Array.from(projMap.values());
  }, [rawTasks]);

  // Filter & Sort Tasks
  const filteredTasks = useMemo(() => {
    let result = rawTasks.filter((t) => {
      const matchesSearch =
        !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
        (t.assignee?.name && t.assignee.name.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = !statusFilter || t.status === statusFilter;
      const matchesPriority = !priorityFilter || t.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        const priorityOrder: Record<Priority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [rawTasks, search, statusFilter, priorityFilter, sortBy]);

  // Summary Metrics
  const totalCount = rawTasks.length;
  const inProgressCount = rawTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
  const urgentCount = rawTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length;
  const completedCount = rawTasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#1F4D3A] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Task Management
            </span>
            <span className="text-xs text-[#525B56]">Task Assignments, Deadlines & Workload Tracking</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Tasks & Workspace Deliverables
          </h1>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-1.5 bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32] self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#1F4D3A]">
            <span className="text-xs font-semibold text-[#525B56]">Total Tasks</span>
            <CheckSquare className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#1C2421]">{totalCount}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#C89B3C]">
            <span className="text-xs font-semibold text-[#525B56]">Active / In Progress</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#9E731D]">{inProgressCount}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#C96B4A]">
            <span className="text-xs font-semibold text-[#525B56]">High & Urgent Priority</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#C96B4A]">{urgentCount}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#1F4D3A]">
            <span className="text-xs font-semibold text-[#525B56]">Completed</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#1F4D3A]">{completedCount}</p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#525B56]" />
          <input
            type="text"
            placeholder="Search task title, description, or assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E2DCD2] bg-white py-2 pl-9 pr-4 text-xs font-medium text-[#1C2421] placeholder:text-[#525B56]/70 focus:border-[#1F4D3A] focus:outline-none"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
            className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
            className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="dueDate">Sort: Due Date</option>
            <option value="priority">Sort: Priority Level</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-0.5">
            <button
              onClick={() => setViewMode('table')}
              title="Table List View"
              className={`rounded-md p-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#1F4D3A] shadow-xs' : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              className={`rounded-md p-1.5 transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#1F4D3A] shadow-xs' : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-[#E2DCD2] bg-white">
          <div className="flex items-center gap-3 text-xs font-semibold text-[#525B56]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1F4D3A] border-t-transparent" />
            Loading workspace tasks...
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-[#C93B3B]/20 bg-[#FFF5F5] p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-[#C93B3B]" />
          <h3 className="mt-2 text-sm font-bold text-[#1C2421]">Unable to load tasks</h3>
          <p className="mt-1 text-xs text-[#525B56]">Failed to fetch tasks for the selected workspace or project.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-[#E2DCD2]">
            Retry Loading
          </Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-12 text-center space-y-3">
          <CheckSquare className="mx-auto h-10 w-10 text-[#525B56]/50" />
          <h3 className="text-sm font-bold text-[#1C2421]">No tasks found</h3>
          <p className="text-xs text-[#525B56] max-w-sm mx-auto">
            {search || statusFilter || priorityFilter
              ? 'No tasks match your current search and filter criteria. Try adjusting or clearing filters.'
              : 'There are no active tasks in this workspace. Create your first task to get started.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 bg-[#1F4D3A] text-xs text-white hover:bg-[#163E32]"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Task
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* Compact Table List View */
        <div className="overflow-x-auto rounded-xl border border-[#E2DCD2] bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2DCD2] bg-[#F7F5F0] text-[#525B56]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider">Task Title</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Status</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Priority</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Assignee</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Due Date</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCD2]">
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'DONE' &&
                  task.status !== 'CANCELLED';

                return (
                  <tr
                    key={task.id}
                    onClick={() => setDetailTask(task)}
                    className="hover:bg-[#F7F5F0]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1C2421] group-hover:text-[#1F4D3A] transition-colors">
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="line-clamp-1 text-[11px] text-[#525B56] mt-0.5">{task.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[10px] font-bold text-[#1F4D3A]">
                            {(task.assignee.name?.[0] || task.assignee.email?.[0] || '?').toUpperCase()}
                          </div>
                          <span className="text-[#1C2421] text-xs font-medium truncate max-w-[120px]">
                            {task.assignee.name || task.assignee.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#525B56] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {task.dueDate ? (
                        <span
                          className={`text-xs font-medium flex items-center gap-1 ${
                            isOverdue ? 'text-[#C96B4A] font-bold' : 'text-[#525B56]'
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#525B56]">No date</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailTask(task)}
                          title="View Task Details"
                          className="rounded-md p-1.5 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditTask(task)}
                          title="Edit Task"
                          className="rounded-md p-1.5 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTask(task)}
                          title="Delete Task"
                          className="rounded-md p-1.5 text-[#525B56] hover:bg-[#FFF2F2] hover:text-[#C93B3B] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Compact Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              task.status !== 'DONE' &&
              task.status !== 'CANCELLED';

            return (
              <div
                key={task.id}
                onClick={() => setDetailTask(task)}
                className="group rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs hover:border-[#1F4D3A]/50 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <h3 className="text-sm font-bold text-[#1C2421] group-hover:text-[#1F4D3A] transition-colors line-clamp-2">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-[#525B56] line-clamp-2 leading-relaxed">{task.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E2DCD2]/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[10px] font-bold text-[#1F4D3A]">
                          {(task.assignee.name?.[0] || task.assignee.email?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="text-[#1C2421] text-xs font-medium truncate max-w-[90px]">
                          {task.assignee.name || task.assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#525B56] italic">Unassigned</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {task.dueDate && (
                      <span className={`text-[11px] font-medium flex items-center gap-1 ${isOverdue ? 'text-[#C96B4A] font-bold' : 'text-[#525B56]'}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <button
                      onClick={() => setEditTask(task)}
                      title="Edit Task"
                      className="rounded p-1 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTask(task)}
                      title="Delete Task"
                      className="rounded p-1 text-[#525B56] hover:bg-[#FFF2F2] hover:text-[#C93B3B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      <CreateTaskModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projects={projects}
        members={members}
      />

      {/* Task Details Side Drawer */}
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

      {/* Task Edit Modal */}
      <EditTaskModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        projects={projects}
        members={members.map((m: any) => ({
          userId: m.user?.id || m.userId || m.id,
          name: m.name || m.user?.name || null,
          email: m.email || m.user?.email || '',
        }))}
      />

      {/* Task Delete Confirmation Dialog */}
      <DeleteTaskDialog
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        taskId={deleteTask?.id || null}
        taskTitle={deleteTask?.title || ''}
      />
    </div>
  );
}

