'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { DecisionRecord } from '@/lib/queries/knowledge';
import { Scale, User, Mic, Filter } from 'lucide-react';

interface Props {
  decisions: DecisionRecord[];
}

export function DecisionLogView({ decisions }: Props) {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredDecisions = decisions.filter((d) => {
    if (selectedType !== 'ALL' && d.type !== selectedType) return false;
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    return true;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return 'bg-[#E8F3EE] text-[#1F4D3A] border-[#C2DFD3]';
      case 'REJECTION':
        return 'bg-[#FDF2EE] text-[#C96B4A] border-[#FADCD0]';
      case 'RISK':
        return 'bg-[#FEF8EC] text-[#C89B3C] border-[#F6E3B8]';
      case 'ASSUMPTION':
        return 'bg-[#F0EEE6] text-[#1C2421] border-[#E2DCD2]';
      default:
        return 'bg-[#F0EEE6] text-[#525B56] border-[#E2DCD2]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C2421]">Decision Governance Memory</h3>
            <p className="text-xs text-[#525B56]">Audit log of key architectural & project decisions.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[#525B56]">
            <Filter className="h-3.5 w-3.5 text-[#525B56]" />
            <span className="font-medium">Filter:</span>
          </div>
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-[#E2DCD2] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C2421] focus:outline-none focus:border-[#1F4D3A]"
          >
            <option value="ALL">All Types</option>
            <option value="DECISION">Decisions</option>
            <option value="APPROVAL">Approvals</option>
            <option value="REJECTION">Rejections</option>
            <option value="RISK">Risks</option>
            <option value="ASSUMPTION">Assumptions</option>
            <option value="FOLLOW_UP">Follow-ups</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-[#E2DCD2] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C2421] focus:outline-none focus:border-[#1F4D3A]"
          >
            <option value="ALL">All Categories</option>
            <option value="ARCHITECTURE">Architecture</option>
            <option value="SPRINT_SCOPE">Sprint Scope</option>
            <option value="INFRASTRUCTURE">Infrastructure</option>
            <option value="FEATURE">Feature</option>
          </select>
        </div>
      </div>

      {/* Decision Cards List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredDecisions.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-dashed border-[#E2DCD2] bg-white p-8 text-center text-xs text-[#525B56]">
            No decision records match your selected filters.
          </div>
        ) : (
          filteredDecisions.map((dec) => (
            <div
              key={dec.id}
              className="flex flex-col justify-between rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs transition-all hover:border-[#1F4D3A]/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTypeBadge(
                      dec.type
                    )}`}
                  >
                    {dec.type}
                  </span>
                  <span className="text-[10px] font-semibold text-[#525B56] uppercase tracking-wider bg-[#F7F5F0] border border-[#E2DCD2] px-2 py-0.5 rounded">
                    {dec.category}
                  </span>
                </div>

                <h4 className="mt-3 text-sm font-bold text-[#1C2421] leading-snug">{dec.title}</h4>
                <p className="mt-1.5 text-xs text-[#525B56] leading-relaxed">{dec.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#E2DCD2]/60 pt-2.5 text-[11px] text-[#525B56]">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#525B56]" />
                  <span className="font-medium text-[#1C2421]">
                    By: {dec.decidedBy?.name || 'Rahul Sharma'}
                  </span>
                </div>

                {dec.meeting && (
                  <Link
                    href="/dashboard/meetings"
                    className="inline-flex items-center gap-1 font-semibold text-[#1F4D3A] hover:underline truncate max-w-[160px]"
                  >
                    <Mic className="h-3 w-3 text-[#1F4D3A]" />
                    {dec.meeting.title}
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

