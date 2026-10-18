'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useDecisionLog, useKnowledgeTimeline } from '@/lib/queries/knowledge';
import { Search, Scale, History, BookOpen } from 'lucide-react';

import { SemanticSearchBar } from '@/components/knowledge/semantic-search-bar';
import { DecisionLogView } from '@/components/knowledge/decision-log-view';
import { KnowledgeTimelineView } from '@/components/knowledge/knowledge-timeline-view';
import { AIContextAssistant } from '@/components/knowledge/ai-context-assistant';

export default function KnowledgePage() {
  const { selectedWorkspaceId } = useAppStore();
  const [activeTab, setActiveTab] = useState<'search' | 'decisions' | 'timeline'>('search');

  const { data: decisions } = useDecisionLog(selectedWorkspaceId);
  const { data: timelineEvents } = useKnowledgeTimeline(selectedWorkspaceId);

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

  const demoEvents = timelineEvents || [
    {
      id: 'e1',
      title: 'Approved PostgreSQL + Prisma Migration',
      description: 'Architectural approval for PostgreSQL storage engine and Prisma ORM client.',
      eventType: 'APPROVAL',
      category: 'ARCHITECTURE',
      date: '2026-08-02',
      actor: 'Rahul Sharma',
      link: '/dashboard/decisions',
    },
    {
      id: 'e2',
      title: 'Sprint Planning & Architecture Sync',
      description: 'Engineered meeting intelligence pipeline and live virtual room specifications.',
      eventType: 'MEETING',
      category: 'SPRINT_PLANNING',
      date: '2026-08-01',
      actor: 'CollabAI Engine',
      link: '/dashboard/meetings',
    },
    {
      id: 'e3',
      title: 'Identified WebRTC Latency Risk',
      description: 'Flagged potential latency bottleneck during high participant calls.',
      eventType: 'RISK',
      category: 'INFRASTRUCTURE',
      date: '2026-07-30',
      actor: 'Alex Rivera',
      link: '/dashboard/decisions',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1F4D3A] px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide">
              <BookOpen className="h-3 w-3" />
              Knowledge Hub
            </span>
            <span className="text-xs text-[#525B56]">Semantic Search, Decision Logs & Project History</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Knowledge Base & Decision Memory
          </h1>
        </div>
      </div>

      {/* Main Grid Layout with Context Assistant Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E2DCD2] space-x-1">
            {[
              { id: 'search', label: 'Semantic Natural Language Q&A', icon: Search },
              { id: 'decisions', label: 'Decision Memory Log', icon: Scale },
              { id: 'timeline', label: 'Project History Timeline', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#F0EEE6]'
                      : 'border-transparent text-[#525B56] hover:text-[#1C2421] hover:bg-[#F0EEE6]/50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#1F4D3A]' : 'text-[#525B56]'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Views */}
          {activeTab === 'search' && (
            <SemanticSearchBar workspaceId={selectedWorkspaceId || 'demo-workspace'} />
          )}

          {activeTab === 'decisions' && (
            <DecisionLogView decisions={demoDecisions as any} />
          )}

          {activeTab === 'timeline' && (
            <KnowledgeTimelineView events={demoEvents as any} />
          )}
        </div>

        {/* AI Context Assistant Sidebar Column (1 col) */}
        <div className="space-y-6">
          <AIContextAssistant
            contextId="core-project-context"
            title="CollabAI Core Engine"
            workspaceId={selectedWorkspaceId || 'demo-workspace'}
          />
        </div>
      </div>
    </div>
  );
}

