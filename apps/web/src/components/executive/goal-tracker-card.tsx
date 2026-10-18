'use client';

import React from 'react';
import type { GoalItem } from '@/lib/queries/executive';

interface Props {
  goals: GoalItem[];
}

export function GoalTrackerCard({ goals }: Props) {
  const displayGoals = goals.length > 0 ? goals : [
    {
      id: 'g-1',
      title: 'Deliver Core AI Meeting Intelligence & Live Room Module',
      type: 'QUARTERLY',
      targetMetric: '100% Core Features Delivered',
      currentProgress: 86,
      status: 'ON_TRACK',
    },
    {
      id: 'g-2',
      title: 'Achieve 95% Test Coverage Across API & Frontend Packages',
      type: 'MONTHLY',
      targetMetric: '95% Code Coverage',
      currentProgress: 94,
      status: 'ON_TRACK',
    },
    {
      id: 'g-3',
      title: 'Complete PostgreSQL & Prisma Relational Storage Migration',
      type: 'SPRINT',
      targetMetric: 'Zero Data Loss Migration',
      currentProgress: 100,
      status: 'COMPLETED',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#205743]/10 text-[#205743] border-[#205743]/25';
      case 'AT_RISK':
        return 'bg-[#C56D4B]/10 text-[#C56D4B] border-[#C56D4B]/25';
      default:
        return 'bg-[#205743]/10 text-[#205743] border-[#205743]/25';
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-sm text-white font-bold shadow-xs">
            🎯
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">Quarterly & Sprint Goals (OKRs)</h3>
        </div>
      </div>

      <div className="space-y-3">
        {displayGoals.map((g) => (
          <div
            key={g.id}
            className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/60 p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded bg-[#EFEBE3] border border-[#E4DED4] px-1.5 py-0.5 text-[9px] font-bold text-[#5F6863]">
                  {g.type}
                </span>
                <h4 className="text-xs font-bold text-[#252D2A] truncate">{g.title}</h4>
              </div>

              <span className={`rounded border px-2 py-0.5 text-[9px] font-bold ${getStatusBadge(g.status)}`}>
                {g.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#5F6863]">
                <span>{g.targetMetric || 'Progress Target'}</span>
                <span className="font-bold text-[#205743]">{g.currentProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#E4DED4] overflow-hidden">
                <div
                  className="h-full bg-[#205743] transition-all"
                  style={{ width: `${g.currentProgress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
