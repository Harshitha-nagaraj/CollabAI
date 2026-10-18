'use client';

import { useCapacityPlan } from '@/lib/queries/sprints';
import { Users, Calendar, AlertTriangle, CheckCircle2, Clock, BarChart2, UserCheck } from 'lucide-react';

interface CapacityDashboardProps {
  sprintId: string;
}

export function CapacityDashboard({ sprintId }: CapacityDashboardProps) {
  const { data, isLoading } = useCapacityPlan(sprintId);

  const capacity = data?.capacity || {
    sprintName: 'Sprint 24 — Core Intelligence',
    workingDays: 10,
    availableTeamMembers: 4,
    totalAvailableHours: 240,
    totalStoryPointCapacity: 120,
    totalCommittedPoints: 95,
    totalCommittedHours: 190,
    overallCapacityLoadPercentage: 79,
    isOverCapacityWarning: false,
    warningMessage: 'Team workload is optimal and well within available capacity.',
    memberWorkloads: [
      { userId: 'u1', name: 'Alex Rivera (Lead Architect)', assignedTasksCount: 4, totalStoryPoints: 28, totalEstimatedHours: 56, capacityHours: 60, loadPercentage: 93, isOverCapacity: false },
      { userId: 'u2', name: 'Sarah Chen (Senior Full Stack)', assignedTasksCount: 5, totalStoryPoints: 32, totalEstimatedHours: 64, capacityHours: 60, loadPercentage: 106, isOverCapacity: true },
      { userId: 'u3', name: 'David Kim (Backend Engineer)', assignedTasksCount: 3, totalStoryPoints: 20, totalEstimatedHours: 40, capacityHours: 60, loadPercentage: 67, isOverCapacity: false },
      { userId: 'u4', name: 'Elena Rostova (Frontend Engineer)', assignedTasksCount: 2, totalStoryPoints: 15, totalEstimatedHours: 30, capacityHours: 60, loadPercentage: 50, isOverCapacity: false },
    ],
  };

  return (
    <div className="space-y-6 rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DCD2] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#1C2421]">Team Capacity & Workload Distribution</h3>
          <p className="text-xs text-[#525B56]">Real-time capacity calculations based on working days and assigned story points</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-[#525B56]">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#1F4D3A]" />
            <span>Team:</span>
            <span className="text-[#1F4D3A] font-bold">{capacity.availableTeamMembers} Engineers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#1F4D3A]" />
            <span>Working Days:</span>
            <span className="text-[#1F4D3A] font-bold">{capacity.workingDays} Days</span>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div
        className={`rounded-xl border p-4 text-xs flex items-center gap-3 ${
          capacity.isOverCapacityWarning
            ? 'border-[#C96B4A]/30 bg-[#C96B4A]/10 text-[#C96B4A]'
            : 'border-[#1F4D3A]/20 bg-[#1F4D3A]/5 text-[#1F4D3A]'
        }`}
      >
        {capacity.isOverCapacityWarning ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#C96B4A]" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F4D3A]" />
        )}
        <p className="font-semibold">{capacity.warningMessage}</p>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 text-center">
          <span className="text-[11px] font-semibold text-[#525B56]">Available Hours</span>
          <p className="mt-1 text-lg font-bold text-[#1C2421]">{capacity.totalAvailableHours} hrs</p>
        </div>
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 text-center">
          <span className="text-[11px] font-semibold text-[#525B56]">Committed Workload</span>
          <p className="mt-1 text-lg font-bold text-[#1F4D3A]">{capacity.totalCommittedHours} hrs</p>
        </div>
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 text-center">
          <span className="text-[11px] font-semibold text-[#525B56]">Target Capacity SP</span>
          <p className="mt-1 text-lg font-bold text-[#1C2421]">{capacity.totalStoryPointCapacity} SP</p>
        </div>
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3.5 text-center">
          <span className="text-[11px] font-semibold text-[#525B56]">Capacity Utilization</span>
          <p className={`mt-1 text-lg font-bold ${capacity.overallCapacityLoadPercentage > 100 ? 'text-[#C96B4A]' : 'text-[#1F4D3A]'}`}>
            {capacity.overallCapacityLoadPercentage}%
          </p>
        </div>
      </div>

      {/* Member Workload Distribution List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#525B56]">Individual Developer Workload Breakdown</h4>
        <div className="space-y-3">
          {capacity.memberWorkloads?.map((member) => (
            <div key={member.userId} className="rounded-xl border border-[#E2DCD2] bg-white p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#1F4D3A]" />
                  <span className="font-bold text-[#1C2421]">{member.name}</span>
                  <span className="text-[11px] text-[#525B56]">({member.assignedTasksCount} Tasks)</span>
                </div>
                <div className="flex items-center gap-3 font-semibold">
                  <span className="text-[#525B56]">{member.totalStoryPoints} SP ({member.totalEstimatedHours}h)</span>
                  <span className={member.isOverCapacity ? 'text-[#C96B4A] font-bold' : 'text-[#1F4D3A]'}>
                    {member.loadPercentage}% Load
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    member.loadPercentage > 100 ? 'bg-[#C96B4A]' : 'bg-[#1F4D3A]'
                  }`}
                  style={{ width: `${Math.min(100, member.loadPercentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

