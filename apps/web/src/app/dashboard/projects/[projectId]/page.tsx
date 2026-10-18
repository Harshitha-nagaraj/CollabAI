'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useProjectDetails, useUpdateProject } from '@/lib/queries/projects';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useUpdateAnyTask,
  useDeleteTask,
} from '@/lib/queries/tasks';
import { useProjectTimeline } from '@/lib/queries/timeline';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { Button } from '@/components/ui/button';
import {
  Badge,
  StatusBadge,
  PriorityBadge,
  ProjectStatusBadge,
  projectStatusLabels,
  projectStatusStyles,
} from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { TaskDetailDrawer } from '@/components/task-detail-drawer';
import { EditTaskModal } from '@/components/edit-task-modal';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { TaskForm, type TaskFormValues } from '@/components/task-form';
import { ProjectActivityFeed } from '@/components/project-activity-feed';
import { type WorkspaceMemberOption } from '@/components/member-selector';
import type { Task, TaskStatus, Priority, ProjectStatus } from '@/types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  Folder,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  PauseCircle,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Briefcase,
  Shield,
  X,
  XCircle,
  Activity,
  Milestone,
  Target,
  Sparkles,
} from 'lucide-react';

const ALL_PROJECT_STATUSES: ProjectStatus[] = [
  'PLANNING',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
];

