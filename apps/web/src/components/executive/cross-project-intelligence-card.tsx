'use client';

import React from 'react';

interface InsightItem {
  id: string;
  type: string;
  title: string;
  description: string;
  affectedProjects: string[];
  recommendedAction: string;
}

interface Props {
  insights: InsightItem[];
}

export function CrossProjectIntelligenceCard({ insights }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-sm text-white font-bold shadow-xs">
            🔗
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">Cross-Project Intelligence & Shared Resources</h3>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/60 p-4 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="rounded bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[9px] font-bold text-[#205743] uppercase tracking-wider">
                {item.type.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-semibold text-[#5F6863]">
                Affects: {item.affectedProjects.join(', ')}
              </span>
            </div>

            <h4 className="text-xs font-bold text-[#252D2A]">{item.title}</h4>
            <p className="text-xs text-[#5F6863] leading-relaxed">{item.description}</p>

            <div className="pt-2 border-t border-[#E4DED4] text-[11px] font-semibold text-[#205743]">
              Recommended Action: {item.recommendedAction}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
