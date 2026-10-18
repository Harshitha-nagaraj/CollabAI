'use client';

import React from 'react';
import type { EngineeringAnalyticsData } from '@/lib/queries/github';
import { GitPullRequest, CheckCircle2, Activity, ShieldAlert, AlertTriangle, FileCode } from 'lucide-react';

interface Props {
  analytics?: EngineeringAnalyticsData;
}

export function EngineeringAnalytics({ analytics }: Props) {
  const data = analytics || {
    connectedRepositoriesCount: 3,
    openPullRequestsCount: 4,
    mergedPullRequestsCount: 18,
    reviewQueueCount: 2,
    deploymentStatus: 'PRODUCTION_HEALTHY',
    codeHealthScore: 94,
    sprintCompletionPercentage: 78,
    codeDependencyAnalysis: {
      openPRCount: 4,
      conflictRiskScore: 35,
      potentialConflicts: [
        {
          prA: '#101 (Backend Auth API)',
          prB: '#102 (User Profile Module)',
          file: 'apps/api/prisma/schema.prisma',
          risk: 'Both PRs modify central Prisma schema. Rebase PR #102 onto main after PR #101 merges.',
        },
      ],
      blockedTasksCount: 1,
      projectImpact: 'Moderate risk on backend database schema merge. Rebase recommended.',
    },
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Open Pull Requests */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">
              Open Pull Requests
            </span>
            <GitPullRequest className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#1C2421]">
              {data.openPullRequestsCount}
            </span>
            <span className="rounded-md bg-[#F0EEE6] px-2 py-0.5 text-[10px] font-semibold text-[#1F4D3A]">
              In Review
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-[#525B56]">
            {data.reviewQueueCount} awaiting review
          </span>
        </div>

        {/* Merged PRs */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">
              Merged PRs (Sprint)
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#1C2421]">
              {data.mergedPullRequestsCount}
            </span>
            <span className="rounded-md bg-[#F0EEE6] px-2 py-0.5 text-[10px] font-semibold text-[#1F4D3A]">
              Completed
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-[#525B56]">
            {data.sprintCompletionPercentage}% Sprint Completion
          </span>
        </div>

        {/* Code Health Score */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">
              Code Health Score
            </span>
            <ShieldAlert className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#1C2421]">
              {data.codeHealthScore}%
            </span>
            <span className="rounded-md bg-[#E8F3EE] px-2 py-0.5 text-[10px] font-semibold text-[#1F4D3A]">
              Optimal
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-[#525B56]">
            High coverage & low vulnerability
          </span>
        </div>

        {/* Deployment Status */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">
              Deployment Status
            </span>
            <Activity className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1F4D3A]">
              HEALTHY
            </span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#1F4D3A] animate-pulse" />
          </div>
          <span className="mt-2 block text-[11px] text-[#525B56]">
            Production v1.2.0 Active
          </span>
        </div>
      </div>

      {/* Code Dependency & Conflict Risk Analysis */}
      <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#C96B4A]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">
              Code Dependency & Conflict Risk Analyzer
            </h3>
          </div>
          <span className="rounded-md bg-[#FDF2EE] border border-[#FADCD0] px-2.5 py-0.5 text-[11px] font-semibold text-[#C96B4A]">
            {data.codeDependencyAnalysis.conflictRiskScore}% Risk Level
          </span>
        </div>

        <div className="mt-3 space-y-3">
          <p className="text-xs text-[#525B56]">
            <strong className="text-[#1C2421]">Project Impact:</strong> {data.codeDependencyAnalysis.projectImpact}
          </p>

          {data.codeDependencyAnalysis.potentialConflicts.map((conf, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3 text-xs"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between font-medium text-[#1C2421]">
                <span className="font-semibold text-[#1C2421]">
                  Potential Branch Collision: {conf.prA} &bull; {conf.prB}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#C96B4A] bg-white px-2 py-0.5 rounded border border-[#E2DCD2]">
                  <FileCode className="h-3 w-3" />
                  {conf.file}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-[#525B56] leading-relaxed">{conf.risk}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

