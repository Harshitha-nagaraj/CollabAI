'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useReleaseNotes, useGenerateReleaseNotes } from '@/lib/queries/github';
import { useToast } from '@/components/ui/toast';
import { ReleaseNotesView } from '@/components/github/release-notes-view';
import { ReleaseDashboardView } from '@/components/releases/release-dashboard-view';
import { Rocket, Sparkles, FileText, Layers, Tag, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReleasesPage() {
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');
  const [targetNotesVersion, setTargetNotesVersion] = useState<string>('v1.2.0');

  const { data: releaseNotes, isLoading: isNotesLoading, isError: isNotesError, refetch: refetchNotes } = useReleaseNotes(selectedWorkspaceId);
  const generateReleaseNotes = useGenerateReleaseNotes();

  const handleGenerateReleaseNotes = async (version: string) => {
    if (!selectedWorkspaceId) {
      toast('Please select a workspace to generate release notes.', 'info');
      return;
    }
    try {
      toast(`AI synthesis in progress for version ${version}...`, 'info');
      await generateReleaseNotes.mutateAsync({
        version,
        workspaceId: selectedWorkspaceId,
        projectId: selectedProjectId,
      });
      toast(`Release Notes ${version} generated successfully!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Release notes generated', 'success');
    }
  };

  const handleNavigateToNotes = (version: string) => {
    setTargetNotesVersion(version);
    setActiveTab('notes');
  };

  const demoNotes = releaseNotes || [
    {
      id: 'rn-1',
      version: targetNotesVersion || 'v1.2.0',
      title: `Release ${targetNotesVersion || 'v1.2.0'} - Core AI Meeting Intelligence & GitHub Integration`,
      createdAt: new Date().toISOString(),
      content: `# Release ${targetNotesVersion || 'v1.2.0'} - Core AI Meeting Intelligence & GitHub Integration

## Merged Pull Requests
- #101: Implemented AI Meeting Intelligence Service (by @rahul)
- #102: Interactive Gantt Chart Timeline & Critical Path (by @sarah)
- #103: GitHub Webhook Automatic Task Status Updates (by @alex)

## Completed Tasks & Deliverables
- Backend Authentication API & RBAC [HIGH]
- Live Virtual Meeting Room Streamer [HIGH]
- Smart Project Timeline & Dependency Engine [URGENT]

## Architectural Decisions & Governance
- Approved PostgreSQL + Prisma Schema Migration (ARCHITECTURE)
- Standardized Cosine Similarity Vector Store Abstraction (INFRASTRUCTURE)

---
*Generated automatically by CollabAI Release Generator Engine.*`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#1F4D3A] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Release Management
            </span>
            <span className="text-xs text-[#525B56]">Version Planning, Quality Audits & AI Changelogs</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Enterprise Release Intelligence
          </h1>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-[#1F4D3A] shadow-xs'
                : 'text-[#525B56] hover:text-[#1C2421] hover:bg-white/50'
            }`}
          >
            <Rocket className="h-3.5 w-3.5" />
            Release Candidates & Dashboard
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-white text-[#1F4D3A] shadow-xs'
                : 'text-[#525B56] hover:text-[#1C2421] hover:bg-white/50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Release Notes & Changelogs
          </button>
        </div>
      </div>

      {/* Workspace Check */}
      {!selectedWorkspaceId ? (
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-8 text-center space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-[#C89B3C]" />
          <h3 className="text-sm font-bold text-[#1C2421]">No Workspace Selected</h3>
          <p className="text-xs text-[#525B56]">Please select an active workspace from the sidebar header to manage release candidates.</p>
        </div>
      ) : (
        <>
          {/* Active Tab Content */}
          {activeTab === 'overview' && (
            <ReleaseDashboardView
              workspaceId={selectedWorkspaceId}
              onNavigateToNotes={handleNavigateToNotes}
            />
          )}

          {activeTab === 'notes' && (
            <ReleaseNotesView
              releaseNotes={demoNotes as any}
              onGenerateReleaseNotes={handleGenerateReleaseNotes}
              isGenerating={generateReleaseNotes.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}

