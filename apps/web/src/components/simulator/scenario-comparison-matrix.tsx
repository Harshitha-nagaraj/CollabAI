'use client';

import React from 'react';
import type { ScenarioComparisonMatrix } from '@/lib/queries/simulations';

interface ScenarioComparisonMatrixProps {
  matrix: ScenarioComparisonMatrix | null;
  isLoading?: boolean;
}

export function ScenarioComparisonMatrixComponent({ matrix, isLoading }: ScenarioComparisonMatrixProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs text-center text-xs text-[#5F6863]">
        Loading scenario comparison matrix...
      </div>
    );
  }

  if (!matrix || matrix.scenarios.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#205743] text-white text-xs font-bold shadow-xs">
            ⚔️
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Scenario Comparison Matrix
          </h3>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#205743]/10 text-[#205743] border border-[#205743]/20">
          Comparing {matrix.scenarios.length} Scenarios
        </span>
      </div>

      {/* AI Recommendation Banner */}
      {matrix.recommendationReason && (
        <div className="rounded-lg border border-[#205743]/20 bg-[#205743]/5 p-3 text-xs text-[#205743]">
          <span className="font-bold">⭐ Recommended Scenario Choice: </span>
          {matrix.recommendationReason}
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-lg border border-[#E4DED4]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E4DED4] bg-[#F7F5F0] text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">
              <th className="p-3">Scenario Name</th>
              <th className="p-3">Completion Date</th>
              <th className="p-3">Risk Level</th>
              <th className="p-3">Workload</th>
              <th className="p-3">Cost Impact</th>
              <th className="p-3">Success Prob.</th>
              <th className="p-3">Key Trade-offs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4DED4]/60">
            {matrix.scenarios.map((sc) => {
              const isRecommended = sc.id === matrix.recommendedScenarioId;

              return (
                <tr
                  key={sc.id}
                  className={`transition-colors ${
                    isRecommended
                      ? 'bg-[#205743]/5 font-medium'
                      : 'hover:bg-[#F7F5F0]/50'
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#252D2A]">{sc.name}</span>
                      {isRecommended && (
                        <span className="rounded bg-[#205743] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          BEST CHOICE
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 font-semibold text-[#252D2A]">
                    {sc.completionDate}{' '}
                    {sc.delayDays > 0 ? (
                      <span className="text-[#C56D4B] font-bold">(+{sc.delayDays}d)</span>
                    ) : (
                      <span className="text-[#205743] font-bold">(On Time)</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        sc.riskLevel === 'CRITICAL' || sc.riskLevel === 'HIGH'
                          ? 'bg-[#C56D4B]/10 text-[#C56D4B] border border-[#C56D4B]/30'
                          : 'bg-[#205743]/10 text-[#205743] border border-[#205743]/20'
                      }`}
                    >
                      {sc.riskLevel} ({sc.riskScore}/100)
                    </span>
                  </td>

                  <td className="p-3 font-semibold text-[#252D2A]">
                    {sc.workloadPercentage}% Avg
                  </td>

                  <td className="p-3 font-semibold text-[#252D2A]">
                    ${sc.cost.toLocaleString()}{' '}
                    {sc.costDelta !== 0 && (
                      <span
                        className={`text-[10px] ${
                          sc.costDelta > 0 ? 'text-[#C56D4B]' : 'text-[#205743]'
                        }`}
                      >
                        ({sc.costDelta > 0 ? '+' : ''}${sc.costDelta.toLocaleString()})
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-[#205743]">
                      {sc.successProbability}%
                    </div>
                  </td>

                  <td className="p-3 text-[11px] text-[#5F6863]">
                    <ul className="list-disc list-inside space-y-0.5">
                      {sc.keyTradeoffs.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
