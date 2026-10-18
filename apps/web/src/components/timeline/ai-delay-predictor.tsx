'use client';

import React from 'react';
import type { MilestoneForecast } from '@/lib/queries/timeline';
import { Flag, AlertTriangle, Calendar, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  delayRiskScore: number;
  overallStatus: 'ON_TRACK' | 'AT_RISK' | 'HIGH_DELAY_RISK';
  originalTargetDate: string;
  predictedCompletionDate: string;
  delayDays: number;
  criticalPathLengthDays: number;
  delayedMilestones: MilestoneForecast[];
  sprintRisks: string[];
}

export function AIDelayPredictor({
  delayRiskScore,
  overallStatus,
  originalTargetDate,
  predictedCompletionDate,
  delayDays,
  criticalPathLengthDays,
  delayedMilestones,
  sprintRisks,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Risk Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Risk Score Gauge */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">AI Delay Risk Score</span>
            <ShieldAlert className="h-4 w-4 text-[#C96B4A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#C96B4A]">{delayRiskScore}%</span>
            <span className="rounded-md bg-[#FDF2EE] border border-[#FADCD0] px-2 py-0.5 text-[10px] font-bold text-[#C96B4A]">
              {overallStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#525B56]">Synthesized from Critical Path & Workload</p>
        </div>

        {/* Original Target Date */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">Original Target Date</span>
            <Calendar className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <p className="mt-2 text-base font-bold text-[#1C2421]">{originalTargetDate}</p>
          <span className="mt-2 block text-[11px] text-[#525B56]">Baseline Schedule</span>
        </div>

        {/* Forecasted Completion */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">AI Forecasted Completion</span>
            <Clock className="h-4 w-4 text-[#C96B4A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-bold text-[#C96B4A]">{predictedCompletionDate}</span>
            <span className="rounded-md bg-[#FDF2EE] border border-[#FADCD0] px-2 py-0.5 text-[10px] font-bold text-[#C96B4A]">
              {delayDays > 0 ? `+${delayDays}d Delay` : 'On Schedule'}
            </span>
          </div>
          <span className="mt-2 block text-[11px] text-[#525B56]">Milestone delay risk</span>
        </div>

        {/* Critical Path Duration */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525B56]">Critical Path Duration</span>
            <Clock className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#1F4D3A]">
            {criticalPathLengthDays} Days
          </p>
          <span className="mt-2 block text-[11px] text-[#525B56]">Zero-Slack Sequence</span>
        </div>
      </div>

      {/* Delayed Milestones Table & Sprint Risks */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delayed Milestones */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2DCD2] pb-3">
            <Flag className="h-4 w-4 text-[#C89B3C]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">
              Delayed Milestones Forecast
            </h3>
          </div>

          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {delayedMilestones.length === 0 ? (
              <p className="p-4 text-center text-xs text-[#525B56]">All milestones are currently on track.</p>
            ) : (
              delayedMilestones.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C2421]">{m.title}</span>
                    <span className="rounded bg-[#FDF2EE] border border-[#FADCD0] px-2 py-0.5 text-[10px] font-bold text-[#C96B4A]">
                      +{m.delayDays}d Delay
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#525B56]">
                    <span>Target: {m.originalDueDate}</span>
                    <span>&rarr;</span>
                    <span className="font-semibold text-[#C96B4A]">Expected: {m.predictedDueDate}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#525B56] leading-relaxed">{m.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sprint Risks */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#E2DCD2] pb-3">
            <AlertTriangle className="h-4 w-4 text-[#C96B4A]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C96B4A]">
              Active Sprint Bottlenecks
            </h3>
          </div>

          <div className="mt-3 space-y-2">
            {sprintRisks.map((risk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-[#FADCD0] bg-[#FDF2EE] p-3 text-xs text-[#1C2421]"
              >
                <AlertTriangle className="h-4 w-4 text-[#C96B4A] shrink-0 mt-0.5" />
                <span className="text-[11px] text-[#525B56] leading-relaxed">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