type ActiveTab = 'overview' | 'tasks' | 'team' | 'timeline' | 'activity';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.projectId as string) || '';
  const { toast } = useToast();

  const { selectedWorkspaceId, setSelectedWorkspaceId, setSelectedProjectId } = useAppStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Quick Status Edit State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Project Modal
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('PLANNING');
  const [editError, setEditError] = useState<string | null>(null);

  // Task Filter & Search States
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | ''>('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<Priority | ''>('');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('');
  const [taskSortBy, setTaskSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');
  const [taskViewMode, setTaskViewMode] = useState<'table' | 'grid'>('table');

  // Task Modals & Drawer States
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskDefaultAssignee, setCreateTaskDefaultAssignee] = useState<string | null>(null);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  // Project Details Query
  const {
    data: projectDetailsData,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject,
  } = useProjectDetails(projectId);

  const project = projectDetailsData?.project;
  const workspaceId = project?.workspaceId || selectedWorkspaceId;

  // Sync selectedWorkspaceId and selectedProjectId in store
  useEffect(() => {
    if (project?.workspaceId && project.workspaceId !== selectedWorkspaceId) {
      setSelectedWorkspaceId(project.workspaceId);
    }
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [project?.workspaceId, projectId, selectedWorkspaceId, setSelectedWorkspaceId, setSelectedProjectId]);

  // Tasks Query for this Project
  const {
    data: tasksData,
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useTasks({
    projectId: projectId || undefined,
  });

  // Timeline Query for this Project
  const {
    data: timelineData,
    isLoading: isTimelineLoading,
  } = useProjectTimeline(projectId || null, workspaceId || null);

  // Workspace details for member assignment
  const { data: wsDetails } = useWorkspaceDetails(workspaceId || null);

  // Mutations
  const updateProjectMutation = useUpdateProject();
  const createTaskMutation = useCreateTask();
  const updateAnyTaskMutation = useUpdateAnyTask();

  // Available Workspace Members for Task Assignment & Team Roster
  const availableMembers: WorkspaceMemberOption[] = useMemo(() => {
    if (!wsDetails?.members) return [];
    return wsDetails.members.map((m) => ({
      userId: m.userId,
      name: m.name || null,
      email: m.email || '',
      avatarUrl: m.avatarUrl || null,
      role: m.role || 'MEMBER',
    }));
  }, [wsDetails]);

  // Tasks List (fallback to project.tasks from project details query)
  const allTasks = useMemo(() => {
    return tasksData?.tasks || projectDetailsData?.tasks || [];
  }, [tasksData?.tasks, projectDetailsData?.tasks]);

  // Real Metric Calculations strictly derived from actual task records
  const taskMetrics = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.status === 'DONE').length;
    const pending = total - completed;
    const inProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const inReview = allTasks.filter((t) => t.status === 'IN_REVIEW').length;
    const todo = allTasks.filter((t) => t.status === 'TODO').length;
    const backlog = allTasks.filter((t) => t.status === 'BACKLOG').length;
    const cancelled = allTasks.filter((t) => t.status === 'CANCELLED').length;

    const now = new Date();
    const overdue = allTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'DONE' &&
        t.status !== 'CANCELLED'
    ).length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      inProgress,
      inReview,
      todo,
      backlog,
      cancelled,
      overdue,
      progress,
    };
  }, [allTasks]);

  // Real Team Workload & Member Metrics calculated from actual project task data
  const teamWorkload = useMemo(() => {
    const now = new Date();

    const memberStats = availableMembers.map((member) => {
      const memberTasks = allTasks.filter((t) => t.assigneeId === member.userId);
      const assignedCount = memberTasks.length;
      const completedCount = memberTasks.filter((t) => t.status === 'DONE').length;
      const inProgressCount = memberTasks.filter((t) => t.status === 'IN_PROGRESS').length;
      const inReviewCount = memberTasks.filter((t) => t.status === 'IN_REVIEW').length;
      const todoCount = memberTasks.filter((t) => t.status === 'TODO').length;
      const backlogCount = memberTasks.filter((t) => t.status === 'BACKLOG').length;
      const cancelledCount = memberTasks.filter((t) => t.status === 'CANCELLED').length;
      const activeCount = assignedCount - completedCount - cancelledCount;
      const overdueCount = memberTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== 'DONE' &&
          t.status !== 'CANCELLED'
      ).length;

      const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
      const isProjectCreator = project?.creatorId === member.userId;

      return {
        ...member,
        isProjectCreator,
        assignedCount,
        activeCount,
        completedCount,
        inProgressCount,
        inReviewCount,
        todoCount,
        backlogCount,
        cancelledCount,
        overdueCount,
        completionRate,
        tasks: memberTasks,
      };
    });

    const unassignedTasks = allTasks.filter((t) => !t.assigneeId);
    const unassignedCount = unassignedTasks.length;
    const unassignedActiveCount = unassignedTasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
    const unassignedOverdueCount = unassignedTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'DONE' &&
        t.status !== 'CANCELLED'
    ).length;

    // Distinct categorization: members actively contributing to project vs available in workspace
    const activeContributors = memberStats.filter(
      (m) => m.assignedCount > 0 || m.isProjectCreator
    );

    const otherWorkspaceMembers = memberStats.filter(
      (m) => m.assignedCount === 0 && !m.isProjectCreator
    );

    return {
      memberStats,
      activeContributors,
      otherWorkspaceMembers,
      unassignedCount,
      unassignedActiveCount,
      unassignedOverdueCount,
      unassignedTasks,
      totalWorkspaceMembers: availableMembers.length,
      totalAssignedTasks: allTasks.length - unassignedCount,
    };
  }, [availableMembers, allTasks, project?.creatorId]);

  // Filtered & Sorted Tasks List
  const filteredTasks = useMemo(() => {
    let list = [...allTasks];

    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (taskStatusFilter) {
      list = list.filter((t) => t.status === taskStatusFilter);
    }

    if (taskPriorityFilter) {
      list = list.filter((t) => t.priority === taskPriorityFilter);
    }

    if (taskAssigneeFilter === 'UNASSIGNED') {
      list = list.filter((t) => !t.assigneeId);
    } else if (taskAssigneeFilter) {
      list = list.filter((t) => t.assigneeId === taskAssigneeFilter);
    }

    list.sort((a, b) => {
      if (taskSortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (taskSortBy === 'priority') {
        const pOrder: Record<Priority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [allTasks, taskSearch, taskStatusFilter, taskPriorityFilter, taskAssigneeFilter, taskSortBy]);

  // Format Date Helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  // Quick Status Edit Handler
  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project || project.status === newStatus || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        status: newStatus,
      });
      toast(`Project status changed to ${projectStatusLabels[newStatus]}`, 'success');
      refetchProject();
    } catch (err: any) {
      toast(err?.message || 'Failed to update project status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditKey(project.key || '');
    setEditDesc(project.description || '');
    setEditStatus(project.status);
    setEditError(null);
    setIsEditProjectModalOpen(true);
  };

  // Submit Edit Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!editName.trim() || editName.trim().length < 2) {
      setEditError('Project name must be at least 2 characters.');
      return;
    }

    setEditError(null);
    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        name: editName.trim(),
        key: editKey.trim() || undefined,
        description: editDesc.trim() || undefined,
        status: editStatus,
      });
      toast('Project updated successfully', 'success');
      setIsEditProjectModalOpen(false);
      refetchProject();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update project');
      toast(err?.message || 'Failed to update project', 'error');
    }
  };

  // Create Task Submit Handler
  const handleCreateTaskSubmit = async (values: TaskFormValues) => {
    try {
      await createTaskMutation.mutateAsync({
        title: values.title.trim(),
        description: values.description?.trim() || null,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        projectId: projectId,
        assigneeId: values.assigneeId || null,
      });
      toast('Task created successfully', 'success');
      setIsCreateTaskModalOpen(false);
      setCreateTaskDefaultAssignee(null);
      refetchTasks();
      refetchProject();
    } catch (err: any) {
      toast(err?.message || 'Failed to create task', 'error');
    }
  };

  // Reassign or unassign a task directly from the task drawer
  const handleAssigneeChange = async (newAssigneeId: string | null) => {
    if (!detailTask || isUpdatingAssignee) return;
    setIsUpdatingAssignee(true);
    try {
      await updateAnyTaskMutation.mutateAsync({
        id: detailTask.id,
        assigneeId: newAssigneeId,
      });
      const updatedAssignee = availableMembers.find((m) => m.userId === newAssigneeId);
      setDetailTask((prev) =>
        prev
          ? {
              ...prev,
              assigneeId: newAssigneeId,
              assignee: updatedAssignee
                ? {
                    id: updatedAssignee.userId,
                    name: updatedAssignee.name,
                    email: updatedAssignee.email,
                    avatarUrl: updatedAssignee.avatarUrl || null,
                  }
                : null,
            }
          : null
      );
      toast(
        newAssigneeId
          ? `Task assigned to ${updatedAssignee?.name || updatedAssignee?.email || 'member'}`
          : 'Task unassigned',
        'success'
      );
      refetchTasks();
      refetchProject();
    } catch (err: any) {
      toast(err?.message || 'Failed to update task assignment', 'error');
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  // Loading State
  if (isProjectLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-2 text-xs text-[#525B56]">
          <Link href="/dashboard/projects" className="hover:text-[#1F4D3A] flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>Loading project...</span>
        </div>
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-[#E2DCD2] bg-white p-12 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-[#1F4D3A]" />
          <p className="mt-3 text-xs font-semibold text-[#525B56]">Loading project workspace details...</p>
        </div>
      </div>
    );
  }

  // Error State / Access Denied / Not Found
  if (isProjectError || !project) {
    const errorMsg = (projectError as any)?.message || 'Project could not be found or access is unauthorized.';
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-2 text-xs text-[#525B56]">
          <Link href="/dashboard/projects" className="hover:text-[#1F4D3A] flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
        </div>
        <div className="rounded-2xl border border-[#C93B3B]/25 bg-[#FFF5F5] p-10 text-center shadow-xs">
          <AlertCircle className="mx-auto h-10 w-10 text-[#C93B3B]" />
          <h2 className="mt-3 text-base font-bold text-[#1C2421]">Unable to Access Project</h2>
          <p className="mt-1.5 text-xs text-[#525B56] max-w-md mx-auto">{errorMsg}</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/projects')}
              className="border-[#E2DCD2]"
            >
              Back to Projects Portfolio
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => refetchProject()}
              className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const targetDateFormatted = formatDate(project.targetDueDate);
  const createdDateFormatted = formatDate(project.createdAt);
  const updatedDateFormatted = formatDate(project.updatedAt);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#525B56]">
        <Link href="/dashboard" className="hover:text-[#1F4D3A] transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <Link href="/dashboard/projects" className="hover:text-[#1F4D3A] transition-colors flex items-center gap-1">
          <Folder className="h-3.5 w-3.5" />
          Projects
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="font-semibold text-[#1C2421] truncate max-w-[240px]">
          {project.name}
        </span>
      </nav>

      {/* Project Header Banner */}
      <div className="rounded-2xl border border-[#E2DCD2] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Key Prefix Tag */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F4D3A]/10 text-sm font-bold text-[#1F4D3A] border border-[#1F4D3A]/25">
              {project.key || project.name.substring(0, 3).toUpperCase()}
            </span>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C2421] truncate">
                  {project.name}
                </h1>

                {/* Editable Status Dropdown */}
                <div className="relative inline-flex items-center">
                  {isUpdatingStatus ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E2DCD2] bg-[#F0EEE6] text-xs font-medium text-[#525B56]">
                      <Loader2 className="h-3 w-3 animate-spin text-[#1F4D3A]" />
                      <span>Saving status...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={project.status}
                        onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                        disabled={isUpdatingStatus}
                        className={`appearance-none rounded-md pl-2.5 pr-7 py-1 text-xs font-semibold cursor-pointer transition-all border focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] ${
                          projectStatusStyles[project.status] || projectStatusStyles.PLANNING
                        }`}
                        title="Click to change project status"
                      >
                        {ALL_PROJECT_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-[#1C2421] font-normal">
                            {projectStatusLabels[st]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-70" />
                    </div>
                  )}
                </div>

                {project.isOverdue && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#C93B3B]/10 px-2 py-0.5 text-xs font-bold text-[#C93B3B] border border-[#C93B3B]/25">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </span>
                )}
              </div>

              <p className="text-xs text-[#525B56] leading-relaxed max-w-3xl">
                {project.description || 'No detailed description provided for this project.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditModal}
              className="gap-1.5 border-[#E2DCD2] text-xs"
            >
              <Edit2 className="h-3.5 w-3.5 text-[#525B56]" />
              <span>Edit Project</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32] text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </Button>
          </div>
        </div>

        {/* Real Overview Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 border-t border-[#E2DCD2]/70 pt-4">
          {/* Progress */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#525B56]">
              <span>Completion</span>
              <span className="text-[#1F4D3A] font-bold">{taskMetrics.progress}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
              <div
                className="h-full bg-[#1F4D3A] transition-all duration-300"
                style={{ width: `${taskMetrics.progress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-[#525B56]">
              {taskMetrics.completed} of {taskMetrics.total} tasks
            </div>
          </div>

          {/* Total Tasks */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-3">
            <div className="text-[11px] font-semibold text-[#525B56] uppercase tracking-wider">Total Tasks</div>
            <div className="mt-1 text-lg font-bold text-[#1C2421]">{taskMetrics.total}</div>
            <div className="text-[10px] text-[#525B56]">
              {taskMetrics.pending} active / pending
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-3">
            <div className="text-[11px] font-semibold text-[#1F4D3A] uppercase tracking-wider">Completed</div>
            <div className="mt-1 text-lg font-bold text-[#1F4D3A]">{taskMetrics.completed}</div>
            <div className="text-[10px] text-[#525B56]">Successfully resolved</div>
          </div>

          {/* Overdue Tasks */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-3">
            <div className="text-[11px] font-semibold text-[#C93B3B] uppercase tracking-wider">Overdue Tasks</div>
            <div className="mt-1 text-lg font-bold text-[#C93B3B]">{taskMetrics.overdue}</div>
            <div className="text-[10px] text-[#525B56]">Past deadline</div>
          </div>

          {/* Target Deadline */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-3">
            <div className="text-[11px] font-semibold text-[#525B56] uppercase tracking-wider">Target Deadline</div>
            <div className="mt-1 text-xs font-bold text-[#1C2421] truncate">
              {targetDateFormatted || 'Not set'}
            </div>
            <div className="text-[10px] text-[#525B56]">
              {project.isOverdue ? 'Overdue target' : 'Scheduled delivery'}
            </div>
          </div>

          {/* Project Owner / Lead */}
          <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-3">
            <div className="text-[11px] font-semibold text-[#525B56] uppercase tracking-wider">Project Owner</div>
            <div className="mt-1 text-xs font-bold text-[#1C2421] truncate">
              {project.creator?.name || project.creator?.email || 'Workspace Member'}
            </div>
            <div className="text-[10px] text-[#525B56]">Lead creator</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-[#E2DCD2] flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'overview'
                ? 'border-[#1F4D3A] text-[#1F4D3A]'
                : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'tasks'
                ? 'border-[#1F4D3A] text-[#1F4D3A]'
                : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Tasks</span>
            <span className="rounded-full bg-[#1F4D3A]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#1F4D3A]">
              {taskMetrics.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'team'
                ? 'border-[#1F4D3A] text-[#1F4D3A]'
                : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Team & Workload</span>
            <span className="rounded-full bg-[#1F4D3A]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#1F4D3A]">
              {teamWorkload.activeContributors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'timeline'
                ? 'border-[#1F4D3A] text-[#1F4D3A]'
                : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'activity'
                ? 'border-[#1F4D3A] text-[#1F4D3A]'
                : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Activity</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column: Scope, Status Distribution & Recent Tasks */}
            <div className="lg:col-span-2 space-y-5">
              {/* Task Status Distribution Card */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2DCD2]/70 pb-3">
                  <h3 className="text-sm font-bold text-[#1C2421]">Task Status Distribution</h3>
                  <span className="text-xs text-[#525B56]">{taskMetrics.total} total recorded tasks</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/60 space-y-1">
                    <div className="text-[11px] font-semibold text-[#525B56]">Backlog</div>
                    <div className="text-base font-bold text-[#1C2421]">{taskMetrics.backlog}</div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/60 space-y-1">
                    <div className="text-[11px] font-semibold text-[#525B56]">Todo</div>
                    <div className="text-base font-bold text-[#1C2421]">{taskMetrics.todo}</div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#C89B3C]/10 space-y-1">
                    <div className="text-[11px] font-semibold text-[#9E731D]">In Progress</div>
                    <div className="text-base font-bold text-[#9E731D]">{taskMetrics.inProgress}</div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#1F4D3A]/10 space-y-1">
                    <div className="text-[11px] font-semibold text-[#1F4D3A]">In Review</div>
                    <div className="text-base font-bold text-[#1F4D3A]">{taskMetrics.inReview}</div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#1F4D3A]/15 space-y-1">
                    <div className="text-[11px] font-semibold text-[#1F4D3A]">Done</div>
                    <div className="text-base font-bold text-[#1F4D3A]">{taskMetrics.completed}</div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#C93B3B]/10 space-y-1">
                    <div className="text-[11px] font-semibold text-[#C93B3B]">Cancelled</div>
                    <div className="text-base font-bold text-[#C93B3B]">{taskMetrics.cancelled}</div>
                  </div>
                </div>
              </div>

              {/* Connected Delivery Units (Sprints & Releases) */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2DCD2]/70 pb-3">
                  <h3 className="text-sm font-bold text-[#1C2421]">Delivery Cycles & Releases</h3>
                  <span className="text-xs text-[#525B56]">Real-time milestone tracking</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sprints */}
                  <div className="rounded-lg border border-[#E2DCD2] p-3.5 bg-[#F7F5F0]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1C2421]">
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-[#1F4D3A]" />
                        Active Sprints
                      </span>
                      <span className="text-[#525B56]">
                        {projectDetailsData?.sprints?.length || 0}
                      </span>
                    </div>
                    {projectDetailsData?.sprints && projectDetailsData.sprints.length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {projectDetailsData.sprints.slice(0, 3).map((s: any) => (
                          <li key={s.id} className="flex justify-between py-1 border-b border-[#E2DCD2]/50 text-[#1C2421]">
                            <span className="truncate">{s.name}</span>
                            <span className="text-[10px] text-[#525B56]">{s.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-[#525B56] italic">No active sprints assigned to this project.</p>
                    )}
                  </div>

                  {/* Releases */}
                  <div className="rounded-lg border border-[#E2DCD2] p-3.5 bg-[#F7F5F0]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1C2421]">
                      <span className="flex items-center gap-1.5">
                        <Milestone className="h-3.5 w-3.5 text-[#C96B4A]" />
                        Target Releases
                      </span>
                      <span className="text-[#525B56]">
                        {projectDetailsData?.releases?.length || 0}
                      </span>
                    </div>
                    {projectDetailsData?.releases && projectDetailsData.releases.length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {projectDetailsData.releases.slice(0, 3).map((r: any) => (
                          <li key={r.id} className="flex justify-between py-1 border-b border-[#E2DCD2]/50 text-[#1C2421]">
                            <span className="truncate">{r.version || r.name}</span>
                            <span className="text-[10px] text-[#525B56]">{r.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-[#525B56] italic">No scheduled releases linked to this project.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Key Attributes & Fast Links */}
            <div className="space-y-5">
              {/* Project Attributes Card */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-3.5">
                <h3 className="text-sm font-bold text-[#1C2421] border-b border-[#E2DCD2]/70 pb-3">
                  Project Metadata
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#E2DCD2]/40">
                    <span className="text-[#525B56]">Workspace</span>
                    <span className="font-semibold text-[#1C2421]">{project.workspaceName || 'Active Workspace'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#E2DCD2]/40">
                    <span className="text-[#525B56]">Key Prefix</span>
                    <span className="font-semibold text-[#1F4D3A]">{project.key || 'None'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#E2DCD2]/40">
                    <span className="text-[#525B56]">Lead Owner</span>
                    <span className="font-semibold text-[#1C2421]">
                      {project.creator?.name || project.creator?.email || 'Workspace Member'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#E2DCD2]/40">
                    <span className="text-[#525B56]">Target Delivery</span>
                    <span className="font-semibold text-[#1C2421]">{targetDateFormatted || 'Unset'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#E2DCD2]/40">
                    <span className="text-[#525B56]">Created At</span>
                    <span className="font-semibold text-[#1C2421]">{createdDateFormatted}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#525B56]">Last Updated</span>
                    <span className="font-semibold text-[#1C2421]">{updatedDateFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Action Quick Links */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#1C2421]">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => setIsCreateTaskModalOpen(true)}
                    variant="primary"
                    size="sm"
                    className="w-full justify-start gap-2 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Task in this Project</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab('tasks')}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 border-[#E2DCD2]"
                  >
                    <CheckSquare className="h-4 w-4 text-[#525B56]" />
                    <span>View All {taskMetrics.total} Tasks</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab('team')}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 border-[#E2DCD2]"
                  >
                    <Users className="h-4 w-4 text-[#525B56]" />
                    <span>Team Workload & Assignments ({teamWorkload.activeContributors.length})</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab('timeline')}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 border-[#E2DCD2]"
                  >
                    <Clock className="h-4 w-4 text-[#525B56]" />
                    <span>Open Critical Path Timeline</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Tasks Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E2DCD2] bg-white p-3 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
              {/* Search */}
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#525B56]/70" />
                <input
                  type="text"
                  placeholder="Filter tasks by title or details..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DCD2] bg-white pl-8.5 pr-8 py-1.5 text-xs text-[#1C2421] placeholder:text-[#525B56]/70 focus:border-[#1F4D3A] focus:outline-none"
                />
                {taskSearch && (
                  <button
                    onClick={() => setTaskSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#525B56] hover:text-[#1C2421]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                className="rounded-lg border border-[#E2DCD2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses ({taskMetrics.total})</option>
                <option value="TODO">Todo ({taskMetrics.todo})</option>
                <option value="IN_PROGRESS">In Progress ({taskMetrics.inProgress})</option>
                <option value="IN_REVIEW">In Review ({taskMetrics.inReview})</option>
                <option value="DONE">Done ({taskMetrics.completed})</option>
                <option value="BACKLOG">Backlog ({taskMetrics.backlog})</option>
                <option value="CANCELLED">Cancelled ({taskMetrics.cancelled})</option>
              </select>

              {/* Priority Filter */}
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                className="rounded-lg border border-[#E2DCD2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Assignee & Unassigned Filter */}
              <select
                value={taskAssigneeFilter}
                onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                className="rounded-lg border border-[#E2DCD2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
              >
                <option value="">All Assignees ({allTasks.length})</option>
                <option value="UNASSIGNED">Unassigned ({teamWorkload.unassignedCount})</option>
                {availableMembers.length > 0 && (
                  <optgroup label="Workspace Members">
                    {availableMembers.map((m) => {
                      const count = allTasks.filter((t) => t.assigneeId === m.userId).length;
                      return (
                        <option key={m.userId} value={m.userId}>
                          {m.name || m.email} ({count})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>

              {/* Sort By */}
              <div className="relative">
                <select
                  value={taskSortBy}
                  onChange={(e) => setTaskSortBy(e.target.value as any)}
                  className="rounded-lg border border-[#E2DCD2] bg-white pl-2.5 pr-6 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
                >
                  <option value="createdAt">Newest First</option>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                </select>
                <ArrowUpDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#525B56]" />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-[#E2DCD2] bg-white p-0.5 shadow-xs">
                <button
                  onClick={() => setTaskViewMode('table')}
                  className={`p-1.5 rounded-md cursor-pointer transition-all ${
                    taskViewMode === 'table' ? 'bg-[#1F4D3A] text-white' : 'text-[#525B56]'
                  }`}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setTaskViewMode('grid')}
                  className={`p-1.5 rounded-md cursor-pointer transition-all ${
                    taskViewMode === 'grid' ? 'bg-[#1F4D3A] text-white' : 'text-[#525B56]'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                onClick={() => {
                  setCreateTaskDefaultAssignee(null);
                  setIsCreateTaskModalOpen(true);
                }}
                variant="primary"
                size="sm"
                className="gap-1 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Task</span>
              </Button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(taskSearch || taskStatusFilter || taskPriorityFilter || taskAssigneeFilter) && (
            <div className="flex flex-wrap items-center gap-2 text-xs py-1">
              <span className="text-[11px] font-semibold text-[#525B56]">Active Filters:</span>
              {taskAssigneeFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1F4D3A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1F4D3A] border border-[#1F4D3A]/20">
                  <User className="h-3 w-3" />
                  <span>
                    Assignee:{' '}
                    {taskAssigneeFilter === 'UNASSIGNED'
                      ? 'Unassigned Tasks'
                      : availableMembers.find((m) => m.userId === taskAssigneeFilter)?.name ||
                        availableMembers.find((m) => m.userId === taskAssigneeFilter)?.email ||
                        'Member'}
                  </span>
                  <button
                    onClick={() => setTaskAssigneeFilter('')}
                    className="hover:text-[#163E32] cursor-pointer"
                    title="Remove filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {taskStatusFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EEE6] px-2.5 py-0.5 text-xs font-medium text-[#1C2421] border border-[#E2DCD2]">
                  <span>Status: {taskStatusFilter}</span>
                  <button
                    onClick={() => setTaskStatusFilter('')}
                    className="hover:text-[#C93B3B] cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {taskPriorityFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EEE6] px-2.5 py-0.5 text-xs font-medium text-[#1C2421] border border-[#E2DCD2]">
                  <span>Priority: {taskPriorityFilter}</span>
                  <button
                    onClick={() => setTaskPriorityFilter('')}
                    className="hover:text-[#C93B3B] cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {taskSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EEE6] px-2.5 py-0.5 text-xs font-medium text-[#1C2421] border border-[#E2DCD2]">
                  <span>Search: &ldquo;{taskSearch}&rdquo;</span>
                  <button
                    onClick={() => setTaskSearch('')}
                    className="hover:text-[#C93B3B] cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setTaskSearch('');
                  setTaskStatusFilter('');
                  setTaskPriorityFilter('');
                  setTaskAssigneeFilter('');
                }}
                className="text-[11px] text-[#C93B3B] hover:underline cursor-pointer ml-1 font-semibold"
              >
                Reset All
              </button>
            </div>
          )}

          {/* Tasks Display */}
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E2DCD2] bg-white p-12 text-center shadow-xs">
              <CheckSquare className="mx-auto h-10 w-10 text-[#525B56]/50" />
              <h3 className="mt-3 text-sm font-bold text-[#1C2421]">No tasks found</h3>
              <p className="text-xs text-[#525B56] mt-1 max-w-sm mx-auto">
                {taskSearch || taskStatusFilter || taskPriorityFilter || taskAssigneeFilter
                  ? 'Try clearing your filters to see other tasks in this project.'
                  : 'Get started by creating the first deliverable for this project.'}
              </p>
              {taskSearch || taskStatusFilter || taskPriorityFilter || taskAssigneeFilter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTaskSearch('');
                    setTaskStatusFilter('');
                    setTaskPriorityFilter('');
                    setTaskAssigneeFilter('');
                  }}
                  className="mt-4 border-[#E2DCD2]"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setCreateTaskDefaultAssignee(null);
                    setIsCreateTaskModalOpen(true);
                  }}
                  variant="primary"
                  size="sm"
                  className="mt-4 gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                >
                  + Add First Task
                </Button>
              )}
            </div>
          ) : taskViewMode === 'table' ? (
            /* Tasks Table View */
            <div className="overflow-hidden rounded-xl border border-[#E2DCD2] bg-white shadow-xs">
              <table className="w-full text-left text-xs text-[#1C2421]">
                <thead className="border-b border-[#E2DCD2] bg-[#F0EEE6]/70 text-[11px] font-semibold text-[#525B56] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Task Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DCD2]/70">
                  {filteredTasks.map((t) => {
                    const dueDateFmt = formatDate(t.dueDate);
                    const isTaskOverdue =
                      t.dueDate &&
                      new Date(t.dueDate) < new Date() &&
                      t.status !== 'DONE' &&
                      t.status !== 'CANCELLED';

                    return (
                      <tr key={t.id} className="hover:bg-[#F7F5F0]/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setDetailTask(t)}
                            className="font-bold text-[#1C2421] hover:text-[#1F4D3A] hover:underline text-left block max-w-sm truncate cursor-pointer"
                          >
                            {t.title}
                          </button>
                          {t.description && (
                            <p className="text-[11px] text-[#525B56] max-w-sm truncate mt-0.5">
                              {t.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {dueDateFmt ? (
                            <span
                              className={`flex items-center gap-1 text-[11px] ${
                                isTaskOverdue ? 'font-bold text-[#C93B3B]' : 'text-[#525B56]'
                              }`}
                            >
                              <Calendar className="h-3 w-3" />
                              {dueDateFmt}
                              {isTaskOverdue && ' (Overdue)'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#525B56]/60 italic">Unscheduled</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-[11px] text-[#525B56]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F0EEE6] border border-[#E2DCD2] text-[10px] font-bold text-[#1F4D3A]">
                              {t.assignee?.name ? t.assignee.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                            <span className="max-w-[100px] truncate">
                              {t.assignee?.name || t.assignee?.email || 'Unassigned'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailTask(t)}
                              className="p-1.5 text-[#525B56] hover:text-[#1F4D3A] cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditTask(t)}
                              className="p-1.5 text-[#525B56] hover:text-[#1F4D3A] cursor-pointer"
                              title="Edit Task"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTask(t)}
                              className="p-1.5 text-[#C93B3B] hover:text-[#A82B2B] cursor-pointer"
                              title="Delete Task"
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
            /* Tasks Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTasks.map((t) => {
                const dueDateFmt = formatDate(t.dueDate);
                const isTaskOverdue =
                  t.dueDate &&
                  new Date(t.dueDate) < new Date() &&
                  t.status !== 'DONE' &&
                  t.status !== 'CANCELLED';

                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#1F4D3A] transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => setDetailTask(t)}
                          className="text-xs font-bold text-[#1C2421] hover:text-[#1F4D3A] text-left truncate flex-1 cursor-pointer"
                        >
                          {t.title}
                        </button>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="text-[11px] text-[#525B56] line-clamp-2">
                        {t.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[#E2DCD2]/70 text-xs">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={t.status} />
                        {dueDateFmt ? (
                          <span
                            className={`flex items-center gap-1 text-[11px] ${
                              isTaskOverdue ? 'font-bold text-[#C93B3B]' : 'text-[#525B56]'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {dueDateFmt}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#525B56]/50 italic">No date</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[#525B56]">
                        <span className="text-[11px] truncate max-w-[140px]">
                          {t.assignee?.name || t.assignee?.email || 'Unassigned'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailTask(t)}
                            className="p-1 text-[#525B56] hover:text-[#1F4D3A] cursor-pointer"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditTask(t)}
                            className="p-1 text-[#525B56] hover:text-[#1F4D3A] cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTask(t)}
                            className="p-1 text-[#C93B3B] hover:text-[#A82B2B] cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Team Collaboration & Workload Tracking */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Header Context Banner */}
          <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E2DCD2]/70 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#1F4D3A]" />
                  <h3 className="text-sm font-bold text-[#1C2421]">Project Team Collaboration & Workload</h3>
                </div>
                <p className="mt-1 text-xs text-[#525B56] leading-relaxed">
                  Workspace members assigned to <strong className="text-[#1C2421]">{project.name}</strong> deliverables. 
                  Metrics are calculated in real time directly from verified project tasks.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => {
                    setCreateTaskDefaultAssignee(null);
                    setIsCreateTaskModalOpen(true);
                  }}
                  variant="primary"
                  size="sm"
                  className="gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32] text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Assign Deliverable</span>
                </Button>
              </div>
            </div>

            {/* Top Workload Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/60 space-y-1">
                <span className="text-[11px] font-semibold text-[#525B56]">Active Contributors</span>
                <div className="text-lg font-bold text-[#1C2421]">
                  {teamWorkload.activeContributors.length}
                </div>
                <div className="text-[10px] text-[#525B56]">Assigned or leading</div>
              </div>

              <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/60 space-y-1">
                <span className="text-[11px] font-semibold text-[#525B56]">Workspace Members</span>
                <div className="text-lg font-bold text-[#1C2421]">
                  {teamWorkload.totalWorkspaceMembers}
                </div>
                <div className="text-[10px] text-[#525B56]">In current workspace</div>
              </div>

              <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#1F4D3A]/10 space-y-1">
                <span className="text-[11px] font-semibold text-[#1F4D3A]">Assigned Tasks</span>
                <div className="text-lg font-bold text-[#1F4D3A]">
                  {teamWorkload.totalAssignedTasks}
                </div>
                <div className="text-[10px] text-[#525B56]">
                  {taskMetrics.total > 0
                    ? `${Math.round((teamWorkload.totalAssignedTasks / taskMetrics.total) * 100)}% of total scope`
                    : 'No tasks created'}
                </div>
              </div>

              <div className={`rounded-lg border p-3 space-y-1 ${
                teamWorkload.unassignedCount > 0
                  ? 'border-[#C96B4A]/30 bg-[#C96B4A]/10 text-[#C96B4A]'
                  : 'border-[#E2DCD2] bg-[#F7F5F0]/60 text-[#525B56]'
              }`}>
                <span className="text-[11px] font-semibold">Unassigned Tasks</span>
                <div className={`text-lg font-bold ${teamWorkload.unassignedCount > 0 ? 'text-[#C96B4A]' : 'text-[#1C2421]'}`}>
                  {teamWorkload.unassignedCount}
                </div>
                <div className="text-[10px]">
                  {teamWorkload.unassignedOverdueCount > 0
                    ? `${teamWorkload.unassignedOverdueCount} overdue`
                    : teamWorkload.unassignedCount > 0
                    ? 'Pending assignment'
                    : 'All tasks assigned'}
                </div>
              </div>
            </div>
          </div>

          {/* Unassigned Workload Alert Card (if any unassigned tasks exist) */}
          {teamWorkload.unassignedCount > 0 && (
            <div className="rounded-xl border border-[#C96B4A]/30 bg-[#FDF9F7] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#C96B4A]/15 p-2 text-[#C96B4A]">
                  <UserX className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[#1C2421]">
                    {teamWorkload.unassignedCount} Unassigned Deliverable{teamWorkload.unassignedCount === 1 ? '' : 's'} in Project
                  </h4>
                  <p className="text-[11px] text-[#525B56] leading-relaxed">
                    {teamWorkload.unassignedActiveCount} active task{teamWorkload.unassignedActiveCount === 1 ? '' : 's'} require an owner to maintain project velocity.
                    {teamWorkload.unassignedOverdueCount > 0 && ` ${teamWorkload.unassignedOverdueCount} are currently past their due date.`}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setTaskAssigneeFilter('UNASSIGNED');
                  setActiveTab('tasks');
                }}
                variant="outline"
                size="sm"
                className="shrink-0 border-[#C96B4A]/40 text-[#C96B4A] hover:bg-[#C96B4A]/10 text-xs"
              >
                View & Assign Unassigned Tasks
              </Button>
            </div>
          )}

          {/* Section 1: Active Project Contributors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">
                  Active Project Contributors ({teamWorkload.activeContributors.length})
                </h4>
                <p className="text-[11px] text-[#525B56]">
                  Team members explicitly assigned to tasks or leading this project.
                </p>
              </div>
              <span className="text-[11px] text-[#525B56]">
                {teamWorkload.totalAssignedTasks} total assigned deliverables
              </span>
            </div>

            {teamWorkload.activeContributors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E2DCD2] bg-white p-8 text-center shadow-xs">
                <Users className="mx-auto h-8 w-8 text-[#525B56]/50" />
                <h5 className="mt-2 text-xs font-bold text-[#1C2421]">No active task assignments yet</h5>
                <p className="text-[11px] text-[#525B56] mt-1 max-w-sm mx-auto">
                  Assign tasks to workspace members to track individual workload, completion rates, and delivery health.
                </p>
                <Button
                  onClick={() => {
                    setCreateTaskDefaultAssignee(null);
                    setIsCreateTaskModalOpen(true);
                  }}
                  variant="primary"
                  size="sm"
                  className="mt-3 gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32] text-xs"
                >
                  + Assign First Task
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {teamWorkload.activeContributors.map((member) => {
                  const initial = (member.name || member.email || 'U').charAt(0).toUpperCase();

                  // Workload status
                  let workloadBadgeText = 'Balanced Workload';
                  let workloadBadgeClass = 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/20';

                  if (member.overdueCount > 0) {
                    workloadBadgeText = `${member.overdueCount} Overdue`;
                    workloadBadgeClass = 'bg-[#C93B3B]/10 text-[#C93B3B] border-[#C93B3B]/20';
                  } else if (member.activeCount > 5) {
                    workloadBadgeText = 'High Workload';
                    workloadBadgeClass = 'bg-[#C96B4A]/10 text-[#C96B4A] border-[#C96B4A]/20';
                  } else if (member.assignedCount > 0 && member.activeCount === 0) {
                    workloadBadgeText = 'All Tasks Completed';
                    workloadBadgeClass = 'bg-[#1F4D3A]/15 text-[#1F4D3A] border-[#1F4D3A]/30';
                  }

                  return (
                    <div
                      key={member.userId}
                      className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs space-y-3.5 hover:border-[#1F4D3A]/60 transition-all flex flex-col justify-between"
                    >
                      {/* Top: Avatar, Name & Roles */}
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.name || member.email}
                                className="h-9 w-9 rounded-full object-cover border border-[#E2DCD2]"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A]/10 border border-[#1F4D3A]/20 text-xs font-bold text-[#1F4D3A]">
                                {initial}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-[#1C2421] truncate">
                                {member.name || member.email.split('@')[0]}
                              </h5>
                              <p className="text-[11px] text-[#525B56] truncate">
                                {member.email}
                              </p>
                            </div>
                          </div>

                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${workloadBadgeClass}`}>
                            {workloadBadgeText}
                          </span>
                        </div>

                        {/* Badges: Project Lead & Role */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {member.isProjectCreator && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1F4D3A] bg-[#1F4D3A]/10 border border-[#1F4D3A]/20 px-2 py-0.5 rounded-md">
                              <Shield className="h-2.5 w-2.5" />
                              Project Lead
                            </span>
                          )}
                          <span className="text-[10px] text-[#525B56] bg-[#F7F5F0] border border-[#E2DCD2] px-2 py-0.5 rounded-md font-medium">
                            Role: {member.role || 'Member'}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Workload Breakdown & Velocity Progress */}
                      <div className="space-y-2 pt-2 border-t border-[#E2DCD2]/70 text-xs">
                        {/* Status Count Pills */}
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                          <div className="rounded-md bg-[#F7F5F0] p-1 border border-[#E2DCD2]/60">
                            <div className="text-[10px] text-[#525B56]">Assigned</div>
                            <div className="font-bold text-[#1C2421]">{member.assignedCount}</div>
                          </div>
                          <div className="rounded-md bg-[#1F4D3A]/10 p-1 border border-[#1F4D3A]/20">
                            <div className="text-[10px] text-[#1F4D3A]">Done</div>
                            <div className="font-bold text-[#1F4D3A]">{member.completedCount}</div>
                          </div>
                          <div className="rounded-md bg-[#C89B3C]/10 p-1 border border-[#C89B3C]/20">
                            <div className="text-[10px] text-[#9E731D]">Active</div>
                            <div className="font-bold text-[#9E731D]">{member.activeCount}</div>
                          </div>
                          <div className={`rounded-md p-1 border ${
                            member.overdueCount > 0
                              ? 'bg-[#C93B3B]/10 border-[#C93B3B]/20 text-[#C93B3B]'
                              : 'bg-[#F7F5F0] border-[#E2DCD2]/60 text-[#525B56]'
                          }`}>
                            <div className="text-[10px]">Overdue</div>
                            <div className="font-bold">{member.overdueCount}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#525B56]">Task Completion Velocity</span>
                            <span className="font-bold text-[#1F4D3A]">{member.completionRate}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                            <div
                              className="h-full bg-[#1F4D3A] transition-all duration-300"
                              style={{ width: `${member.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#E2DCD2]/70">
                        <Button
                          onClick={() => {
                            setTaskAssigneeFilter(member.userId);
                            setActiveTab('tasks');
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs border-[#E2DCD2] hover:border-[#1F4D3A] hover:text-[#1F4D3A]"
                        >
                          View Tasks ({member.assignedCount})
                        </Button>
                        <Button
                          onClick={() => {
                            setCreateTaskDefaultAssignee(member.userId);
                            setIsCreateTaskModalOpen(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-[#1F4D3A] hover:bg-[#1F4D3A]/10 px-2.5"
                          title="Assign task to this member"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Other Available Workspace Members (Not Assigned to this Project) */}
          <div className="space-y-3 pt-4 border-t border-[#E2DCD2]/70">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">
                Available Workspace Members ({teamWorkload.otherWorkspaceMembers.length})
              </h4>
              <p className="text-[11px] text-[#525B56]">
                Members belonging to this workspace who currently have no tasks assigned in this project.
              </p>
            </div>

            {teamWorkload.otherWorkspaceMembers.length === 0 ? (
              <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/60 p-4 text-xs text-[#525B56] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#1F4D3A]" />
                <span>All members of this workspace are currently assigned to tasks in this project.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamWorkload.otherWorkspaceMembers.map((member) => {
                  const initial = (member.name || member.email || 'U').charAt(0).toUpperCase();

                  return (
                    <div
                      key={member.userId}
                      className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex items-center justify-between gap-3 hover:border-[#1F4D3A]/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name || member.email}
                            className="h-8 w-8 rounded-full object-cover border border-[#E2DCD2]"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0EEE6] border border-[#E2DCD2] text-xs font-bold text-[#525B56]">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h6 className="text-xs font-bold text-[#1C2421] truncate">
                            {member.name || member.email.split('@')[0]}
                          </h6>
                          <p className="text-[10px] text-[#525B56] truncate">
                            {member.email} &bull; {member.role || 'Member'}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setCreateTaskDefaultAssignee(member.userId);
                          setIsCreateTaskModalOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1 text-[11px] border-[#E2DCD2] hover:border-[#1F4D3A] hover:text-[#1F4D3A] px-2 py-1 h-7"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>Assign Task</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-5">
          {isTimelineLoading ? (
            <div className="rounded-2xl border border-[#E2DCD2] bg-white p-12 text-center shadow-xs">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#1F4D3A]" />
              <p className="mt-3 text-xs font-semibold text-[#525B56]">Computing critical path and delay risks...</p>
            </div>
          ) : timelineData ? (
            <div className="space-y-5">
              {/* Timeline Risk Summary Banner */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2DCD2]/70 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#1F4D3A]" />
                    <h3 className="text-sm font-bold text-[#1C2421]">Critical Path & Delivery Prediction</h3>
                  </div>
                  <Badge
                    variant={
                      timelineData.delayPrediction?.overallStatus === 'ON_TRACK'
                        ? 'success'
                        : timelineData.delayPrediction?.overallStatus === 'AT_RISK'
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {timelineData.delayPrediction?.overallStatus || 'ACTIVE'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/50 space-y-1">
                    <span className="text-[11px] text-[#525B56]">Delay Risk Score</span>
                    <div className="text-lg font-bold text-[#1C2421]">
                      {timelineData.delayPrediction?.delayRiskScore ?? 0} / 100
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/50 space-y-1">
                    <span className="text-[11px] text-[#525B56]">Predicted Delay</span>
                    <div className="text-lg font-bold text-[#1C2421]">
                      {timelineData.delayPrediction?.delayDays ?? 0} days
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/50 space-y-1">
                    <span className="text-[11px] text-[#525B56]">Critical Path Length</span>
                    <div className="text-lg font-bold text-[#1C2421]">
                      {timelineData.criticalPath?.projectDurationDays ?? 0} days
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#E2DCD2] p-3 bg-[#F7F5F0]/50 space-y-1">
                    <span className="text-[11px] text-[#525B56]">Completion Target</span>
                    <div className="text-sm font-bold text-[#1F4D3A] truncate mt-1">
                      {formatDate(timelineData.delayPrediction?.predictedCompletionDate) || 'Calculated'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks on Critical Path */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#1C2421]">
                  Critical Path Tasks ({timelineData.criticalPath?.criticalPathTaskIds?.length || 0})
                </h3>
                {timelineData.tasks && timelineData.tasks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E2DCD2] bg-[#F0EEE6]/70 text-[11px] text-[#525B56]">
                        <tr>
                          <th className="px-3 py-2">Task</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Duration / Slack</th>
                          <th className="px-3 py-2">Path Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2DCD2]/70">
                        {timelineData.tasks.slice(0, 8).map((t) => (
                          <tr key={t.id} className="hover:bg-[#F7F5F0]/50">
                            <td className="px-3 py-2.5 font-medium text-[#1C2421]">{t.title}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant="neutral">{t.status}</Badge>
                            </td>
                            <td className="px-3 py-2.5 text-[#525B56]">
                              {t.estimatedHours || 0}h (slack: {t.slackHours || 0}h)
                            </td>
                            <td className="px-3 py-2.5">
                              {t.isCriticalPath ? (
                                <span className="text-[#C93B3B] font-bold text-[11px]">Critical</span>
                              ) : (
                                <span className="text-[#525B56] text-[11px]">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[#525B56] italic">
                    Add start and due dates to tasks to plot the dependencies and critical path timeline.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E2DCD2] bg-white p-8 text-center shadow-xs">
              <Clock className="mx-auto h-8 w-8 text-[#525B56]/50" />
              <h4 className="mt-2 text-sm font-bold text-[#1C2421]">Timeline Unavailable</h4>
              <p className="mt-1 text-xs text-[#525B56]">
                Timeline calculations require tasks with scheduled start and delivery dates.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Activity (Real Audit Log Timeline) */}
      {activeTab === 'activity' && (
        <ProjectActivityFeed projectId={projectId} projectName={project.name} />
      )}

      {/* Edit Project Modal */}
      <Modal
        open={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        title="Edit Project Details"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveProject} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">
              Project Name <span className="text-[#C93B3B]">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError(null);
              }}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1C2421] mb-1">Project Key Prefix</label>
              <input
                type="text"
                maxLength={5}
                value={editKey}
                onChange={(e) => {
                  setEditKey(e.target.value.toUpperCase());
                  setEditError(null);
                }}
                className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1C2421] mb-1">Current Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
              >
                {ALL_PROJECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {projectStatusLabels[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
              rows={3}
            />
          </div>

          {editError && (
            <div className="flex items-center gap-2 rounded-lg border border-[#C93B3B]/30 bg-[#FFF5F5] p-3 text-xs text-[#C93B3B]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E2DCD2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={updateProjectMutation.isPending}
              className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        open={isCreateTaskModalOpen}
        onClose={() => {
          setIsCreateTaskModalOpen(false);
          setCreateTaskDefaultAssignee(null);
        }}
        title={`Add Task to ${project.name}`}
        maxWidth="max-w-md"
      >
        <TaskForm
          defaultValues={{
            projectId: projectId,
            status: 'TODO',
            priority: 'MEDIUM',
            assigneeId: createTaskDefaultAssignee || '',
          }}
          onSubmit={handleCreateTaskSubmit}
          isLoading={createTaskMutation.isPending}
          submitLabel="Create Task"
          projects={[{ id: project.id, name: project.name }]}
          members={availableMembers}
          showProjectField={false}
        />
      </Modal>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        task={detailTask}
        members={availableMembers}
        onAssigneeChange={handleAssigneeChange}
        isUpdatingAssignee={isUpdatingAssignee}
        onEdit={() => {
          const t = detailTask;
          setDetailTask(null);
          setEditTask(t);
        }}
        onDelete={() => {
          const t = detailTask;
          setDetailTask(null);
          setDeleteTask(t);
        }}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        open={!!editTask}
        onClose={() => {
          setEditTask(null);
          refetchTasks();
          refetchProject();
        }}
        task={editTask}
        projects={[{ id: project.id, name: project.name }]}
        members={availableMembers}
      />

      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        open={!!deleteTask}
        onClose={() => {
          setDeleteTask(null);
          refetchTasks();
          refetchProject();
        }}
        taskId={deleteTask?.id || null}
        taskTitle={deleteTask?.title || ''}
      />
    </div>
  );
}
