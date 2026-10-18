'use client';

import React from 'react';
import type { ImpactAnalysis } from '@/lib/queries/simulations';
import { ShieldAlert } from 'lucide-react';

interface RiskHeatmapWidgetProps {
  impact: ImpactAnalysis;
}

export function RiskHeatmapWidget({ impact }: RiskHeatmapWidgetProps) {
  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[#C56D4B] text-white';
      case 'HIGH':
        return 'bg-[#D4A545] text-white';
      case 'MEDIUM':
        return 'bg-[#205743]/80 text-white';
      default:
        return 'bg-[#205743] text-white';
    }
  };

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#C56D4B]/10 text-[#C56D4B] text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Risk Assessment & Delivery Confidence
          </h3>
        </div>

        <span
          className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${getRiskBadgeStyle(
            impact.riskLevel
          )}`}
        >
          {impact.riskLevel} RISK LEVEL
        </span>
      </div>

      {/* Confidence Gauge & Cost Variance */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Delivery Confidence */}
        <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F6863]">
              Delivery Confidence Score
            </span>
            <span className="text-base font-extrabold text-[#205743]">
              {impact.deliveryConfidenceScore}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 w-full rounded-full bg-[#E4DED4] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                impact.deliveryConfidenceScore > 80
                  ? 'bg-[#205743]'
                  : impact.deliveryConfidenceScore > 60
                  ? 'bg-[#D4A545]'
                  : 'bg-[#C56D4B]'
              }`}
              style={{ width: `${impact.deliveryConfidenceScore}%` }}
            ></div>
          </div>
        </div>

        {/* Cost Variance */}
        <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F6863]">
              Estimated Cost Impact
            </span>
            <span
              className={`text-base font-extrabold ${
                impact.costEstimation.costDelta > 0
                  ? 'text-[#C56D4B]'
                  : impact.costEstimation.costDelta < 0
                  ? 'text-[#205743]'
                  : 'text-[#252D2A]'
              }`}
            >
              {impact.costEstimation.costDelta > 0 ? '+' : ''}$
              {impact.costEstimation.costDelta.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-[#5F6863] mt-1">
            Simulated Budget: ${impact.costEstimation.simulatedCost.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Matrix */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F6863]">
          Risk Vector Assessment Matrix
        </h4>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-lg bg-[#F7F5F0] border border-[#E4DED4] p-3 text-center">
            <p className="text-[10px] font-semibold text-[#5F6863]">Project Delay</p>
            <p className="mt-1 text-sm font-extrabold text-[#252D2A]">
              +{impact.projectDelayDays} Days
            </p>
          </div>

          <div className="rounded-lg bg-[#F7F5F0] border border-[#E4DED4] p-3 text-center">
            <p className="text-[10px] font-semibold text-[#5F6863]">Blocked Tasks</p>
            <p className="mt-1 text-sm font-extrabold text-[#C56D4B]">
              {impact.blockedTasksCount} Blocked
            </p>
          </div>

          <div className="rounded-lg bg-[#F7F5F0] border border-[#E4DED4] p-3 text-center">
            <p className="text-[10px] font-semibold text-[#5F6863]">Resource Utilization</p>
            <p className="mt-1 text-sm font-extrabold text-[#205743]">
              {impact.resourceUtilizationPercentage}%
            </p>
          </div>

          <div className="rounded-lg bg-[#F7F5F0] border border-[#E4DED4] p-3 text-center">
            <p className="text-[10px] font-semibold text-[#5F6863]">Critical Path Items</p>
            <p className="mt-1 text-sm font-extrabold text-[#D4A545]">
              {impact.criticalPathTaskIds.length} Tasks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

