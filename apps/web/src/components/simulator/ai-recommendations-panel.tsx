'use client';

import React from 'react';
import type { SimulationRecommendation } from '@/lib/queries/simulations';
import { Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';

interface AIRecommendationsPanelProps {
  recommendations: SimulationRecommendation[];
  onApplyRecommendation: (recommendation: SimulationRecommendation) => void;
  isApplying?: boolean;
}

export function AIRecommendationsPanel({
  recommendations,
  onApplyRecommendation,
  isApplying,
}: AIRecommendationsPanelProps) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <Lightbulb className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            AI Optimization Recommendations
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#205743] bg-[#205743]/10 px-2.5 py-0.5 rounded-full border border-[#205743]/20">
          {recommendations.length} Actionable Suggestions
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="rounded-lg border border-[#205743]/30 bg-[#205743]/5 p-4 text-center text-xs text-[#205743]">
            Current scenario is optimal. No critical path adjustments required.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-4 shadow-2xs transition-all hover:border-[#205743]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#252D2A]">
                    {rec.title}
                  </h4>
                  <p className="mt-1 text-xs text-[#5F6863]">
                    <span className="font-semibold text-[#252D2A]">Action: </span>
                    {rec.action}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-md bg-[#205743]/10 border border-[#205743]/20 px-2.5 py-1 text-xs font-bold text-[#205743] shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>{rec.confidenceScore}% Confidence</span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 rounded-md bg-white p-3 border border-[#E4DED4]">
                <div>
                  <span className="text-[11px] font-bold text-[#5F6863] uppercase tracking-wider">
                    Reasoning
                  </span>
                  <p className="mt-0.5 text-xs text-[#252D2A]">
                    {rec.reason}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#205743] uppercase tracking-wider">
                    Expected Improvement
                  </span>
                  <p className="mt-0.5 text-xs text-[#252D2A]">
                    {rec.expectedImprovement}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onApplyRecommendation(rec)}
                  disabled={isApplying}
                  className="flex items-center gap-1.5 rounded-lg bg-[#205743] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#163E32] disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply to Live Project</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

