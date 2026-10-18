'use client';

import React from 'react';

interface Props {
  sprintCompletionProbability: number;
  deliveryConfidenceScore: number;
  forecastedCompletionDate: string;
  productivityTrend: string;
  riskTrend: string;
  riskFactors: string[];
}

export function PredictiveAnalyticsCard({
  sprintCompletionProbability,
  deliveryConfidenceScore,
  forecastedCompletionDate,
  productivityTrend,
  riskTrend,
  riskFactors,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-sm text-white font-bold shadow-xs">
            🔮
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">Predictive Analytics & Delivery Forecast</h3>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#205743]/20 bg-[#205743]/5 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#205743]">
            Delivery Confidence Score
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#205743]">{deliveryConfidenceScore}%</span>
            <span className="text-[10px] font-semibold text-[#205743]">High Confidence</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#D4A545]/30 bg-[#D4A545]/10 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E731D]">
            Sprint Completion Probability
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#9E731D]">{sprintCompletionProbability}%</span>
            <span className="text-[10px] font-semibold text-[#9E731D]">On Schedule</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#205743]/20 bg-[#F7F5F0] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">
            Forecasted Delivery Date
          </span>
          <p className="mt-1 text-lg font-bold text-[#252D2A]">{forecastedCompletionDate}</p>
          <span className="text-[10px] text-[#5F6863]">Based on Critical Path DAG</span>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="space-y-2 pt-2 border-t border-[#E4DED4]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">Forecast Risk Factors</span>
        <div className="space-y-1.5">
          {riskFactors.map((rf, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg bg-[#F7F5F0] p-2.5 text-xs text-[#252D2A] border border-[#E4DED4]">
              <span className="text-[#C56D4B] font-bold">›</span>
              <span>{rf}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
