'use client';

import { useBurndownAndVelocity } from '@/lib/queries/sprints';
import { TrendingUp, Lightbulb, BarChart2 } from 'lucide-react';

interface BurndownVelocityChartProps {
  sprintId: string;
}

export function BurndownVelocityChart({ sprintId }: BurndownVelocityChartProps) {
  const { data, isLoading } = useBurndownAndVelocity(sprintId);

  const b = data?.burndown || {
    sprintName: 'Sprint 24 — Core Intelligence',
    totalStoryPoints: 48,
    completedStoryPoints: 34,
    remainingStoryPoints: 14,
    completionPercentage: 71,
    currentVelocity: 34,
    averageVelocity: 30,
    velocityExplanation:
      'Velocity increased by +4 points (13%) due to streamlined task dependencies, reduced context switching, and automated PR merge workflows.',
    burndownData: [
      { day: 0, idealPoints: 48, actualPoints: 48 },
      { day: 2, idealPoints: 41, actualPoints: 44 },
      { day: 4, idealPoints: 34, actualPoints: 38 },
      { day: 6, idealPoints: 27, actualPoints: 29 },
      { day: 8, idealPoints: 20, actualPoints: 22 },
      { day: 10, idealPoints: 13, actualPoints: 16 },
      { day: 12, idealPoints: 6, actualPoints: 14 },
      { day: 14, idealPoints: 0, actualPoints: 14 },
    ],
    velocityTrend: [
      { sprintName: 'Sprint 21', velocityPoints: 24 },
      { sprintName: 'Sprint 22', velocityPoints: 28 },
      { sprintName: 'Sprint 23', velocityPoints: 31 },
      { sprintName: 'Sprint 24', velocityPoints: 34 },
    ],
  };

  return (
    <div className="space-y-6 rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DCD2] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#1C2421]">Sprint Burndown & Velocity Analytics</h3>
          <p className="text-xs text-[#525B56]">Ideal vs actual story point trajectory & velocity trends</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-[#1F4D3A]">Done: {b.completedStoryPoints} SP</span>
          <span className="text-[#525B56]">|</span>
          <span className="text-[#C96B4A]">Remaining: {b.remainingStoryPoints} SP</span>
        </div>
      </div>

      {/* Visual Burndown Chart View */}
      <div className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/40 p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[#1C2421]">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#1F4D3A]" />
            <span>Sprint Burndown (Ideal vs Actual)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-[#525B56]">
              <span className="h-2 w-4 rounded-full bg-[#1F4D3A]/40 border border-dashed border-[#1F4D3A]" /> Ideal Drop
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#1F4D3A]">
              <span className="h-2.5 w-4 rounded-full bg-[#1F4D3A]" /> Actual Remaining
            </span>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="grid grid-cols-8 items-end gap-2 h-44 pt-4 border-b border-[#E2DCD2]">
          {b.burndownData.map((pt) => {
            const maxPts = b.totalStoryPoints || 48;
            const actualPct = Math.min(100, Math.round((pt.actualPoints / maxPts) * 100));
            const idealPct = Math.min(100, Math.round((pt.idealPoints / maxPts) * 100));

            return (
              <div key={pt.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-2.5 rounded-t bg-[#1F4D3A]/30 border-t border-dashed border-[#1F4D3A] transition-all"
                    style={{ height: `${idealPct}%` }}
                    title={`Day ${pt.day} Ideal: ${pt.idealPoints} SP`}
                  />
                  <div
                    className="w-3.5 rounded-t bg-[#1F4D3A] transition-all"
                    style={{ height: `${actualPct}%` }}
                    title={`Day ${pt.day} Actual: ${pt.actualPoints} SP`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#525B56]">D{pt.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Velocity Explanation Card */}
      <div className="rounded-xl border border-[#C89B3C]/30 bg-[#C89B3C]/10 p-4 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#9E731D] uppercase tracking-wider text-[11px]">
          <Lightbulb className="h-3.5 w-3.5 text-[#C89B3C]" />
          <span>AI Velocity Insight</span>
        </div>
        <p className="mt-1 font-semibold text-[#1C2421] leading-relaxed">{b.velocityExplanation}</p>
      </div>

      {/* Historical Velocity Trend Bar Chart */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-[#525B56]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#525B56]">Velocity Trend Across Recent Sprints</h4>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {b.velocityTrend.map((v, idx) => (
            <div key={idx} className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/50 p-3 text-center space-y-1">
              <span className="text-[11px] font-semibold text-[#525B56]">{v.sprintName}</span>
              <p className="text-lg font-bold text-[#1F4D3A]">{v.velocityPoints} SP</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

