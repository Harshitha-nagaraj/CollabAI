'use client';

import React from 'react';

interface Props {
  teamHealthScore: number;
  productivityScore: number;
  burnoutRiskScore: number;
  collaborationScore: number;
  healthSummary: string;
  memberMetrics: Array<{
    userId: string;
    name: string;
    assignedTasksCount: number;
    workloadPercentage: number;
    meetingHoursWeekly: number;
    burnoutRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export function TeamHealthWidget({
  teamHealthScore,
  productivityScore,
  burnoutRiskScore,
  collaborationScore,
  healthSummary,
  memberMetrics,
}: Props) {
  const getBurnoutBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-[#C56D4B]/15 text-[#C56D4B] border-[#C56D4B]/30';
      case 'MEDIUM':
        return 'bg-[#D4A545]/15 text-[#9E731D] border-[#D4A545]/30';
      default:
        return 'bg-[#205743]/10 text-[#205743] border-[#205743]/25';
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-sm text-white font-bold shadow-xs">
            💚
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">Team Health & Workload Distribution</h3>
        </div>
      </div>

      {/* 4 Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[#205743]/20 bg-[#205743]/5 p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#205743]">
            Health Score
          </span>
          <p className="mt-1 text-xl font-bold text-[#205743]">{teamHealthScore}%</p>
        </div>

        <div className="rounded-lg border border-[#205743]/20 bg-white p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">
            Productivity
          </span>
          <p className="mt-1 text-xl font-bold text-[#252D2A]">{productivityScore}%</p>
        </div>

        <div className="rounded-lg border border-[#C56D4B]/20 bg-[#C56D4B]/5 p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C56D4B]">
            Burnout Risk
          </span>
          <p className="mt-1 text-xl font-bold text-[#C56D4B]">{burnoutRiskScore}%</p>
        </div>

        <div className="rounded-lg border border-[#D4A545]/20 bg-[#D4A545]/5 p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E731D]">
            Collaboration
          </span>
          <p className="mt-1 text-xl font-bold text-[#9E731D]">{collaborationScore}%</p>
        </div>
      </div>

      <p className="text-xs text-[#252D2A] bg-[#F7F5F0] p-3 rounded-lg border border-[#E4DED4] leading-relaxed">
        <strong>Health Summary:</strong> {healthSummary}
      </p>

      {/* Member Workload Breakdown */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">Member Workload & Capacity</span>
        <div className="space-y-2">
          {memberMetrics.map((mem) => (
            <div
              key={mem.userId}
              className="flex items-center justify-between rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#252D2A]">{mem.name}</span>
                <span className="text-[#5F6863]">({mem.assignedTasksCount} tasks, {mem.meetingHoursWeekly}h syncs)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full bg-[#E4DED4] overflow-hidden">
                  <div
                    className={`h-full ${mem.workloadPercentage > 80 ? 'bg-[#C56D4B]' : 'bg-[#205743]'}`}
                    style={{ width: `${mem.workloadPercentage}%` }}
                  />
                </div>

                <span className={`rounded border px-2 py-0.5 text-[9px] font-bold ${getBurnoutBadge(mem.burnoutRiskLevel)}`}>
                  {mem.burnoutRiskLevel} RISK
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
