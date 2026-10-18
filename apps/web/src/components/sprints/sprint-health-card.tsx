'use client';

import { useSprintHealth } from '@/lib/queries/sprints';
import { Activity, ShieldAlert, Users, Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SprintHealthCardProps {
  sprintId: string;
}

export function SprintHealthCard({ sprintId }: SprintHealthCardProps) {
  const { data, isLoading } = useSprintHealth(sprintId);

  const health = data?.health || {
    healthScore: 88,
    healthCategory: 'EXCELLENT',
    overallProgress: 71,
    daysRemaining: 4,
    deadlineRisk: 'LOW',
    workloadBalance: 'OPTIMAL',
    blockedTasksCount: 1,
    meetingFrequency: 'HEALTHY (2.5h / week)',
    teamActivity: 'HIGH (42 code commits / week)',
    metricsBreakdown: {
      deadlineRiskScore: 90,
      workloadBalanceScore: 85,
      blockedTasksScore: 88,
      meetingFrequencyScore: 85,
      teamActivityScore: 95,
    },
  };

  return (
    <div className="space-y-5 rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
      {/* Header & Gauge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#1F4D3A]" />
            <h3 className="text-base font-bold text-[#1C2421]">AI Sprint Health Score</h3>
          </div>
          <p className="text-xs text-[#525B56] mt-0.5">Multi-variable algorithmic evaluation of sprint execution health</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F4D3A] text-white font-bold text-lg shadow-xs">
            {health.healthScore}
          </div>
          <div>
            <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider">{health.healthCategory} HEALTH</span>
            <p className="text-[11px] text-[#525B56]">{health.daysRemaining} Days Remaining in Sprint</p>
          </div>
        </div>
      </div>

      {/* Metric Health Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 space-y-1">
          <div className="flex justify-between font-semibold text-[#525B56]">
            <span>Deadline Risk</span>
            <span className="text-[#1F4D3A] font-bold">{health.metricsBreakdown.deadlineRiskScore}%</span>
          </div>
          <p className="font-bold text-[#1C2421]">Status: {health.deadlineRisk}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 space-y-1">
          <div className="flex justify-between font-semibold text-[#525B56]">
            <span>Workload Balance</span>
            <span className="text-[#1F4D3A] font-bold">{health.metricsBreakdown.workloadBalanceScore}%</span>
          </div>
          <p className="font-bold text-[#1C2421]">Status: {health.workloadBalance}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 space-y-1">
          <div className="flex justify-between font-semibold text-[#525B56]">
            <span>Blocked Tasks</span>
            <span className="text-[#9E731D] font-bold">{health.metricsBreakdown.blockedTasksScore}%</span>
          </div>
          <p className="font-bold text-[#C96B4A]">{health.blockedTasksCount} Blocked Item</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 space-y-1">
          <div className="flex justify-between font-semibold text-[#525B56]">
            <span>Meeting Frequency</span>
            <span className="text-[#1F4D3A] font-bold">{health.metricsBreakdown.meetingFrequencyScore}%</span>
          </div>
          <p className="font-bold text-[#1C2421]">{health.meetingFrequency}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 space-y-1">
          <div className="flex justify-between font-semibold text-[#525B56]">
            <span>Team Activity</span>
            <span className="text-[#1F4D3A] font-bold">{health.metricsBreakdown.teamActivityScore}%</span>
          </div>
          <p className="font-bold text-[#1C2421]">{health.teamActivity}</p>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 space-y-1">
          <div className="flex justify-between font-semibold text-[#525B56]">
            <span>Overall Progress</span>
            <span className="text-[#1F4D3A] font-bold">{health.overallProgress}%</span>
          </div>
          <p className="font-bold text-[#1F4D3A]">71% Deliverables Complete</p>
        </div>
      </div>
    </div>
  );
}

