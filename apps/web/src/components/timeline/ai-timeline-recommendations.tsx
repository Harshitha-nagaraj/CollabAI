'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { TimelineRecommendation } from '@/lib/queries/timeline';
import { Sparkles, Zap, Target } from 'lucide-react';

interface Props {
  recommendations: TimelineRecommendation[];
  onApplyMitigation: (rec: TimelineRecommendation) => void;
  isApplying?: boolean;
}

export function AITimelineRecommendations({ recommendations, onApplyMitigation, isApplying }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C2421]">AI Recommended Timeline Mitigations</h3>
            <p className="text-xs text-[#525B56]">
              One-click timeline adjustments to recover delayed milestones and balance critical path workload.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="flex flex-col justify-between rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs transition-all hover:border-[#1F4D3A]/40"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded border border-[#E2DCD2] bg-[#F0EEE6] px-2 py-0.5 text-[10px] font-bold text-[#1C2421] uppercase tracking-wider">
                  {rec.type.replace(/_/g, ' ')}
                </span>
                <span className="rounded bg-[#E8F3EE] border border-[#C2DFD3] px-2.5 py-0.5 text-[10px] font-bold text-[#1F4D3A]">
                  {rec.impactScore} Impact Score
                </span>
              </div>

              <h4 className="mt-3 text-sm font-bold text-[#1C2421] leading-snug">{rec.title}</h4>
              <p className="mt-1.5 text-xs text-[#525B56] leading-relaxed">{rec.description}</p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#E2DCD2]/60 pt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F4D3A] truncate max-w-[200px]">
                <Target className="h-3 w-3 text-[#1F4D3A]" />
                Target: {rec.targetTaskTitle}
              </span>

              <Button
                variant="primary"
                size="sm"
                onClick={() => onApplyMitigation(rec)}
                loading={isApplying}
                className="bg-[#1F4D3A] text-xs text-white hover:bg-[#163E32] gap-1 px-3 h-7"
              >
                <Zap className="h-3 w-3" />
                Apply Mitigation
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

