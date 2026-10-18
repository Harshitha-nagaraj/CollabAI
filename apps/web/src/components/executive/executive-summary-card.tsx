'use client';

import React from 'react';

interface Props {
  greeting: string;
  executiveSummary: string;
  statusMetrics: {
    activeProjects: number;
    atRiskProjects: number;
    sprintCompletionRate: number;
    tasksCompletedYesterday: number;
    criticalBlockersCount: number;
  };
  aiRecommendations: string[];
  onActionRecommendation: (recTitle: string, action: 'ACCEPT' | 'DISMISS') => void;
}

export function ExecutiveSummaryCard({
  greeting,
  executiveSummary,
  statusMetrics,
  aiRecommendations,
  onActionRecommendation,
}: Props) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-6 shadow-xs space-y-6">
      {/* Morning Briefing Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-sm font-bold text-white shadow-xs">
            📊
          </div>
          <h2 className="text-base font-bold text-[#252D2A]">{greeting}</h2>
        </div>
        <p className="mt-2.5 text-xs font-medium text-[#252D2A] leading-relaxed bg-[#F7F5F0] p-3.5 rounded-lg border border-[#E4DED4]">
          {executiveSummary}
        </p>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-[#E4DED4] bg-white p-3 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">Active Projects</span>
          <p className="mt-1 text-xl font-bold text-[#205743]">{statusMetrics.activeProjects}</p>
        </div>

        <div className="rounded-lg border border-[#C56D4B]/30 bg-[#C56D4B]/5 p-3 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C56D4B]">At Risk</span>
          <p className="mt-1 text-xl font-bold text-[#C56D4B]">{statusMetrics.atRiskProjects}</p>
        </div>

        <div className="rounded-lg border border-[#D4A545]/30 bg-[#D4A545]/5 p-3 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E731D]">Sprint Rate</span>
          <p className="mt-1 text-xl font-bold text-[#9E731D]">{statusMetrics.sprintCompletionRate}%</p>
        </div>

        <div className="rounded-lg border border-[#205743]/20 bg-[#205743]/5 p-3 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#205743]">Done Yesterday</span>
          <p className="mt-1 text-xl font-bold text-[#205743]">{statusMetrics.tasksCompletedYesterday}</p>
        </div>

        <div className="rounded-lg border border-[#C56D4B]/30 bg-[#C56D4B]/5 p-3 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C56D4B]">Blockers</span>
          <p className="mt-1 text-xl font-bold text-[#C56D4B]">{statusMetrics.criticalBlockersCount}</p>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-3 pt-3 border-t border-[#E4DED4]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#205743]">
            Strategic Recommendations & Action Items
          </span>
        </div>
        <div className="space-y-2">
          {aiRecommendations.map((rec, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#205743] font-bold text-xs">›</span>
                <span className="text-xs font-medium text-[#252D2A] truncate">{rec}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onActionRecommendation(rec, 'ACCEPT')}
                  className="rounded-md bg-[#205743] px-3 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-[#163E32] transition-colors cursor-pointer"
                >
                  Accept & Apply
                </button>
                <button
                  onClick={() => onActionRecommendation(rec, 'DISMISS')}
                  className="rounded-md border border-[#E4DED4] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5F6863] hover:bg-[#EFEBE3] transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
