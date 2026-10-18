'use client';

import { useProjectHealth, type RiskItem } from '@/lib/queries/ai';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function AIRiskPredictorCard() {
  const { selectedWorkspaceId } = useAppStore();
  const { data: health, isLoading, refetch } = useProjectHealth(selectedWorkspaceId);

  const riskPredictions = health?.riskPredictions || [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs animate-pulse">
        <div className="h-5 w-40 rounded bg-[#EFEBE3]" />
        <div className="mt-4 h-16 rounded bg-[#F7F5F0]" />
      </div>
    );
  }

  if (!riskPredictions || riskPredictions.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#205743] text-white font-bold shadow-xs">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#252D2A]">AI Risk Predictor</h3>
            <p className="text-xs text-[#5F6863]">Continuous project trajectory & deadline risk monitor</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-md bg-[#205743]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#205743] border border-[#205743]/20 uppercase tracking-wider">
          Proactive AI
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <AnimatePresence>
          {riskPredictions.map((risk: RiskItem) => {
            const isHigh = risk.riskLevel === 'HIGH';
            const isMedium = risk.riskLevel === 'MEDIUM';

            const badgeBg = isHigh
              ? 'bg-[#C56D4B]/15 text-[#C56D4B] border-[#C56D4B]/30'
              : isMedium
              ? 'bg-[#D4A545]/15 text-[#9E731D] border-[#D4A545]/30'
              : 'bg-[#205743]/10 text-[#205743] border-[#205743]/25';

            return (
              <motion.div
                key={risk.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/60 p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${badgeBg}`}>
                      {risk.riskLevel} RISK
                    </span>
                    <h4 className="text-xs font-bold text-[#252D2A]">{risk.title}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5F6863]">
                    <span>Confidence:</span>
                    <span className="font-bold text-[#252D2A]">{risk.confidenceScore}%</span>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#252D2A]">
                  {risk.explanation}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DED4]/80 pt-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#252D2A]">
                    <span className="font-bold text-[#205743]">Suggested Solution:</span>
                    <span>{risk.suggestedSolution}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => refetch()}
                  >
                    Re-analyze Risk
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
