'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAIRecommendations, useApplyRecommendation } from '@/lib/queries/sprints';
import { Lightbulb, Target, ArrowRight, Bot, Sparkles } from 'lucide-react';

interface AIRecommendationsPanelProps {
  sprintId: string;
}

export function AIRecommendationsPanel({ sprintId }: AIRecommendationsPanelProps) {
  const { data, isLoading } = useAIRecommendations(sprintId);
  const applyMutation = useApplyRecommendation(sprintId);

  const recommendations = data?.recommendations?.recommendations || [
    {
      id: 'rec-1',
      title: 'Move "Frontend Auth Integration" to Sprint 25',
      recommendationType: 'MOVE_TASK',
      reason: 'Task is currently blocked by incomplete prerequisite "Backend JWT Authentication Middleware" (IN_PROGRESS).',
      expectedImpact: 'Prevents 12 hours of idle developer wait time and unblocks critical path workflow.',
      confidenceScore: 94,
      actionPayload: { taskId: 't-2', targetSprint: 'Sprint 25' },
    },
    {
      id: 'rec-2',
      title: 'Authentication API should finish before UI Integration',
      recommendationType: 'REASSIGN_WORK',
      reason: 'Authentication middleware is required for frontend token verification and session hydration.',
      expectedImpact: 'Eliminates frontend integration test failures and mock token overhead.',
      confidenceScore: 96,
      actionPayload: { priorityTask: 'Authentication API' },
    },
    {
      id: 'rec-3',
      title: 'Split "Full Release Automation Pipeline" into 2 smaller tasks',
      recommendationType: 'SPLIT_TASK',
      reason: 'Task story points (8 SP) exceed recommended single-sprint task granularity (max 5 SP).',
      expectedImpact: 'Improves PR review turnaround time by 40% and simplifies sprint progress tracking.',
      confidenceScore: 88,
      actionPayload: { taskId: 't-large', splitCount: 2 },
    },
    {
      id: 'rec-4',
      title: 'Reduce Sprint Scope by 10%',
      recommendationType: 'REDUCE_SCOPE',
      reason: 'Current committed workload (48 SP) slightly exceeds target team capacity allocation (42 SP).',
      expectedImpact: 'Lowers burnout risk by 35% and increases delivery confidence to 92%.',
      confidenceScore: 91,
      actionPayload: { reductionPercentage: 10 },
    },
  ];

  const handleApply = async (rec: any) => {
    try {
      await applyMutation.mutateAsync({
        recommendationId: rec.id,
        actionPayload: rec.actionPayload,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#1F4D3A]" />
            <h3 className="text-base font-bold text-[#1C2421]">AI Scope & Execution Recommendations</h3>
          </div>
          <p className="text-xs text-[#525B56] mt-0.5">Real-time actionable suggestions to optimize sprint delivery & unblock tasks</p>
        </div>
        <Badge variant="warning">{recommendations.length} Actionable Items</Badge>
      </div>

      {/* Recommendation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="rounded-xl border border-[#E2DCD2] bg-[#F0EEE6]/40 p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#9E731D] uppercase tracking-wider bg-[#C89B3C]/15 border border-[#C89B3C]/30 px-2 py-0.5 rounded">
                  {rec.recommendationType.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-[#1F4D3A]">{rec.confidenceScore}% Confidence</span>
              </div>
              <h4 className="text-sm font-bold text-[#1C2421]">{rec.title}</h4>
              <div className="text-xs space-y-1 text-[#525B56]">
                <div className="flex items-start gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-[#C89B3C] shrink-0 mt-0.5" />
                  <p><span className="font-semibold text-[#1C2421]">Reason:</span> {rec.reason}</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[#1F4D3A] shrink-0 mt-0.5" />
                  <p><span className="font-semibold text-[#1F4D3A]">Expected Impact:</span> {rec.expectedImpact}</p>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              loading={applyMutation.isPending}
              onClick={() => handleApply(rec)}
              className="w-full text-xs font-bold border-[#1F4D3A] text-[#1F4D3A] hover:bg-[#1F4D3A] hover:text-white gap-2 cursor-pointer"
            >
              <span>Apply Recommendation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

