'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useTasks, type TaskFilters as TaskFiltersType } from '@/lib/queries/tasks';
import { useWorkspaceDetails, useWorkspaces } from '@/lib/queries/workspaces';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/task-card';
import { TaskFilters } from '@/components/task-filters';
import { TaskCardSkeleton } from '@/components/ui/skeleton';
import { CreateTaskModal } from '@/components/create-task-modal';
import { EditTaskModal } from '@/components/edit-task-modal';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { TaskDetailDrawer } from '@/components/task-detail-drawer';
import { AIRiskPredictorCard } from '@/components/ai-risk-predictor-card';
import { AIWorkloadBalancer } from '@/components/ai-workload-balancer';
import { AIDailyStandupWidget } from '@/components/ai-daily-standup-widget';
import type { Task, TaskStatus, Priority } from '@/types';

export default function DashboardPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { data: wsData } = useWorkspaces();
  const workspaces = wsData?.workspaces || [];

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Build query filters
  const filters: TaskFiltersType = {
    ...(selectedWorkspaceId && { workspaceId: selectedWorkspaceId }),
    ...(statusFilter && { status: statusFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
  };

  const { data, isLoading } = useTasks(filters);
  const { data: wsDetails } = useWorkspaceDetails(selectedWorkspaceId);

  const tasks = data?.tasks || [];
  const members = wsDetails?.members || [];
  const projects = [] as { id: string; name: string }[];

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const inProgressCount = useMemo(() => tasks.filter(t => t.status === 'IN_PROGRESS').length, [tasks]);
  const urgentCount = useMemo(() => tasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length, [tasks]);

  return (
    <div className="mx-auto max-w-7xl py-2 space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F6863]">Total Active Tasks</span>
            <span className="rounded-full bg-[#205743]/10 p-1.5 text-[#205743]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#252D2A]">{tasks.length}</span>
            <span className="text-xs font-medium text-[#205743]">Tracked</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F6863]">In Progress</span>
            <span className="rounded-full bg-[#D4A545]/15 p-1.5 text-[#D4A545]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#252D2A]">{inProgressCount}</span>
            <span className="text-xs font-medium text-[#9E731D]">Active Execution</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F6863]">High & Urgent Priority</span>
            <span className="rounded-full bg-[#C56D4B]/10 p-1.5 text-[#C56D4B]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#252D2A]">{urgentCount}</span>
            <span className="text-xs font-medium text-[#C56D4B]">Attention Needed</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F6863]">Active Workspaces</span>
            <span className="rounded-full bg-[#205743]/10 p-1.5 text-[#205743]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#252D2A]">{workspaces.length}</span>
            <span className="text-xs font-medium text-[#205743]">Enterprise Scope</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2-Column Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Feature 1: AI Risk Predictor */}
          <section>
            <AIRiskPredictorCard />
          </section>

          {/* Feature 2: AI Workload Balancer */}
          <section>
            <AIWorkloadBalancer />
          </section>

          {/* Feature 3: AI Daily Stand-up Generator */}
          <section>
            <AIDailyStandupWidget />
          </section>

          {/* Recent Tasks Grid */}
          <section className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4DED4]/80 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#252D2A]">Task Activity Stream</h2>
                <p className="text-xs text-[#5F6863]">Filtered task items across projects</p>
              </div>
              <TaskFilters
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                priorityFilter={priorityFilter}
                onPriorityChange={setPriorityFilter}
              />
            </div>
            
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <TaskCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E4DED4] bg-[#F7F5F0]/50 p-10 text-center">
                 <p className="text-xs font-medium text-[#5F6863]">No matching tasks found.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredTasks.slice(0, 6).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setDetailTask(task)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          
          {/* Active Workspaces Card */}
          <section className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5F6863]">Workspaces</h2>
              <span className="text-xs font-bold text-[#205743]">{workspaces.length} Total</span>
            </div>
            <div className="space-y-2.5">
              {workspaces.map((ws) => (
                <div key={ws.id} className="rounded-lg border border-[#E4DED4] bg-[#F7F0F0]/30 p-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#252D2A]">{ws.name}</h4>
                    <p className="text-[11px] text-[#5F6863] capitalize">{ws.visibility.toLowerCase()} workspace</p>
                  </div>
                  <span className="rounded bg-[#205743]/10 px-2 py-0.5 text-[10px] font-bold text-[#205743]">Active</span>
                </div>
              ))}
              {workspaces.length === 0 && (
                <p className="text-xs text-[#5F6863] text-center py-4">No active workspaces.</p>
              )}
            </div>
          </section>

          {/* Upcoming Sync Meetings */}
          <section className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5F6863]">Upcoming Syncs</h2>
              <span className="text-xs font-bold text-[#D4A545]">Scheduled</span>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#252D2A]">Architecture & API Review</p>
                  <span className="h-2 w-2 rounded-full bg-[#205743]" />
                </div>
                <p className="mt-1 text-[11px] text-[#5F6863]">Today, 2:00 PM - 3:00 PM</p>
              </div>
              <div className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#252D2A]">Engineering Sprint Standup</p>
                  <span className="h-2 w-2 rounded-full bg-[#D4A545]" />
                </div>
                <p className="mt-1 text-[11px] text-[#5F6863]">Tomorrow, 10:00 AM - 10:30 AM</p>
              </div>
            </div>
          </section>

          {/* Activity Feed */}
          <section className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5F6863] border-b border-[#E4DED4] pb-3 mb-4">Team Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-[#205743] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#252D2A]">
                    <span className="font-bold">Sarah</span> marked <span className="font-semibold text-[#205743]">Homepage Redesign</span> Done
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#5F6863]">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-[#D4A545] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#252D2A]">
                    <span className="font-bold">System</span> updated priority of <span className="font-semibold text-[#C56D4B]">API Auth</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#5F6863]">5 hours ago</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        members={members}
      />

      <EditTaskModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        projects={projects}
        members={members}
      />

      <DeleteTaskDialog
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        taskId={deleteTask?.id || null}
        taskTitle={deleteTask?.title || ''}
      />

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
    </div>
  );
}
