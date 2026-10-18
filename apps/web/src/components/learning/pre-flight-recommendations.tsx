'use client';

import React from 'react';
import type { PreFlightRecommendation } from '@/lib/queries/learning';
import { PlaneTakeoff, Check } from 'lucide-react';

interface PreFlightRecommendationsProps {
  recommendation: PreFlightRecommendation;
}

export function PreFlightRecommendations({ recommendation }: PreFlightRecommendationsProps) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <PlaneTakeoff className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            AI Pre-Flight Project Recommendations
          </h3>
        </div>

        <span className="text-xs font-bold text-[#205743] bg-[#205743]/10 px-2.5 py-0.5 rounded-full border border-[#205743]/20">
          {recommendation.resemblancePercentage}% Resemblance to {recommendation.similarProjectName}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pre-Flight Advice List */}
        <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4] space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#205743]">
            Historical Pre-Flight Guidance
          </h4>
          <ul className="space-y-1.5 text-xs text-[#5F6863]">
            {recommendation.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#205743] shrink-0 mt-0.5" />
                <span className="text-[#252D2A]">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Developer Allocation & Benchmarks */}
        <div className="space-y-3">
          {/* Suggested Dev Allocation */}
          <div className="rounded-lg bg-[#205743]/5 p-3.5 border border-[#205743]/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#205743] mb-2">
              Recommended Team Allocation
            </h4>
            <div className="flex flex-wrap gap-2">
              {recommendation.suggestedDevAllocation.map((alloc, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-[#252D2A] border border-[#E4DED4]"
                >
                  {alloc.count}x {alloc.role}
                </span>
              ))}
            </div>
          </div>

          {/* Task Benchmarks */}
          <div className="rounded-lg bg-[#F7F5F0] p-3.5 border border-[#E4DED4]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F6863] mb-2">
              Historical Task Benchmarks
            </h4>
            <div className="space-y-1.5">
              {recommendation.historicalTaskBenchmarks.map((bm, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-medium text-[#252D2A]"
                >
                  <span>{bm.taskTitle}</span>
                  <span className="font-bold text-[#205743]">~{bm.avgDays} Days</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

