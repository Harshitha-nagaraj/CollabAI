'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useDecisionLog } from '@/lib/queries/knowledge';
import { DecisionLogView } from '@/components/knowledge/decision-log-view';
import { AIContextAssistant } from '@/components/knowledge/ai-context-assistant';
import { Scale } from 'lucide-react';

export default function DecisionsPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { data: decisions } = useDecisionLog(selectedWorkspaceId);

  const demoDecisions = decisions || [
    {
      id: 'd1',
      title: 'Approved PostgreSQL + Prisma Schema Migration',
      description: 'Standardized on PostgreSQL relational storage for type safety and transaction reliability.',
      type: 'APPROVAL' as const,
      category: 'ARCHITECTURE',
      status: 'APPROVED',
      createdAt: '2026-08-02',
      decidedBy: { id: 'u1', name: 'Rahul Sharma', email: 'rahul@collabai.dev' },
      meeting: { id: 'm1', title: 'Sprint Planning & Architecture Sync' },
    },
    {
      id: 'd2',
      title: 'Rejected Microservice Breakdown for V1',
      description: 'Maintaining a modular monolith structure to accelerate product feature velocity.',
      type: 'REJECTION' as const,
      category: 'ARCHITECTURE',
      status: 'APPROVED',
      createdAt: '2026-08-01',
      decidedBy: { id: 'u2', name: 'Sarah Chen', email: 'sarah@collabai.dev' },
    },
    {
      id: 'd3',
      title: 'Identified WebRTC High Load Latency Risk',
      description: 'Signaling server performance must be benchmarked before 100+ concurrent participant calls.',
      type: 'RISK' as const,
      category: 'INFRASTRUCTURE',
      status: 'PROPOSED',
      createdAt: '2026-07-30',
      decidedBy: { id: 'u3', name: 'Alex Rivera', email: 'alex@collabai.dev' },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1F4D3A] px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide">
              <Scale className="h-3 w-3" />
              Governance Memory
            </span>
            <span className="text-xs text-[#525B56]">Architectural & Product Decisions Audit Trail</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Project Decision Memory Log
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DecisionLogView decisions={demoDecisions as any} />
        </div>

        <div>
          <AIContextAssistant
            contextId="decision-governance"
            title="Decision Memory Context"
            workspaceId={selectedWorkspaceId || 'demo-workspace'}
          />
        </div>
      </div>
    </div>
  );
}

