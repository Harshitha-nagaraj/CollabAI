'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GitHubRepo } from '@/lib/queries/github';
import { FolderGit2, GitBranch, ExternalLink, Plus } from 'lucide-react';

interface Props {
  repositories: GitHubRepo[];
  onConnectRepo: (fullName: string) => void;
  isConnecting?: boolean;
}

export function RepoConnectCard({ repositories, onConnectRepo, isConnecting }: Props) {
  const [repoInput, setRepoInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;
    onConnectRepo(repoInput.trim());
    setRepoInput('');
  };

  return (
    <div className="space-y-4">
      {/* Connect Repo Form Header */}
      <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-[#E2DCD2] pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <FolderGit2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C2421]">Connect GitHub Repository</h3>
            <p className="text-xs text-[#525B56]">Synchronize issues, pull requests, commits, and releases automatically.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="e.g. owner/repository-name (or collabai/core)"
            className="flex-1 rounded-lg border border-[#E2DCD2] bg-white px-3.5 py-2 text-xs font-medium text-[#1C2421] placeholder-[#525B56]/60 focus:outline-none focus:border-[#1F4D3A] focus:ring-1 focus:ring-[#1F4D3A]"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isConnecting}
            className="bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32] gap-1 px-4"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect Repo
          </Button>
        </form>
      </div>

      {/* Connected Repositories Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="flex items-center justify-between rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs transition-all hover:border-[#1F4D3A]/40"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F7F5F0] border border-[#E2DCD2] text-[#1F4D3A]">
                <GitBranch className="h-4 w-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-xs font-bold text-[#1C2421]">{repo.fullName}</h4>
                  <span className="rounded bg-[#F0EEE6] border border-[#E2DCD2] px-1.5 py-0.5 text-[9px] font-bold text-[#525B56]">
                    {repo.isPrivate ? 'PRIVATE' : 'PUBLIC'}
                  </span>
                </div>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F4D3A] hover:underline mt-0.5"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#1F4D3A] bg-[#E8F3EE] px-2 py-0.5 rounded border border-[#C2DFD3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1F4D3A] animate-pulse" />
              SYNCED
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

