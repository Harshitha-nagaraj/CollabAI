'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useWorkspaces } from '@/lib/queries/workspaces';
import { NotificationsDropdown } from '@/components/notifications-dropdown';
import { CommandBar } from '@/components/command-bar';
import { Button } from '@/components/ui/button';
import { CreateTaskModal } from '@/components/create-task-modal';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';

const pageTitles: Record<string, { title: string; subtitle: string; category: string }> = {
  '/dashboard': {
    title: 'Operational Dashboard',
    subtitle: 'Real-time project metrics, task status & team activity summary',
    category: 'Work Management',
  },
  '/dashboard/executive': {
    title: 'Executive AI Workspace',
    subtitle: 'Portfolio health, delay prediction metrics & strategic risk management',
    category: 'Intelligence',
  },
  '/dashboard/simulator': {
    title: 'AI Scenario Simulator',
    subtitle: 'Simulate capacity changes, scope adjustments & timeline predictions',
    category: 'Intelligence',
  },
  '/dashboard/learning': {
    title: 'AI Learning & Performance',
    subtitle: 'Historical outcome models, pattern tracking & recommendation performance',
    category: 'Intelligence',
  },
  '/dashboard/projects': {
    title: 'Projects Portfolio',
    subtitle: 'Manage active workspace projects, team assignments & delivery targets',
    category: 'Work Management',
  },
  '/dashboard/kanban': {
    title: 'Task Execution Board',
    subtitle: 'Agile kanban board, workflow statuses & assignee workload balancing',
    category: 'Work Management',
  },
  '/dashboard/tasks': {
    title: 'Task Execution Board',
    subtitle: 'Agile kanban board, workflow statuses & assignee workload balancing',
    category: 'Work Management',
  },
  '/dashboard/timeline': {
    title: 'Project Timeline',
    subtitle: 'Gantt-style roadmap view, milestones & task dependency tracking',
    category: 'Work Management',
  },
  '/dashboard/sprints': {
    title: 'Sprints & Releases',
    subtitle: 'Active sprint progress, backlog capacity, velocity & release readiness',
    category: 'Work Management',
  },
  '/dashboard/meetings': {
    title: 'AI Sync Meetings',
    subtitle: 'Meeting transcripts, AI decision extraction & action item generation',
    category: 'Intelligence',
  },
  '/dashboard/knowledge': {
    title: 'Knowledge Base',
    subtitle: 'Searchable project specs, architectural decisions & team document hub',
    category: 'Knowledge & Development',
  },
  '/dashboard/decisions': {
    title: 'Decision Log',
    subtitle: 'Audit trail of technical, product & architectural decisions',
    category: 'Knowledge & Development',
  },
  '/dashboard/github': {
    title: 'GitHub & Code Integration',
    subtitle: 'Connected repository commits, pull requests & linked task issues',
    category: 'Knowledge & Development',
  },
  '/dashboard/releases': {
    title: 'Release Notes',
    subtitle: 'Version changelogs, completed features, fixes & deployment logs',
    category: 'Knowledge & Development',
  },
  '/dashboard/documents': {
    title: 'Workspace Documents',
    subtitle: 'Shared team documentation, specs & collaboration files',
    category: 'Workspace',
  },
  '/dashboard/settings': {
    title: 'Workspace Settings',
    subtitle: 'Manage workspace configuration, team members & permissions',
    category: 'Workspace',
  },
};

export function Header() {
  const pathname = usePathname();
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId);
  const { data: wsData } = useWorkspaces();
  const { data: wsDetails } = useWorkspaceDetails(selectedWorkspaceId);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const activeWorkspace = wsData?.workspaces?.find((w) => w.id === selectedWorkspaceId);
  const pageMeta = pageTitles[pathname] || {
    title: 'CollabAI Enterprise',
    subtitle: 'AI-Powered Intelligent Collaboration Workspace',
    category: 'Workspace',
  };

  const members = wsDetails?.members || [];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#E2DCD2] bg-[#F7F5F0]/90 px-6 py-3">
        {/* Left: Breadcrumbs & Page Info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#525B56]">
            <span>{pageMeta.category}</span>
            <span>/</span>
            <span className="font-semibold text-[#1F4D3A]">
              {activeWorkspace?.name || 'Workspace'}
            </span>
          </div>
          <h1 className="text-base font-bold tracking-tight text-[#1C2421] truncate">
            {pageMeta.title}
          </h1>
        </div>

        {/* Right: Actions, Search, Notifications */}
        <div className="flex items-center gap-3">
          {/* Quick Search / Command Bar Trigger */}
          <button
            id="header-command-trigger"
            data-testid="header-command-trigger"
            aria-label="Search or AI command"
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('toggle-command-bar'));
              }
            }}
            className="hidden md:flex items-center gap-2 rounded-lg border border-[#E2DCD2] bg-white px-3 py-1.5 text-xs text-[#525B56] hover:border-[#1F4D3A] hover:text-[#1C2421] transition-all shadow-xs cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 text-[#525B56]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="font-medium">Search or AI command...</span>
            <kbd className="rounded border border-[#E2DCD2] bg-[#F0EEE6] px-1.5 py-0.5 text-[10px] font-semibold text-[#1C2421]">
              Ctrl K
            </kbd>
          </button>

          {/* Notifications Dropdown */}
          <NotificationsDropdown />

          {/* Quick Contextual Action */}
          <Button
            onClick={() => setCreateTaskOpen(true)}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Create Task</span>
          </Button>
        </div>
      </header>

      {/* Global Command Bar */}
      <CommandBar />

      {/* Quick Task Creation Modal */}
      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        projects={[]}
        members={members}
      />
    </>
  );
}
