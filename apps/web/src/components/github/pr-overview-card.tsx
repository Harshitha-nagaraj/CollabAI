'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { PullRequestItem } from '@/lib/queries/github';
import { GitPullRequest, Sparkles, ShieldCheck, Link2, ExternalLink, GitBranch } from 'lucide-react';

interface Props {
  pullRequests: PullRequestItem[];
  onSummarizePR: (prId: string) => void;
  isSummarizing?: boolean;
}

export function PROverviewCard({ pullRequests, onSummarizePR, isSummarizing }: Props) {
  const getStateBadge = (state: string) => {
    switch (state) {
      case 'MERGED':
        return 'bg-[#F0EEE6] text-[#1F4D3A] border-[#E2DCD2]';
      case 'CLOSED':
        return 'bg-[#F5F3EB] text-[#525B56] border-[#E2DCD2]';
      default:
        return 'bg-[#E8F3EE] text-[#1F4D3A] border-[#C2DFD3]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <GitPullRequest className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-[#1C2421]">Pull Request Code Intelligence</h3>
        </div>
        <span className="text-xs font-semibold text-[#525B56]">{pullRequests.length} Total PRs</span>
      </div>

      {/* PR Cards List */}
      <div className="space-y-3">
        {pullRequests.map((pr) => (
          <div
            key={pr.id}
            className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs transition-all hover:border-[#1F4D3A]/40"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getStateBadge(pr.state)}`}>
                  {pr.state}
                </span>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C2421] hover:text-[#1F4D3A]"
                >
                  #{pr.number} {pr.title}
                  <ExternalLink className="h-3 w-3 text-[#525B56]" />
                </a>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#525B56]">
                <span>By @{pr.author}</span>
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1 font-mono bg-[#F7F5F0] border border-[#E2DCD2] px-2 py-0.5 rounded text-[#1C2421]">
                  <GitBranch className="h-3 w-3 text-[#525B56]" />
                  {pr.headBranch} &rarr; {pr.baseBranch}
                </span>
              </div>
            </div>

            {/* AI PR Summary Box */}
            <div className="mt-3 rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1F4D3A]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Pull Request Intelligence Summary
                </div>
                {!pr.aiSummary && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSummarizePR(pr.id)}
                    loading={isSummarizing}
                    className="bg-[#1F4D3A] text-[11px] text-white hover:bg-[#163E32] h-7 px-2.5"
                  >
                    Summarize PR
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-[#525B56] leading-relaxed">
                {pr.aiSummary || 'AI analysis ready. Click summarize to analyze code diffs, security notes, and risks.'}
              </p>

              {pr.securityNotes && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1F4D3A]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1F4D3A]" />
                  Security: {pr.securityNotes}
                </div>
              )}
            </div>

            {/* Task Link & Details */}
            {pr.task && (
              <div className="mt-3 flex items-center justify-between border-t border-[#E2DCD2]/60 pt-2 text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold text-[#1F4D3A]">
                  <Link2 className="h-3.5 w-3.5" />
                  Auto-Linked Task: {pr.task.title}
                </span>
                <span className="rounded bg-[#F0EEE6] border border-[#E2DCD2] px-2 py-0.5 text-[10px] font-bold text-[#1C2421]">
                  Status: {pr.task.status}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

