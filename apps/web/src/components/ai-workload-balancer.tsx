'use client';

import { useState } from 'react';
import { useWorkloadAnalysis, useApplyWorkloadReassignment, type MemberWorkload, type WorkloadRedistributionProposal } from '@/lib/queries/ai';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Scale, ArrowRight, Check } from 'lucide-react';

export function AIWorkloadBalancer() {
  const { selectedWorkspaceId } = useAppStore();
  const { data: workloadData, isLoading, refetch } = useWorkloadAnalysis(selectedWorkspaceId);
  const applyMutation = useApplyWorkloadReassignment();
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const members = workloadData?.members || [];
  const proposals = workloadData?.redistributionProposals || [];
  const improvement = workloadData?.expectedImprovement;

  const handleApplyProposal = async (prop: WorkloadRedistributionProposal) => {
    if (!selectedWorkspaceId) return;
    try {
      await applyMutation.mutateAsync({
        taskId: prop.taskId,
        toUserId: prop.toUserId,
        workspaceId: selectedWorkspaceId,
      });
      setAppliedIds(prev => new Set(prev).add(prop.id));
      refetch();
    } catch (error) {
      console.error('Failed to reassign task:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs animate-pulse">
        <div className="h-5 w-48 rounded bg-[#F0EEE6]" />
        <div className="mt-4 h-24 rounded bg-[#F7F5F0]" />
      </div>
    );
  }

  if (members.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C2421]">AI Workload Balancer</h3>
            <p className="text-xs text-[#525B56]">Capacity redistribution & bottleneck prevention engine</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-md bg-[#F0EEE6] border border-[#E2DCD2] px-2.5 py-0.5 text-[11px] font-bold text-[#1F4D3A] uppercase tracking-wider">
          Smart Allocation
        </span>
      </div>

      {/* 3-Step Transformation Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        
        {/* STEP 1: Current Workload */}
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">Step 1</span>
              <span className="text-xs font-bold text-[#1C2421]">Current Workload</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {members.map((m: MemberWorkload) => {
                const isOver = m.status === 'overloaded' || m.status === 'critical';
                return (
                  <div key={m.userId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1C2421]">{m.name}</span>
                      <span className={`font-bold ${isOver ? 'text-[#C96B4A]' : 'text-[#1F4D3A]'}`}>
                        {m.totalTasks} tasks ({m.loadPercentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#E2DCD2] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-[#C96B4A]' : m.status === 'underloaded' ? 'bg-[#C89B3C]' : 'bg-[#1F4D3A]'
                        }`}
                        style={{ width: `${Math.min(m.loadPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white p-2 text-center text-[11px] font-semibold text-[#525B56] border border-[#E2DCD2]">
            Current Capacity Spread
          </div>
        </div>

        {/* STEP 2: Suggested Changes */}
        <div className="rounded-xl border border-[#1F4D3A]/20 bg-[#E8F3EE]/40 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1F4D3A]/20 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F4D3A]">Step 2</span>
              <span className="text-xs font-bold text-[#1F4D3A]">Suggested Changes</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {proposals.length > 0 ? (
                proposals.map((prop: WorkloadRedistributionProposal) => {
                  const isApplied = appliedIds.has(prop.id);
                  return (
                    <motion.div
                      key={prop.id}
                      initial={{ scale: 0.98 }}
                      animate={{ scale: 1 }}
                      className="rounded-lg border border-[#E2DCD2] bg-white p-3 space-y-1.5 shadow-xs"
                    >
                      <p className="text-xs font-bold text-[#1C2421] leading-snug">
                        {prop.taskTitle}
                      </p>
                      <div className="flex items-center justify-between text-xs text-[#525B56]">
                        <span className="text-[#C96B4A] font-semibold">{prop.fromUserName}</span>
                        <ArrowRight className="h-3 w-3 text-[#525B56]" />
                        <span className="text-[#1F4D3A] font-bold">{prop.toUserName}</span>
                      </div>
                      <p className="text-[11px] text-[#525B56]">{prop.reason}</p>
                      <Button
                        size="sm"
                        variant={isApplied ? 'outline' : 'primary'}
                        disabled={isApplied || applyMutation.isPending}
                        className="w-full h-7 text-[11px] mt-1 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                        onClick={() => handleApplyProposal(prop)}
                      >
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1 text-[#1F4D3A]">
                            <Check className="h-3 w-3" />
                            Reassigned
                          </span>
                        ) : (
                          'Apply Reassignment'
                        )}
                      </Button>
                    </motion.div>
                  );
                })
              ) : (
                <div className="rounded-lg bg-white p-4 text-center text-xs text-[#525B56] border border-[#E2DCD2]">
                  No task redistribution needed currently.
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white p-2 text-center text-[11px] font-semibold text-[#1F4D3A] border border-[#C2DFD3]">
            Redistribute for Optimal Flow
          </div>
        </div>

        {/* STEP 3: Expected Improvement */}
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">Step 3</span>
              <span className="text-xs font-bold text-[#1C2421]">Expected Improvement</span>
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-[#E2DCD2]">
                <div>
                  <p className="text-[11px] text-[#525B56]">Load Balance Score</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-extrabold text-[#525B56] line-through">
                      {improvement?.loadBalanceScoreBefore || 62}%
                    </span>
                    <span className="text-lg font-bold text-[#1F4D3A]">
                      {improvement?.loadBalanceScoreAfter || 92}%
                    </span>
                  </div>
                </div>
                <span className="rounded bg-[#E8F3EE] border border-[#C2DFD3] px-2 py-1 text-[11px] font-bold text-[#1F4D3A]">
                  +{(improvement?.loadBalanceScoreAfter || 92) - (improvement?.loadBalanceScoreBefore || 62)}%
                </span>
              </div>

              <div className="rounded-lg bg-white p-3 border border-[#E2DCD2] space-y-1">
                <p className="text-[11px] font-bold text-[#1F4D3A]">Burnout Reduction</p>
                <p className="text-xs text-[#1C2421] font-medium">
                  {improvement?.burnoutRiskReduction || '35% reduction in bottleneck risk'}
                </p>
              </div>

              <p className="text-xs text-[#525B56] leading-relaxed px-1">
                {improvement?.summary || 'Optimizing task assignments eliminates individual bottlenecks.'}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white p-2 text-center text-[11px] font-semibold text-[#1F4D3A] border border-[#E2DCD2]">
            Balanced Team Velocity
          </div>
        </div>

      </div>
    </div>
  );
}

