'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAISprintPlan, useCreateSprint } from '@/lib/queries/sprints';
import { Bot, X, Zap, Package, Lightbulb, ArrowRight, ArrowLeft, CheckCircle2, Sliders } from 'lucide-react';

interface AISprintPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function AISprintPlannerModal({ isOpen, onClose, workspaceId }: AISprintPlannerModalProps) {
  const [durationDays, setDurationDays] = useState(14);
  const [teamSize, setTeamSize] = useState(4);
  const [planResult, setPlanResult] = useState<any>(null);

  const aiPlanMutation = useAISprintPlan();
  const createSprintMutation = useCreateSprint();

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    try {
      const res = await aiPlanMutation.mutateAsync({
        workspaceId,
        sprintDurationDays: durationDays,
        teamSize,
      });
      setPlanResult(res.plan);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptPlan = async () => {
    if (!planResult) return;
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      await createSprintMutation.mutateAsync({
        name: planResult.recommendedSprintName || 'AI Planned Sprint',
        goal: planResult.recommendedGoal,
        startDate,
        endDate,
        workspaceId,
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2421]/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white font-bold text-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C2421]">AI Sprint Backlog & Capacity Planner</h2>
              <p className="text-xs text-[#525B56]">Auto-groups tasks, respects DAG dependencies & balances team capacity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Controls */}
        <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F0EEE6]/50 p-4 rounded-xl border border-[#E2DCD2]">
          <div>
            <label className="block text-xs font-semibold text-[#1C2421] mb-1 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#1F4D3A]" />
              Sprint Duration (Days)
            </label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs font-semibold text-[#1C2421] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A]"
            >
              <option value={7}>7 Days (1 Week)</option>
              <option value={14}>14 Days (2 Weeks Standard)</option>
              <option value={21}>21 Days (3 Weeks)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1C2421] mb-1 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#1F4D3A]" />
              Available Team Members
            </label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs font-semibold text-[#1C2421] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A]"
            >
              <option value={2}>2 Engineers</option>
              <option value={4}>4 Engineers (Standard Team)</option>
              <option value={6}>6 Engineers</option>
              <option value={8}>8 Engineers</option>
            </select>
          </div>
        </div>

        {/* Generate Action */}
        {!planResult && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1F4D3A]/10 text-[#1F4D3A]">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1C2421]">Ready to generate AI Sprint Plan</h3>
            <p className="text-xs text-[#525B56] max-w-md">
              AI will analyze backlog task priorities, estimated story points, prerequisite dependencies, and available team capacity.
            </p>
            <Button
              variant="primary"
              loading={aiPlanMutation.isPending}
              onClick={handleGeneratePlan}
              className="mt-2 py-2 px-5 text-xs font-semibold gap-2 cursor-pointer"
            >
              <span>Generate AI Backlog Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Generated Plan View */}
        {planResult && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Goal Banner */}
            <div className="rounded-xl border border-[#C89B3C]/30 bg-[#C89B3C]/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E731D]">Recommended Sprint Goal</span>
                <Badge variant="success">{planResult.capacityUtilizationPct}% Capacity Used</Badge>
              </div>
              <h4 className="mt-1 text-sm font-bold text-[#1C2421]">{planResult.recommendedGoal}</h4>
              <p className="mt-1 text-xs text-[#525B56]">
                Target: {planResult.allocatedPoints} / {planResult.teamCapacityPoints} Story Points across {planResult.selectedTasksCount} tasks.
              </p>
            </div>

            {/* Task Clusters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#525B56]">Grouped Task Clusters & Selection Rationale</h4>
              {planResult.taskGroups?.map((group: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/40 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1F4D3A]">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      <span>{group.groupName}</span>
                    </div>
                    <span className="text-[11px] text-[#525B56]">{group.taskCount} Tasks</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.tasks?.map((task: any) => (
                      <div key={task.id} className="rounded-lg bg-white p-2.5 border border-[#E2DCD2] text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1C2421]">{task.title}</span>
                          <span className="rounded bg-[#1F4D3A]/10 px-2 py-0.5 text-[10px] font-bold text-[#1F4D3A]">
                            {task.storyPoints || 3} SP
                          </span>
                        </div>
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-[#525B56]">
                          <Lightbulb className="h-3 w-3 text-[#C89B3C] shrink-0 mt-0.5" />
                          <p><span className="font-semibold text-[#1C2421]">Why selected:</span> Priority {task.priority}. Respects dependency DAG chains and fits team load.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {planResult && (
          <div className="mt-4 pt-3 border-t border-[#E2DCD2] flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanResult(null)}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Re-configure</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={createSprintMutation.isPending}
              onClick={handleAcceptPlan}
              className="py-2 px-5 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Accept & Start Sprint</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

