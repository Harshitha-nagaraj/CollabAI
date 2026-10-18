'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useWorkspaces } from '@/lib/queries/workspaces';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/lib/queries/projects';
import { Button } from '@/components/ui/button';
import { Badge, ProjectStatusBadge, projectStatusLabels, projectStatusStyles } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import type { Project, ProjectStatus } from '@/types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FolderPlus,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  PauseCircle,
  Search,
  Trash2,
  User as UserIcon,
  XCircle,
  X,
  ChevronDown,
} from 'lucide-react';

const ALL_STATUSES: ProjectStatus[] = [
  'PLANNING',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
];

type SortOption =
  | 'updated_desc'
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'progress_desc'
  | 'due_asc';

export default function ProjectsPage() {
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId);
  const { data: wsData } = useWorkspaces();
  const { toast } = useToast();

  // Search, Filter, Sort & View Modes
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Quick Status Edit Loading Tracker
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjKey, setNewProjKey] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStatus, setNewProjStatus] = useState<ProjectStatus>('PLANNING');
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('PLANNING');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // React Query Data & Mutations
  const {
    data: projectsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjects(selectedWorkspaceId, search, statusFilter);

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const rawProjects = projectsData?.projects || [];
  const currentWorkspace = wsData?.workspaces.find((w) => w.id === selectedWorkspaceId);

  // Sorted and Processed Projects List
  const projects = useMemo(() => {
    const list = [...rawProjects];
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'progress_desc':
          return (b.progress || 0) - (a.progress || 0);
        case 'due_asc': {
          if (!a.targetDueDate && !b.targetDueDate) return 0;
          if (!a.targetDueDate) return 1;
          if (!b.targetDueDate) return -1;
          return new Date(a.targetDueDate).getTime() - new Date(b.targetDueDate).getTime();
        }
        case 'updated_desc':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return list;
  }, [rawProjects, sortBy]);

  // Real Real-time Overview Metrics Computed Strictly from Backend Data
  const metrics = useMemo(() => {
    const total = rawProjects.length;
    const inProgress = rawProjects.filter((p) => p.status === 'IN_PROGRESS').length;
    const completed = rawProjects.filter((p) => p.status === 'COMPLETED').length;
    const onHold = rawProjects.filter((p) => p.status === 'ON_HOLD').length;
    const planning = rawProjects.filter((p) => p.status === 'PLANNING').length;
    const cancelled = rawProjects.filter((p) => p.status === 'CANCELLED').length;
    const overdue = rawProjects.filter((p) => p.isOverdue).length;

    const totalTasks = rawProjects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
    const doneTasks = rawProjects.reduce((sum, p) => sum + (p.doneTasks || 0), 0);
    const openIssues = rawProjects.reduce((sum, p) => sum + (p.openIssues || 0), 0);
    const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return {
      total,
      inProgress,
      completed,
      onHold,
      planning,
      cancelled,
      overdue,
      totalTasks,
      doneTasks,
      openIssues,
      overallProgress,
    };
  }, [rawProjects]);

  // Quick Status Edit Handler
  const handleQuickStatusChange = async (project: Project, newStatus: ProjectStatus) => {
    if (project.status === newStatus || updatingProjectId === project.id) return;
    setUpdatingProjectId(project.id);
    try {
      await updateMutation.mutateAsync({
        id: project.id,
        status: newStatus,
      });
      toast(`Project "${project.name}" marked as ${projectStatusLabels[newStatus]}`, 'success');
      // If we are currently viewing this project in details modal, update it
      if (viewingProject && viewingProject.id === project.id) {
        setViewingProject({ ...viewingProject, status: newStatus });
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to update project status', 'error');
    } finally {
      setUpdatingProjectId(null);
    }
  };

  // Create Project Submit Handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId) {
      setCreateFormError('Please select a workspace before creating a project.');
      return;
    }
    if (!newProjName.trim() || newProjName.trim().length < 2) {
      setCreateFormError('Project name must be at least 2 characters.');
      return;
    }

    setCreateFormError(null);
    try {
      const res = await createMutation.mutateAsync({
        workspaceId: selectedWorkspaceId,
        name: newProjName.trim(),
        key: newProjKey.trim() || undefined,
        description: newProjDesc.trim() || undefined,
        status: newProjStatus,
      });

      toast(`Project "${res.project.name}" created successfully!`, 'success');
      setIsCreateModalOpen(false);
      setNewProjName('');
      setNewProjKey('');
      setNewProjDesc('');
      setNewProjStatus('PLANNING');
      setCreateFormError(null);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create project';
      setCreateFormError(msg);
      toast(msg, 'error');
    }
  };

  // Open Edit Project Modal
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditKey(project.key || '');
    setEditDesc(project.description || '');
    setEditStatus(project.status || 'PLANNING');
    setEditFormError(null);
  };

  // Save Edit Project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editName.trim() || editName.trim().length < 2) {
      setEditFormError('Project name must be at least 2 characters.');
      return;
    }

    setEditFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingProject.id,
        name: editName.trim(),
        key: editKey.trim() || undefined,
        description: editDesc.trim() || undefined,
        status: editStatus,
      });

      toast(`Project "${editName}" updated successfully!`, 'success');
      setEditingProject(null);
      setEditFormError(null);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update project';
      setEditFormError(msg);
      toast(msg, 'error');
    }
  };

  // Delete Project Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    try {
      await deleteMutation.mutateAsync(deletingProject.id);
      toast(`Project "${deletingProject.name}" deleted successfully.`, 'success');
      setDeletingProject(null);
      if (viewingProject && viewingProject.id === deletingProject.id) {
        setViewingProject(null);
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to delete project', 'error');
    }
  };

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

  // 1. No Active Workspace Selected
  if (!selectedWorkspaceId) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-[#E2DCD2] bg-white p-12 text-center shadow-xs">
          <Layers className="mx-auto h-10 w-10 text-[#1F4D3A]/60" />
          <h2 className="mt-3 text-base font-bold text-[#1C2421]">No Active Workspace Selected</h2>
          <p className="mt-1 text-xs text-[#525B56]">
            Select a workspace from the workspace selector to view and manage project directories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#1C2421]">Project Portfolio</h1>
            {currentWorkspace && (
              <span className="rounded-full bg-[#1F4D3A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1F4D3A] border border-[#1F4D3A]/20">
                {currentWorkspace.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#525B56] mt-0.5">
            Real-time delivery progress, milestone health, and status control across workspace projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-[#E2DCD2] bg-white p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-[#1F4D3A] text-white shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
              title="Table List View"
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#1F4D3A] text-white shadow-xs'
                  : 'text-[#525B56] hover:text-[#1C2421]'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>
          </div>

          <Button
            onClick={() => {
              setCreateFormError(null);
              setIsCreateModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
          >
            <FolderPlus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Advanced Compact Project Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Projects */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#525B56]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
            <Layers className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-[#1C2421]">{metrics.total}</div>
            <div className="text-[10px] text-[#525B56] mt-0.5">
              {metrics.planning} planning · {metrics.cancelled} cancelled
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#525B56]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1F4D3A]">In Progress</span>
            <Clock className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-[#1F4D3A]">{metrics.inProgress}</div>
            <div className="text-[10px] text-[#525B56] mt-0.5">Active delivery pipelines</div>
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#525B56]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1F4D3A]">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-[#1C2421]">{metrics.completed}</div>
            <div className="text-[10px] text-[#525B56] mt-0.5">Delivered deliverables</div>
          </div>
        </div>

        {/* On Hold */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#525B56]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C89B3C]">On Hold</span>
            <PauseCircle className="h-4 w-4 text-[#C89B3C]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-[#9E731D]">{metrics.onHold}</div>
            <div className="text-[10px] text-[#525B56] mt-0.5">Paused or awaiting input</div>
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#525B56]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C93B3B]">Overdue</span>
            <AlertTriangle className="h-4 w-4 text-[#C93B3B]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-[#C93B3B]">{metrics.overdue}</div>
            <div className="text-[10px] text-[#525B56] mt-0.5">Past target date / tasks</div>
          </div>
        </div>

        {/* Real Task Progress */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#525B56]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1C2421]">Delivery Rate</span>
            <span className="text-[11px] font-bold text-[#1F4D3A]">{metrics.overallProgress}%</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
              <div
                className="h-full bg-[#1F4D3A] transition-all duration-300"
                style={{ width: `${metrics.overallProgress}%` }}
              />
            </div>
            <div className="text-[10px] text-[#525B56]">
              {metrics.doneTasks} of {metrics.totalTasks} tasks done
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Filters, Sorting */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-[#E2DCD2] bg-white/70 p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#525B56]/70" />
            <input
              type="text"
              placeholder="Search projects by name or key (e.g. PRJ)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white pl-8.5 pr-8 py-1.5 text-xs text-[#1C2421] placeholder:text-[#525B56]/70 focus:border-[#1F4D3A] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#525B56] hover:text-[#1C2421] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-[#E2DCD2] bg-white px-3 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses ({metrics.total})</option>
              <option value="PLANNING">Planning ({metrics.planning})</option>
              <option value="IN_PROGRESS">In Progress ({metrics.inProgress})</option>
              <option value="COMPLETED">Completed ({metrics.completed})</option>
              <option value="ON_HOLD">On Hold ({metrics.onHold})</option>
              <option value="CANCELLED">Cancelled ({metrics.cancelled})</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-[#E2DCD2] bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
              >
                <option value="updated_desc">Recently Updated</option>
                <option value="name_asc">Name (A – Z)</option>
                <option value="name_desc">Name (Z – A)</option>
                <option value="created_desc">Creation Date (Newest)</option>
                <option value="created_asc">Creation Date (Oldest)</option>
                <option value="progress_desc">Highest Progress</option>
                <option value="due_asc">Target Delivery Date</option>
              </select>
              <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#525B56] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Counter & Clear Filter */}
        <div className="flex items-center justify-between lg:justify-end gap-3 text-xs text-[#525B56]">
          <span>
            Showing <strong className="text-[#1C2421]">{projects.length}</strong> of{' '}
            <strong className="text-[#1C2421]">{metrics.total}</strong> projects
          </span>
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="text-xs font-medium text-[#1F4D3A] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        /* Loading Skeleton State */
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-8 shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#1F4D3A]" />
            <p className="text-xs font-semibold text-[#525B56]">Loading workspace projects...</p>
          </div>
        </div>
      ) : isError ? (
        /* Error State */
        <div className="rounded-2xl border border-[#C93B3B]/20 bg-[#FFF5F5] p-8 text-center shadow-xs">
          <AlertCircle className="mx-auto h-8 w-8 text-[#C93B3B]" />
          <h3 className="mt-2 text-sm font-bold text-[#1C2421]">Failed to load workspace projects</h3>
          <p className="mt-1 text-xs text-[#525B56]">
            {(error as any)?.message || 'Could not fetch projects from the database.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 border-[#E2DCD2]"
          >
            Retry Loading
          </Button>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-[#E2DCD2] bg-white p-12 text-center shadow-xs">
          <FolderPlus className="mx-auto h-10 w-10 text-[#525B56]/50" />
          <h3 className="mt-3 text-sm font-bold text-[#1C2421]">No matching projects found</h3>
          <p className="text-xs text-[#525B56] mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'Try modifying your search query or status filter to see other workspace projects.'
              : 'Start organizing your workspace deliverables by creating your first project.'}
          </p>
          {search || statusFilter !== 'ALL' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="mt-4 border-[#E2DCD2]"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => {
                setCreateFormError(null);
                setIsCreateModalOpen(true);
              }}
              variant="primary"
              size="sm"
              className="mt-4 gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              + Create First Project
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Table / List View */
        <div className="overflow-hidden rounded-xl border border-[#E2DCD2] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1C2421]">
              <thead className="border-b border-[#E2DCD2] bg-[#F0EEE6]/70 text-[11px] font-semibold text-[#525B56] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Project & Key</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Task Completion</th>
                  <th className="px-4 py-3">Target Date</th>
                  <th className="px-4 py-3 text-center">Owner / Team</th>
                  <th className="px-4 py-3 text-center">Open Issues</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DCD2]/70">
                {projects.map((project) => {
                  const isUpdatingThis = updatingProjectId === project.id;
                  const targetDateFormatted = formatDate(project.targetDueDate);

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-[#F7F5F0]/70 transition-colors group"
                    >
                      {/* Name & Key */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1F4D3A]/10 text-xs font-bold text-[#1F4D3A] border border-[#1F4D3A]/20">
                            {project.key || project.name.substring(0, 3).toUpperCase()}
                          </span>
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <Link
                              href={`/dashboard/projects/${project.id}`}
                              className="font-bold text-[#1C2421] hover:text-[#1F4D3A] hover:underline text-left truncate block cursor-pointer"
                            >
                              {project.name}
                            </Link>
                            <p className="text-[11px] text-[#525B56] truncate mt-0.5">
                              {project.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Interactive Status Dropdown Control */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="relative inline-flex items-center">
                          {isUpdatingThis ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#E2DCD2] bg-[#F0EEE6] text-[11px] font-medium text-[#525B56]">
                              <Loader2 className="h-3 w-3 animate-spin text-[#1F4D3A]" />
                              <span>Saving...</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <select
                                value={project.status}
                                onChange={(e) =>
                                  handleQuickStatusChange(project, e.target.value as ProjectStatus)
                                }
                                disabled={isUpdatingThis}
                                className={`appearance-none rounded-md pl-2 pr-6 py-0.5 text-[11px] font-semibold cursor-pointer transition-all border focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] ${
                                  projectStatusStyles[project.status] || projectStatusStyles.PLANNING
                                }`}
                                title="Click to quick-change status"
                              >
                                {ALL_STATUSES.map((st) => (
                                  <option
                                    key={st}
                                    value={st}
                                    className="bg-white text-[#1C2421] font-normal"
                                  >
                                    {projectStatusLabels[st]}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Progress Bar & Real Task Counts */}
                      <td className="px-4 py-3.5 min-w-[150px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#1C2421]">
                              {project.progress || 0}%
                            </span>
                            <span className="text-[#525B56]">
                              {project.doneTasks || 0} / {project.totalTasks || 0} tasks
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                            <div
                              className="h-full bg-[#1F4D3A] transition-all duration-300"
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Target Due Date & Overdue Tag */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {targetDateFormatted ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-[11px] text-[#1C2421]">
                              <Calendar className="h-3 w-3 text-[#525B56]" />
                              {targetDateFormatted}
                            </span>
                            {project.isOverdue && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C93B3B]">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#525B56]/70 italic">None set</span>
                        )}
                      </td>

                      {/* Owner / Creator */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" title={project.creator?.name || project.creator?.email || 'Unknown owner'}>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F0EEE6] border border-[#E2DCD2] text-[10px] font-bold text-[#1F4D3A]">
                            {project.creator?.name
                              ? project.creator.name.charAt(0).toUpperCase()
                              : 'U'}
                          </span>
                          <span className="text-[11px] text-[#525B56] max-w-[90px] truncate">
                            {project.creator?.name || 'Workspace member'}
                          </span>
                        </div>
                      </td>

                      {/* Open Issues */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-semibold">
                        <span
                          className={
                            (project.openIssues || 0) > 0 ? 'text-[#C96B4A]' : 'text-[#525B56]'
                          }
                        >
                          {project.openIssues || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#525B56] hover:text-[#1F4D3A] hover:bg-[#F0EEE6] transition-colors"
                            title="Open Project Workspace"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(project)}
                            className="h-7 w-7 p-0 text-[#525B56] hover:text-[#1F4D3A]"
                            title="Edit Project"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingProject(project)}
                            className="h-7 w-7 p-0 text-[#C93B3B] hover:bg-[#FFF2F2]"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const isUpdatingThis = updatingProjectId === project.id;
            const targetDateFormatted = formatDate(project.targetDueDate);

            return (
              <div
                key={project.id}
                className="rounded-xl border border-[#E2DCD2] bg-white p-4.5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#1F4D3A] transition-all group"
              >
                {/* Card Header & Status Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1F4D3A]/10 text-xs font-bold text-[#1F4D3A] border border-[#1F4D3A]/20">
                        {project.key || project.name.substring(0, 3).toUpperCase()}
                      </span>
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="text-sm font-bold text-[#1C2421] truncate hover:text-[#1F4D3A] text-left cursor-pointer"
                        title={project.name}
                      >
                        {project.name}
                      </Link>
                    </div>

                    {/* Quick Status Dropdown */}
                    <div className="relative shrink-0">
                      {isUpdatingThis ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#E2DCD2] bg-[#F0EEE6] text-[11px] font-medium text-[#525B56]">
                          <Loader2 className="h-3 w-3 animate-spin text-[#1F4D3A]" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={project.status}
                            onChange={(e) =>
                              handleQuickStatusChange(project, e.target.value as ProjectStatus)
                            }
                            disabled={isUpdatingThis}
                            className={`appearance-none rounded-md pl-2 pr-6 py-0.5 text-[11px] font-semibold cursor-pointer transition-all border focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] ${
                              projectStatusStyles[project.status] || projectStatusStyles.PLANNING
                            }`}
                            title="Click to quick-change status"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option
                                key={st}
                                value={st}
                                className="bg-white text-[#1C2421] font-normal"
                              >
                                {projectStatusLabels[st]}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#525B56] line-clamp-2 min-h-[32px]">
                    {project.description || 'No project description provided.'}
                  </p>
                </div>

                {/* Progress & Target Date */}
                <div className="space-y-3 pt-1">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-[#525B56]">Task Progress</span>
                      <span className="text-[#1F4D3A]">
                        {project.progress || 0}% ({project.doneTasks || 0}/{project.totalTasks || 0})
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                      <div
                        className="h-full bg-[#1F4D3A] transition-all duration-300"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Due Date & Overdue Tag */}
                  <div className="flex items-center justify-between text-[11px] text-[#525B56]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#525B56]/70" />
                      <span>{targetDateFormatted ? targetDateFormatted : 'No target date'}</span>
                    </div>
                    {project.isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#C93B3B]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#C93B3B]">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Overdue
                      </span>
                    )}
                  </div>

                  {/* Footer Metadata & Actions */}
                  <div className="flex items-center justify-between border-t border-[#E2DCD2] pt-3 text-xs text-[#525B56]">
                    <div className="flex items-center gap-2.5">
                      <span title="Owner / Creator" className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3 text-[#525B56]" />
                        <span className="max-w-[70px] truncate">
                          {project.creator?.name || 'Member'}
                        </span>
                      </span>
                      <span>·</span>
                      <span
                        className={
                          (project.openIssues || 0) > 0 ? 'text-[#C96B4A] font-semibold' : ''
                        }
                      >
                        {project.openIssues || 0} issues
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="p-1 text-[#525B56] hover:text-[#1F4D3A] cursor-pointer"
                        title="Open Project Workspace"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="p-1 text-[#525B56] hover:text-[#1F4D3A] cursor-pointer"
                        title="Edit Project"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingProject(project)}
                        className="p-1 text-[#C93B3B] hover:text-[#A82B2B] cursor-pointer"
                        title="Delete Project"
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

      {/* Create Project Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">
              Project Name <span className="text-[#C93B3B]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI Customer Analytics"
              value={newProjName}
              onChange={(e) => {
                setNewProjName(e.target.value);
                setCreateFormError(null);
              }}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1C2421] mb-1">
                Project Key Prefix
              </label>
              <input
                type="text"
                placeholder="e.g. ACA"
                maxLength={5}
                value={newProjKey}
                onChange={(e) => {
                  setNewProjKey(e.target.value.toUpperCase());
                  setCreateFormError(null);
                }}
                className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1C2421] mb-1">Initial Status</label>
              <select
                value={newProjStatus}
                onChange={(e) => setNewProjStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none cursor-pointer"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {projectStatusLabels[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Description (Optional)</label>
            <textarea
              placeholder="Summary of project goals, key deliverables, and architectural scope..."
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
              rows={3}
            />
          </div>

          {createFormError && (
            <div className="flex items-center gap-2 rounded-lg border border-[#C93B3B]/30 bg-[#FFF5F5] p-3 text-xs text-[#C93B3B]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createFormError}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E2DCD2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={createMutation.isPending}
              className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        title="Edit Project Settings"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateProject} className="space-y-3.5 text-xs">
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
                setEditFormError(null);
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
                  setEditFormError(null);
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
                {ALL_STATUSES.map((st) => (
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

          {/* Project Metadata Preview Box */}
          {editingProject && (
            <div className="rounded-lg bg-[#F0EEE6]/70 p-3 border border-[#E2DCD2] space-y-1 text-[11px] text-[#525B56]">
              <div className="flex justify-between">
                <span>Created by:</span>
                <span className="font-semibold text-[#1C2421]">
                  {editingProject.creator?.name || editingProject.creator?.email || 'Workspace Member'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Task progress:</span>
                <span className="font-semibold text-[#1C2421]">
                  {editingProject.progress || 0}% ({editingProject.doneTasks || 0}/{editingProject.totalTasks || 0} completed)
                </span>
              </div>
            </div>
          )}

          {editFormError && (
            <div className="flex items-center gap-2 rounded-lg border border-[#C93B3B]/30 bg-[#FFF5F5] p-3 text-xs text-[#C93B3B]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editFormError}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E2DCD2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingProject(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={updateMutation.isPending}
              className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Project Details Modal */}
      <Modal
        open={!!viewingProject}
        onClose={() => setViewingProject(null)}
        title="Project Overview & Details"
        maxWidth="max-w-lg"
      >
        {viewingProject && (
          <div className="space-y-4 text-xs">
            {/* Header / Key / Status */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2DCD2]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1F4D3A]/10 text-sm font-bold text-[#1F4D3A] border border-[#1F4D3A]/25">
                  {viewingProject.key || viewingProject.name.substring(0, 3).toUpperCase()}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1C2421]">{viewingProject.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <ProjectStatusBadge status={viewingProject.status} />
                    {viewingProject.isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#C93B3B]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#C93B3B]">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-[11px] font-semibold text-[#525B56] uppercase tracking-wider mb-1">
                Description
              </h4>
              <p className="rounded-lg bg-[#F7F5F0] p-3 text-xs text-[#1C2421] leading-relaxed border border-[#E2DCD2]">
                {viewingProject.description || 'No description provided for this project.'}
              </p>
            </div>

            {/* Task Progress & Delivery Metrics */}
            <div className="rounded-lg border border-[#E2DCD2] p-3 space-y-2.5 bg-white">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-[#1C2421]">Delivery & Task Completion</span>
                <span className="text-[#1F4D3A]">{viewingProject.progress || 0}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                <div
                  className="h-full bg-[#1F4D3A] transition-all duration-300"
                  style={{ width: `${viewingProject.progress || 0}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                <div className="rounded bg-[#F0EEE6]/70 p-2 border border-[#E2DCD2]/70">
                  <div className="text-[#525B56]">Total Tasks</div>
                  <div className="font-bold text-[#1C2421] mt-0.5">{viewingProject.totalTasks || 0}</div>
                </div>
                <div className="rounded bg-[#F0EEE6]/70 p-2 border border-[#E2DCD2]/70">
                  <div className="text-[#525B56]">Completed</div>
                  <div className="font-bold text-[#1F4D3A] mt-0.5">{viewingProject.doneTasks || 0}</div>
                </div>
                <div className="rounded bg-[#F0EEE6]/70 p-2 border border-[#E2DCD2]/70">
                  <div className="text-[#525B56]">Open Issues</div>
                  <div className="font-bold text-[#C96B4A] mt-0.5">{viewingProject.openIssues || 0}</div>
                </div>
              </div>
            </div>

            {/* Project Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-lg border border-[#E2DCD2] p-2.5 space-y-1 bg-[#F0EEE6]/40">
                <div className="text-[#525B56]">Target Delivery Date</div>
                <div className="font-semibold text-[#1C2421]">
                  {formatDate(viewingProject.targetDueDate) || 'Not scheduled'}
                </div>
              </div>
              <div className="rounded-lg border border-[#E2DCD2] p-2.5 space-y-1 bg-[#F0EEE6]/40">
                <div className="text-[#525B56]">Owner / Creator</div>
                <div className="font-semibold text-[#1C2421] truncate">
                  {viewingProject.creator?.name || viewingProject.creator?.email || 'Workspace Member'}
                </div>
              </div>
              <div className="rounded-lg border border-[#E2DCD2] p-2.5 space-y-1 bg-[#F0EEE6]/40">
                <div className="text-[#525B56]">Created At</div>
                <div className="font-semibold text-[#1C2421]">
                  {formatDate(viewingProject.createdAt)}
                </div>
              </div>
              <div className="rounded-lg border border-[#E2DCD2] p-2.5 space-y-1 bg-[#F0EEE6]/40">
                <div className="text-[#525B56]">Last Updated</div>
                <div className="font-semibold text-[#1C2421]">
                  {formatDate(viewingProject.updatedAt)}
                </div>
              </div>
            </div>

            {/* Footer Quick Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E2DCD2]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#525B56]">Change Status:</span>
                <select
                  value={viewingProject.status}
                  onChange={(e) =>
                    handleQuickStatusChange(viewingProject, e.target.value as ProjectStatus)
                  }
                  className="rounded-md border border-[#E2DCD2] bg-white px-2 py-1 text-xs font-semibold text-[#1C2421] cursor-pointer"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {projectStatusLabels[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = viewingProject;
                    setViewingProject(null);
                    handleOpenEdit(p);
                  }}
                  className="gap-1 border-[#E2DCD2]"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingProject(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        open={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="Delete Project Confirmation"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#1C2421] leading-relaxed">
            Are you sure you want to delete project{' '}
            <strong className="text-[#1C2421]">{deletingProject?.name}</strong>?
          </p>
          <p className="text-[#525B56] leading-relaxed">
            All tasks, milestones, and deliverables associated with this project will also be removed.
            This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2DCD2]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingProject(null)}
              className="border-[#E2DCD2]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
              className="bg-[#C93B3B] text-white hover:bg-[#A82B2B]"
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
