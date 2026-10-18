'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSprints, useUpdateSprint } from '@/lib/queries/sprints';
import {
  Sparkles,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  Layers,
  ChevronRight,
  Target,
} from 'lucide-react';

interface SprintBoardProps {
  workspaceId: string;
  onOpenAIPlanner: () => void;
  onSelectSprint: (sprintId: string) => void;
  selectedSprintId: string | null;
}

export function SprintBoard({ workspaceId, onOpenAIPlanner, onSelectSprint, selectedSprintId }: SprintBoardProps) {
  const { data, isLoading } = useSprints(workspaceId);
  const updateSprint = useUpdateSprint(selectedSprintId || '');

  const sprints = data?.sprints || [
    {
      id: 'demo-sprint-1',
      name: 'Sprint 24 — Core Intelligence & API',
      goal: 'Deliver production-ready Sprint & Release Management module with AI capacity planning.',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: 14,
      status: 'ACTIVE',
      completionPercentage: 68,
      workspaceId,
    },
    {
      id: 'demo-sprint-2',
      name: 'Sprint 25 — Release Automation & Webhooks',
      goal: 'Automate GitHub PR release notes, deployment checks, and dependency graph views.',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: 14,
      status: 'PLANNING',
      completionPercentage: 15,
      workspaceId,
    },
  ];

  const handleStatusChange = async (sprintId: string, newStatus: string) => {
    try {
      await updateSprint.mutateAsync({ status: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DCD2] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#1C2421]">Active Sprints & Backlog Lifecycle</h2>
          <p className="text-xs text-[#525B56]">Manage sprint status, committed goals, and team delivery pace</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAIPlanner}
            className="gap-2 text-xs font-semibold border-[#C89B3C] text-[#9E731D] hover:bg-[#C89B3C]/10 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#C89B3C]" />
            AI Backlog Planner
          </Button>
        </div>
      </div>

      {/* Sprints List Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sprints.map((sprint) => {
          const isSelected = selectedSprintId === sprint.id || (!selectedSprintId && sprint.status === 'ACTIVE');
          const pct = sprint.completionPercentage || 0;

          return (
            <div
              key={sprint.id}
              onClick={() => onSelectSprint(sprint.id)}
              className={`group relative cursor-pointer rounded-xl border p-5 transition-all ${
                isSelected
                  ? 'border-[#1F4D3A] bg-white shadow-xs ring-1 ring-[#1F4D3A]'
                  : 'border-[#E2DCD2] bg-white hover:border-[#1F4D3A]/50 hover:bg-[#F0EEE6]/30'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#1C2421] group-hover:text-[#1F4D3A] transition-colors">
                      {sprint.name}
                    </h3>
                    <Badge
                      variant={
                        sprint.status === 'ACTIVE'
                          ? 'success'
                          : sprint.status === 'COMPLETED'
                          ? 'neutral'
                          : sprint.status === 'PLANNING'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {sprint.status}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-[#525B56] mt-1">
                    <Target className="h-3.5 w-3.5 text-[#525B56] shrink-0 mt-0.5" />
                    <p className="line-clamp-2">{sprint.goal || 'No sprint goal set.'}</p>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#525B56]">
                  <span>Completion Progress</span>
                  <span className="text-[#1F4D3A] font-bold">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                  <div
                    className="h-full bg-[#1F4D3A] transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Dates & Actions Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-[#E2DCD2]/70 pt-3 text-xs text-[#525B56]">
                <div className="flex items-center gap-4 text-[11px] font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#525B56]" />
                    {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#525B56]" />
                    {sprint.durationDays} Days
                  </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {sprint.status === 'PLANNING' && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-[11px] py-1 px-3 gap-1.5 cursor-pointer"
                      onClick={() => handleStatusChange(sprint.id, 'ACTIVE')}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Start Sprint
                    </Button>
                  )}
                  {sprint.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px] py-1 px-3 border-[#1F4D3A] text-[#1F4D3A] hover:bg-[#1F4D3A] hover:text-white gap-1.5 cursor-pointer"
                      onClick={() => handleStatusChange(sprint.id, 'COMPLETED')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete Sprint
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

