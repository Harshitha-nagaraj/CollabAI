'use client';

import React from 'react';
import type { WorkloadMember } from '@/lib/queries/simulations';
import { Users } from 'lucide-react';

interface WorkloadDistributionChartProps {
  workloadDistribution: Record<string, WorkloadMember>;
}

export function WorkloadDistributionChart({ workloadDistribution }: WorkloadDistributionChartProps) {
  const members = Object.values(workloadDistribution);

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Team Workload Distribution & Resource Capacity
          </h3>
        </div>

        <span className="text-xs text-[#5F6863] font-medium">
          Sprint Capacity: 80 hrs / member
        </span>
      </div>

      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-xs text-[#8C9590] italic">No member workload data available.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.userId}
              className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-3.5"
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#252D2A]">{m.userName}</span>
                  <span className="rounded bg-[#E4DED4]/60 border border-[#E4DED4] px-2 py-0.5 text-[10px] text-[#5F6863]">
                    {m.role || 'Member'}
                  </span>
                  {m.isOverloaded && (
                    <span className="rounded bg-[#C56D4B]/15 border border-[#C56D4B]/30 px-2 py-0.5 text-[10px] font-bold text-[#C56D4B]">
                      OVERCAPACITY
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#5F6863]">
                    {m.simulatedHours}h allocated / {m.capacityHours}h
                  </span>
                  <span
                    className={`font-bold ${
                      m.isOverloaded ? 'text-[#C56D4B]' : 'text-[#205743]'
                    }`}
                  >
                    {m.utilizationPercentage}% Utilized
                  </span>
                </div>
              </div>

              {/* Progress bar stack */}
              <div className="space-y-1">
                {/* Baseline bar */}
                <div className="flex items-center gap-2">
                  <span className="w-14 text-[10px] font-medium text-[#5F6863]">Baseline</span>
                  <div className="flex-1 h-2 rounded-full bg-[#E4DED4] overflow-hidden">
                    <div
                      className="h-full bg-[#8C9590] rounded-full"
                      style={{ width: `${Math.min(100, (m.baselineHours / m.capacityHours) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Simulated bar */}
                <div className="flex items-center gap-2">
                  <span className="w-14 text-[10px] font-medium text-[#205743]">Simulated</span>
                  <div className="flex-1 h-2 rounded-full bg-[#E4DED4] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        m.isOverloaded ? 'bg-[#C56D4B]' : 'bg-[#205743]'
                      }`}
                      style={{ width: `${Math.min(100, m.utilizationPercentage)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

