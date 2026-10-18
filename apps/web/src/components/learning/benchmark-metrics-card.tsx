'use client';

import React from 'react';
import type { ImprovementDashboardMetrics } from '@/lib/queries/learning';
import { TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react';

interface BenchmarkMetricsCardProps {
  metrics: ImprovementDashboardMetrics;
}

export function BenchmarkMetricsCard({ metrics }: BenchmarkMetricsCardProps) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Workspace Improvement Dashboard & Benchmarks
          </h3>
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#205743]/10 text-[#205743] border border-[#205743]/20">
          Continuous Learning Engine
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[#F7F5F0] p-3.5 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Project Success Rate</span>
          <p className="mt-0.5 text-lg font-extrabold text-[#205743]">
            {metrics.projectSuccessRate}%
          </p>
        </div>

        <div className="rounded-lg bg-[#F7F5F0] p-3.5 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Avg Sprint Velocity</span>
          <p className="mt-0.5 text-lg font-extrabold text-[#252D2A]">
            {metrics.avgSprintVelocity} Tasks
          </p>
        </div>

        <div className="rounded-lg bg-[#F7F5F0] p-3.5 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Knowledge Items</span>
          <p className="mt-0.5 text-lg font-extrabold text-[#205743]">
            {metrics.knowledgeGrowthCount} Indexed
          </p>
        </div>

        <div className="rounded-lg bg-[#F7F5F0] p-3.5 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Improvement Trend</span>
          <p className="mt-0.5 text-lg font-extrabold text-[#205743]">
            ↗ +14% QoQ
          </p>
        </div>
      </div>

      {/* Risks & Blockers Side by Side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Most Common Risks */}
        <div className="rounded-lg border border-[#D4A545]/30 bg-[#D4A545]/5 p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D4A545]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
              Most Common Project Risks
            </h4>
          </div>
          <div className="space-y-1.5">
            {metrics.mostCommonRisks.map((risk, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-medium text-[#252D2A]"
              >
                <span>{risk.risk}</span>
                <span className="font-bold bg-[#D4A545]/15 border border-[#D4A545]/30 px-2 py-0.5 rounded text-[10px] text-[#8A661C]">
                  {risk.frequency}x Occurred
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recurring Blockers */}
        <div className="rounded-lg border border-[#C56D4B]/30 bg-[#C56D4B]/5 p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#C56D4B]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
              Recurring Bottlenecks & Blockers
            </h4>
          </div>
          <div className="space-y-1.5">
            {metrics.recurringBlockers.map((blk, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-medium text-[#252D2A]"
              >
                <span>{blk.blocker}</span>
                <span className="font-bold bg-[#C56D4B]/15 border border-[#C56D4B]/30 px-2 py-0.5 rounded text-[10px] text-[#C56D4B]">
                  {blk.count}x Blocked
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

