'use client';

import React from 'react';
import type { AIExecutiveSummary } from '@/lib/queries/simulations';

interface ExecutiveSummaryBannerProps {
  summary: AIExecutiveSummary;
}

export function ExecutiveSummaryBanner({ summary }: ExecutiveSummaryBannerProps) {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-[#C56D4B]/15 text-[#C56D4B] border-[#C56D4B]/30';
      case 'MEDIUM':
        return 'bg-[#D4A545]/15 text-[#9E731D] border-[#D4A545]/30';
      default:
        return 'bg-[#205743]/10 text-[#205743] border-[#205743]/25';
    }
  };

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E4DED4] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-white text-xs font-bold shadow-xs">
              📊
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#205743]">
              AI Executive Summary
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-[#252D2A]">
            Simulation Result: {summary.scenarioTitle}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#F7F5F0] px-3 py-1 border border-[#E4DED4] text-xs">
            <span className="text-[#5F6863]">Confidence: </span>
            <span className="font-bold text-[#205743]">{summary.confidenceScore}%</span>
          </div>

          <span
            className={`rounded-lg border px-3 py-1 text-xs font-bold ${getBadgeStyle(
              summary.riskLevel
            )}`}
          >
            Risk Level: {summary.riskLevel}
          </span>
        </div>
      </div>

      <p className="text-xs text-[#252D2A] leading-relaxed font-medium bg-[#F7F5F0]/60 p-3 rounded-lg border border-[#E4DED4]">
        {summary.summaryText}
      </p>

      {summary.bulletPoints.length > 0 && (
        <div className="rounded-lg bg-white p-3.5 border border-[#E4DED4]">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863] mb-2">
            AI Impact Analysis Highlights
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2 text-xs text-[#252D2A]">
            {summary.bulletPoints.map((bp, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#205743] font-bold">›</span>
                <span>{bp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
