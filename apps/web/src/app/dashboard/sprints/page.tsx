'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { SprintBoard } from '@/components/sprints/sprint-board';
import { AISprintPlannerModal } from '@/components/sprints/ai-sprint-planner-modal';
import { CapacityDashboard } from '@/components/sprints/capacity-dashboard';
import { DependencyGraphView } from '@/components/sprints/dependency-graph-view';
import { BurndownVelocityChart } from '@/components/sprints/burndown-velocity-chart';
import { SprintHealthCard } from '@/components/sprints/sprint-health-card';
import { AIRecommendationsPanel } from '@/components/sprints/ai-recommendations-panel';
import { ReleaseDashboardView } from '@/components/releases/release-dashboard-view';
import {
  Rocket,
  BarChart3,
  GitFork,
  TrendingUp,
  Bot,
  Tag,
  Sparkles,
  Calendar,
  Activity,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SprintsPage() {
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId) || 'demo-workspace-id';
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>('demo-sprint-1');
  const [activeTab, setActiveTab] = useState<'board' | 'capacity' | 'dependencies' | 'analytics' | 'health' | 'releases'>('board');
  const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);

  const tabs = [
    { id: 'board', label: 'Sprint Board & Lifecycle', icon: Rocket },
    { id: 'capacity', label: 'Capacity & Workload', icon: BarChart3 },
    { id: 'dependencies', label: 'Dependencies & DAG', icon: GitFork },
    { id: 'analytics', label: 'Burndown & Velocity', icon: TrendingUp },
    { id: 'health', label: 'Health & Recommendations', icon: Bot },
    { id: 'releases', label: 'Release Dashboard', icon: Tag },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#1F4D3A] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Agile Execution
            </span>
            <span className="text-xs font-medium text-[#525B56]">
              Sprint Planning, Capacity & Delivery Velocity
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Sprint Management & Backlog Execution
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAIPlannerOpen(true)}
            className="gap-2 text-xs font-semibold border-[#C89B3C] text-[#9E731D] hover:bg-[#C89B3C]/10 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#C89B3C]" />
            AI Sprint Planner
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="rounded-lg bg-[#1F4D3A]/10 p-2.5 text-[#1F4D3A]">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#525B56]">Active Sprint</span>
            <p className="text-sm font-bold text-[#1C2421]">Sprint 24 — Core API</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="rounded-lg bg-[#1F4D3A]/10 p-2.5 text-[#1F4D3A]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#525B56]">Overall Progress</span>
            <p className="text-sm font-bold text-[#1F4D3A]">68% Deliverables</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="rounded-lg bg-[#C89B3C]/15 p-2.5 text-[#9E731D]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#525B56]">Capacity Load</span>
            <p className="text-sm font-bold text-[#1C2421]">79% (Optimal)</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="rounded-lg bg-[#C96B4A]/10 p-2.5 text-[#C96B4A]">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#525B56]">Blocked Items</span>
            <p className="text-sm font-bold text-[#C96B4A]">1 Dependency</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#E2DCD2] bg-[#F0EEE6] p-1 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#1F4D3A] text-white shadow-xs font-semibold'
                  : 'text-[#525B56] hover:bg-white/80 hover:text-[#1C2421]'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-[#525B56]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">
        {activeTab === 'board' && (
          <SprintBoard
            workspaceId={selectedWorkspaceId}
            onOpenAIPlanner={() => setIsAIPlannerOpen(true)}
            onSelectSprint={(id) => setSelectedSprintId(id)}
            selectedSprintId={selectedSprintId}
          />
        )}

        {activeTab === 'capacity' && <CapacityDashboard sprintId={selectedSprintId || 'demo-sprint-1'} />}

        {activeTab === 'dependencies' && <DependencyGraphView sprintId={selectedSprintId || 'demo-sprint-1'} />}

        {activeTab === 'analytics' && <BurndownVelocityChart sprintId={selectedSprintId || 'demo-sprint-1'} />}

        {activeTab === 'health' && (
          <div className="space-y-6">
            <SprintHealthCard sprintId={selectedSprintId || 'demo-sprint-1'} />
            <AIRecommendationsPanel sprintId={selectedSprintId || 'demo-sprint-1'} />
          </div>
        )}

        {activeTab === 'releases' && <ReleaseDashboardView workspaceId={selectedWorkspaceId} />}
      </div>

      {/* AI Sprint Planner Modal */}
      <AISprintPlannerModal
        isOpen={isAIPlannerOpen}
        onClose={() => setIsAIPlannerOpen(false)}
        workspaceId={selectedWorkspaceId}
      />
    </div>
  );
}

