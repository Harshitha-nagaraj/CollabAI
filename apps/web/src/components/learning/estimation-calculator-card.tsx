'use client';

import React, { useState } from 'react';
import type { AIEstimationResult } from '@/lib/queries/learning';
import { Calculator, Sparkles } from 'lucide-react';

interface EstimationCalculatorCardProps {
  onEstimate: (taskTitle: string) => Promise<AIEstimationResult>;
  isLoading?: boolean;
}

export function EstimationCalculatorCard({ onEstimate, isLoading }: EstimationCalculatorCardProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [result, setResult] = useState<AIEstimationResult | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || isLoading) return;

    try {
      const res = await onEstimate(taskTitle.trim());
      setResult(res);
    } catch (err) {
      // Fallback display
    }
  };

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <Calculator className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            AI Historical Estimation Engine
          </h3>
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#205743]/10 text-[#205743] border border-[#205743]/20">
          Historical Precedent Analysis
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="flex gap-2">
        <input
          type="text"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Enter proposed task title (e.g. 'Backend Authentication API', 'Payment Integration')"
          className="flex-1 rounded-lg border border-[#E4DED4] bg-[#F7F5F0] px-3.5 py-2 text-xs text-[#252D2A] placeholder-[#8C9590] focus:border-[#205743] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={!taskTitle.trim() || isLoading}
          className="flex items-center gap-1.5 rounded-lg bg-[#205743] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#163E32] disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isLoading ? 'Estimating...' : 'Calculate Estimate'}</span>
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div className="rounded-lg bg-[#F7F5F0] p-4 border border-[#E4DED4] space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-3 text-center border border-[#E4DED4]">
              <span className="text-[10px] font-semibold text-[#5F6863]">Estimated Effort</span>
              <p className="mt-0.5 text-base font-extrabold text-[#205743]">
                {result.estimatedHours} Hours
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 text-center border border-[#E4DED4]">
              <span className="text-[10px] font-semibold text-[#5F6863]">Estimated Duration</span>
              <p className="mt-0.5 text-base font-extrabold text-[#252D2A]">
                {result.estimatedDurationDays} Working Days
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 text-center border border-[#E4DED4]">
              <span className="text-[10px] font-semibold text-[#5F6863]">Delivery Confidence</span>
              <p className="mt-0.5 text-base font-extrabold text-[#205743]">
                {result.deliveryConfidenceScore}%
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 border border-[#E4DED4] text-xs text-[#5F6863]">
            <span className="font-bold text-[#252D2A]">AI Rationale: </span>
            {result.rationale}
          </div>

          {result.similarHistoricalTasks.length > 0 && (
            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#5F6863] mb-2">
                Matched Historical Workspace Tasks ({result.similarHistoricalTasks.length})
              </h5>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {result.similarHistoricalTasks.map((match, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs border border-[#E4DED4]"
                  >
                    <span className="font-semibold text-[#252D2A]">
                      {match.title}
                    </span>
                    <span className="font-bold text-[#205743] bg-[#205743]/10 px-2 py-0.5 rounded text-[11px]">
                      {match.actualHours}h Actual
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

