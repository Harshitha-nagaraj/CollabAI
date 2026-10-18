'use client';

import React from 'react';
import { useAIContextAssistant } from '@/lib/queries/knowledge';
import { Sparkles, Mic, FileText, AlertTriangle } from 'lucide-react';

interface Props {
  contextId: string;
  title: string;
  workspaceId: string;
}

export function AIContextAssistant({ contextId, title, workspaceId }: Props) {
  const { data: context, isLoading } = useAIContextAssistant(contextId, title, workspaceId);

  const relatedDecisions = context?.relatedDecisions || [
    { id: 'dec-1', title: 'Approved PostgreSQL + Prisma Schema Migration', type: 'APPROVAL', category: 'ARCHITECTURE' },
    { id: 'dec-2', title: 'Rejected Microservice Breakdown for V1', type: 'REJECTION', category: 'ARCHITECTURE' },
  ];

  const relatedMeetings = context?.relatedMeetings || [
    { id: 'm-1', title: 'Sprint Planning & Architecture Sync', date: '2026-08-02' },
  ];

  const relatedDocs = context?.relatedDocuments || [
    { id: 'doc-1', title: 'Architecture Review & Decision Log', type: 'MEETING_NOTES' },
  ];

  const risks = context?.potentialRisks || [
    { risk: 'Critical Path dependency bottleneck on authentication endpoints.', severity: 'HIGH' },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">
              AI Context Assistant
            </h4>
            <p className="text-[11px] text-[#525B56]">Context for "{title}"</p>
          </div>
        </div>
        <span className="rounded-md bg-[#F0EEE6] border border-[#E2DCD2] px-2 py-0.5 text-[10px] font-bold text-[#1F4D3A]">
          Auto Context
        </span>
      </div>

      {/* Related Decisions */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">Related Decisions</span>
        <div className="mt-1.5 space-y-1.5">
          {relatedDecisions.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 text-xs">
              <span className="truncate font-semibold text-[#1C2421]">{d.title}</span>
              <span className="rounded bg-[#E8F3EE] border border-[#C2DFD3] px-1.5 py-0.5 text-[9px] font-bold text-[#1F4D3A] ml-2">
                {d.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Related Meetings & Documents */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">Past Meetings</span>
          <div className="mt-1.5 space-y-1.5">
            {relatedMeetings.map((m) => (
              <div key={m.id} className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 text-xs">
                <p className="inline-flex items-center gap-1 truncate font-semibold text-[#1C2421]">
                  <Mic className="h-3 w-3 text-[#1F4D3A]" />
                  {m.title}
                </p>
                <p className="text-[10px] text-[#525B56] mt-0.5">{m.date}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">Related Docs</span>
          <div className="mt-1.5 space-y-1.5">
            {relatedDocs.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 text-xs">
                <p className="inline-flex items-center gap-1 truncate font-semibold text-[#1C2421]">
                  <FileText className="h-3 w-3 text-[#1F4D3A]" />
                  {doc.title}
                </p>
                <p className="text-[10px] text-[#525B56] mt-0.5">{doc.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Potential Risks Alert */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#C96B4A]">Risk Alerts</span>
        <div className="mt-1.5 space-y-1.5">
          {risks.map((r, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-lg border border-[#FADCD0] bg-[#FDF2EE] p-2.5 text-xs text-[#1C2421]">
              <AlertTriangle className="h-4 w-4 text-[#C96B4A] shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#525B56] leading-relaxed">{r.risk}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

