'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useWorkspaces, useCreateWorkspace } from '@/lib/queries/workspaces';
import { useCurrentUser } from '@/lib/queries/auth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'WORK MANAGEMENT',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        ),
      },
      {
        label: 'Projects',
        href: '/dashboard/projects',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        ),
      },
      {
        label: 'Tasks',
        href: '/dashboard/kanban',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        ),
      },
      {
        label: 'Timeline',
        href: '/dashboard/timeline',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        ),
      },
      {
        label: 'Sprints & Releases',
        href: '/dashboard/sprints',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.58-5.84a14.927 14.927 0 015.84 2.58M6 10.5a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75A.75.75 0 016 10.5z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      {
        label: 'Executive AI',
        href: '/dashboard/executive',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ),
      },
      {
        label: 'AI Simulator',
        href: '/dashboard/simulator',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        ),
      },
      {
        label: 'AI Learning',
        href: '/dashboard/learning',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
          </svg>
        ),
      },
      {
        label: 'AI Meetings',
        href: '/dashboard/meetings',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3V4.5a3 3 0 10-6 0v8.25a3 3 0 003 3z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'KNOWLEDGE & DEVELOPMENT',
    items: [
      {
        label: 'Knowledge Base',
        href: '/dashboard/knowledge',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
          </svg>
        ),
      },
      {
        label: 'Decision Log',
        href: '/dashboard/decisions',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.5H5.25A2.25 2.25 0 003 6.75v10.5a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 17.25V6.75a2.25 2.25 0 00-2.25-2.25z" />
          </svg>
        ),
      },
      {
        label: 'GitHub & Code',
        href: '/dashboard/github',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        ),
      },
      {
        label: 'Release Notes',
        href: '/dashboard/releases',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      {
        label: 'Documents',
        href: '/dashboard/documents',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.992l1.005.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId);
  const setSelectedWorkspaceId = useAppStore((s) => s.setSelectedWorkspaceId);
  const logout = useAppStore((s) => s.logout);
  const token = useAppStore((s) => s.token);
  const { toast } = useToast();

  const { data: wsData, refetch: refetchWs } = useWorkspaces();
  const { data: userData } = useCurrentUser(!!token);
  const createWsMutation = useCreateWorkspace();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  const workspaces = useMemo(() => wsData?.workspaces || [], [wsData?.workspaces]);

  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [selectedWorkspaceId, workspaces, setSelectedWorkspaceId]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const res = await createWsMutation.mutateAsync({ name: newWsName, description: newWsDesc });
      await refetchWs();
      const createdWs = res?.workspace;
      if (createdWs?.id) {
        setSelectedWorkspaceId(createdWs.id);
      }
      setIsModalOpen(false);
      setNewWsName('');
      setNewWsDesc('');
      toast(`Workspace "${createdWs?.name || newWsName}" was created successfully.`, 'success');
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Could not create workspace.';
      toast(errMsg, 'error');
    }
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[#E2DCD2] bg-[#F0EEE6] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2DCD2] bg-white/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-sm font-bold text-white shadow-xs">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#1C2421]">CollabAI</span>
            <span className="text-[10px] text-[#525B56] -mt-1 font-medium">Enterprise Platform</span>
          </div>
        </div>
        <span className="rounded-full bg-[#1F4D3A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1F4D3A] border border-[#1F4D3A]/20">
          v2.4
        </span>
      </div>

      {/* Workspace Selector */}
      <div className="px-3.5 py-3 space-y-2 border-b border-[#E2DCD2]/70 bg-white/30">
        <div className="relative">
          <select
            id="workspace-select"
            data-testid="workspace-select"
            value={selectedWorkspaceId || ''}
            onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
            className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs font-semibold text-[#1C2421] shadow-xs focus:border-[#1F4D3A] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] appearance-none cursor-pointer pr-8"
          >
            <option value="">All Workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#525B56]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 rounded-lg border border-dashed border-[#1F4D3A]/40 bg-[#1F4D3A]/5 py-1.5 text-[11px] font-bold text-[#1F4D3A] hover:bg-[#1F4D3A]/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            + New Workspace
          </button>
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-[#E2DCD2] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1C2421] hover:bg-[#F0EEE6] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Manage Workspace Members"
          >
            <Users className="h-3.5 w-3.5 text-[#1F4D3A]" />
          </Link>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 space-y-4 px-3 py-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold tracking-wider uppercase text-[#525B56]">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href === '/dashboard/kanban' && pathname === '/dashboard/tasks');
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    prefetch={true}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1F4D3A] text-white shadow-xs'
                        : 'text-[#525B56] hover:text-[#1C2421] hover:bg-[#E2DCD2]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-[#C89B3C]' : 'text-[#525B56]'}>{item.icon}</span>
                      <span className="tracking-tight">{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C89B3C]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-[#E2DCD2] px-4 py-3 bg-white/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#163E32] text-xs font-bold text-white shadow-xs">
              {userData?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-[#1C2421]">
                {userData?.user?.name || userData?.user?.email || 'Enterprise User'}
              </span>
              <span className="truncate text-[10px] font-medium text-[#525B56]">
                {workspaces.find((w) => w.id === selectedWorkspaceId)?.name || 'Default Workspace'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-[#525B56] hover:bg-[#E2DCD2]/50 hover:text-[#C96B4A] transition-colors cursor-pointer"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2421]/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
              <h3 className="text-base font-bold text-[#1C2421]">Create New Workspace</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#525B56] font-bold cursor-pointer hover:text-[#1C2421]">✕</button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1C2421] mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Engineering Team"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs focus:border-[#1F4D3A] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C2421] mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Workspace description..."
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs focus:border-[#1F4D3A] focus:outline-none"
                  rows={2}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={!!createWsMutation?.isPending}>
                  Create Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

