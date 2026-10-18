'use client';

import React from 'react';
import type { PortfolioProject } from '@/lib/queries/executive';

interface Props {
  projects: PortfolioProject[];
}

export function PortfolioTable({ projects }: Props) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-sm text-white font-bold shadow-xs">
            📁
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">Multi-Project Portfolio Overview</h3>
        </div>
        <span className="text-xs font-semibold text-[#5F6863]">{projects.length} Total Projects</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E4DED4] bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E4DED4] bg-[#F7F5F0] text-[10px] font-bold uppercase tracking-wider text-[#5F6863]">
              <th className="p-3.5">Project Name</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Overall Progress</th>
              <th className="p-3.5 text-center">Tasks</th>
              <th className="p-3.5 text-center">Team Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4DED4]/60 text-xs">
            {projects.map((proj) => (
              <tr key={proj.id} className="transition-colors hover:bg-[#F7F5F0]/50">
                <td className="p-3.5 font-bold text-[#252D2A]">
                  {proj.name}
                  {proj.description && <p className="text-[10px] font-normal text-[#5F6863] truncate max-w-xs">{proj.description}</p>}
                </td>

                <td className="p-3.5">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(proj.status)}`}>
                    {proj.status.replace(/_/g, ' ')}
                  </span>
                </td>

                <td className="p-3.5 w-48">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-[#E4DED4] overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          proj.status === 'AT_RISK' ? 'bg-[#C56D4B]' : 'bg-[#205743]'
                        }`}
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                    <span className="font-bold text-[#252D2A] text-[11px]">{proj.progress}%</span>
                  </div>
                </td>

                <td className="p-3.5 text-center font-semibold text-[#5F6863]">
                  {proj.completedTasks} / {proj.totalTasks}
                </td>

                <td className="p-3.5 text-center font-bold text-[#205743]">
                  👥 {proj.membersCount || 3}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
