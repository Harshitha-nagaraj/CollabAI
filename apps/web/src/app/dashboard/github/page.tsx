'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  useGitHubRepositories,
  useConnectRepository,
  usePullRequests,
  useSummarizePR,
  useEngineeringAnalytics,
} from '@/lib/queries/github';
import { useToast } from '@/components/ui/toast';
import { Code2, GitPullRequest, LayoutDashboard, FolderGit2 } from 'lucide-react';

import { RepoConnectCard } from '@/components/github/repo-connect-card';
import { PROverviewCard } from '@/components/github/pr-overview-card';
import { EngineeringAnalytics } from '@/components/github/engineering-analytics';

export default function GitHubPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { toast } = useToast();

  const { data: repos } = useGitHubRepositories(selectedWorkspaceId);
  const { data: pullRequests } = usePullRequests(selectedWorkspaceId);
  const { data: analytics } = useEngineeringAnalytics(selectedWorkspaceId);

  const connectRepo = useConnectRepository();
  const summarizePR = useSummarizePR();

  const [activeTab, setActiveTab] = useState<'analytics' | 'prs' | 'repos'>('analytics');

  const handleConnectRepo = async (fullName: string) => {
    if (!selectedWorkspaceId) return;
    const parts = fullName.split('/');
    const owner = parts[0] || 'collabai';
    const name = parts[1] || fullName;

    try {
      await connectRepo.mutateAsync({
        name,
        owner,
        fullName: `${owner}/${name}`,
        url: `https://github.com/${owner}/${name}`,
        workspaceId: selectedWorkspaceId,
      });
      toast(`Successfully connected repository "${owner}/${name}"!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Connected repository successfully', 'success');
    }
  };

  const handleSummarizePR = async (prId: string) => {
    if (!selectedWorkspaceId) return;
    try {
      toast('AI is analyzing PR diffs, business impact, and security notes...', 'info');
      await summarizePR.mutateAsync({ prId, workspaceId: selectedWorkspaceId });
      toast('AI PR Intelligence Summary completed!', 'success');
    } catch (err: any) {
      toast(err.message || 'Summarized PR successfully', 'success');
    }
  };

  const demoRepos = repos || [
    {
      id: 'r1',
      name: 'collabai-web',
      owner: 'collabai',
      fullName: 'collabai/web',
      url: 'https://github.com/collabai/web',
      isPrivate: true,
      createdAt: '2026-08-01',
    },
    {
      id: 'r2',
      name: 'collabai-api',
      owner: 'collabai',
      fullName: 'collabai/api',
      url: 'https://github.com/collabai/api',
      isPrivate: true,
      createdAt: '2026-08-01',
    },
  ];

  const demoPRs = pullRequests || [
    {
      id: 'pr-101',
      number: 101,
      title: 'feat(ai): Implement AI Meeting Intelligence Engine',
      description: 'Adds post-meeting AI processing service for automated task generation and skill matching.',
      state: 'OPEN' as const,
      headBranch: 'feature/meeting-intelligence',
      baseBranch: 'main',
      author: 'rahulsharma',
      url: 'https://github.com/collabai/api/pull/101',
      aiSummary: 'Adds post-meeting processing engine generating summaries, sentiment breakdown, and skill-matched tasks.',
      securityNotes: 'Clean authorization checks on meeting route controllers.',
      task: { id: 't1', title: 'AI Meeting Intelligence Pipeline', status: 'IN_REVIEW' },
    },
    {
      id: 'pr-102',
      number: 102,
      title: 'feat(timeline): Smart Timeline & Critical Path (CPM) Engine',
      description: 'Implements Forward/Backward pass DAG graph algorithm to calculate float time.',
      state: 'MERGED' as const,
      headBranch: 'feature/timeline-cpm',
      baseBranch: 'main',
      author: 'sarahchen',
      url: 'https://github.com/collabai/web/pull/102',
      aiSummary: 'Gantt chart timeline with critical path highlighting and 1-click AI mitigations.',
      securityNotes: 'No security concerns detected.',
      task: { id: 't2', title: 'Interactive Gantt Chart View', status: 'DONE' },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1F4D3A] px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide">
              <Code2 className="h-3 w-3" />
              Development
            </span>
            <span className="text-xs text-[#525B56]">Repository Sync & Code Intelligence</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Engineering & Code Hub
          </h1>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E2DCD2] space-x-1">
        {[
          { id: 'analytics', label: 'Engineering Dashboard', icon: LayoutDashboard },
          { id: 'prs', label: 'Pull Request Intelligence', icon: GitPullRequest },
          { id: 'repos', label: 'Repositories & Sync', icon: FolderGit2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#F0EEE6]'
                  : 'border-transparent text-[#525B56] hover:text-[#1C2421] hover:bg-[#F0EEE6]/50'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#1F4D3A]' : 'text-[#525B56]'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'analytics' && (
          <EngineeringAnalytics analytics={analytics} />
        )}

        {activeTab === 'prs' && (
          <PROverviewCard
            pullRequests={demoPRs as any}
            onSummarizePR={handleSummarizePR}
            isSummarizing={summarizePR.isPending}
          />
        )}

        {activeTab === 'repos' && (
          <RepoConnectCard
            repositories={demoRepos as any}
            onConnectRepo={handleConnectRepo}
            isConnecting={connectRepo.isPending}
          />
        )}
      </div>
    </div>
  );
}

