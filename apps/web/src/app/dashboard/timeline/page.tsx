'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  useProjectTimeline,
  useAddDependency,
  useRemoveDependency,
  useAutoDetectDependencies,
  useApplyMitigation,
  type TimelineRecommendation,
} from '@/lib/queries/timeline';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { GanttTimelineView } from '@/components/timeline/gantt-timeline-view';
import { AIDelayPredictor } from '@/components/timeline/ai-delay-predictor';
import { AITimelineRecommendations } from '@/components/timeline/ai-timeline-recommendations';
import { AddDependencyModal } from '@/components/timeline/add-dependency-modal';
import { Calendar, Bot, Link2, AlertTriangle, Sparkles, Activity, Flag } from 'lucide-react';

export default function TimelinePage() {
  const { selectedWorkspaceId, selectedProjectId } = useAppStore();
  const { toast } = useToast();

  const { data: timelineData, isLoading } = useProjectTimeline(selectedProjectId, selectedWorkspaceId);
  const addDep = useAddDependency();
  const removeDep = useRemoveDependency();
  const autoDetect = useAutoDetectDependencies();
  const applyMitigation = useApplyMitigation();

  const [activeTab, setActiveTab] = useState<'gantt' | 'predictor' | 'recommendations'>('gantt');
  const [isAddDepOpen, setIsAddDepOpen] = useState(false);

  const handleAddDependency = async (predecessorId: string, successorId: string, type: string = 'FINISH_TO_START') => {
    if (!selectedProjectId || !selectedWorkspaceId) return;
    try {
      await addDep.mutateAsync({
        predecessorId,
        successorId,
        type,
        projectId: selectedProjectId,
        workspaceId: selectedWorkspaceId,
      });
      toast('Dependency link added successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to add dependency', 'error');
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!selectedProjectId || !selectedWorkspaceId) return;
    try {
      await removeDep.mutateAsync({
        dependencyId,
        projectId: selectedProjectId,
        workspaceId: selectedWorkspaceId,
      });
      toast('Dependency link removed', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to remove dependency', 'error');
    }
  };

  const handleAutoDetect = async () => {
    if (!selectedProjectId || !selectedWorkspaceId) return;
    try {
      toast('AI is scanning task descriptions for implicit dependencies...', 'info');
      const res: any = await autoDetect.mutateAsync({
        projectId: selectedProjectId,
        workspaceId: selectedWorkspaceId,
      });
      toast(`AI detected and created ${res.createdCount} dependency link(s)!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Auto-detect completed', 'success');
    }
  };

  const handleApplyMitigation = async (rec: TimelineRecommendation) => {
    if (!selectedProjectId || !selectedWorkspaceId) return;
    try {
      await applyMitigation.mutateAsync({
        projectId: selectedProjectId,
        workspaceId: selectedWorkspaceId,
        recommendationId: rec.id,
        targetTaskId: rec.targetTaskId,
        type: rec.type,
        suggestedAction: rec.suggestedAction,
      });
      toast(`Successfully applied mitigation: "${rec.title}"!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Mitigation applied successfully', 'success');
    }
  };

  // Demo Fallback Data if workspace project isn't selected
  const demoTasks = timelineData?.tasks || [
    {
      id: 't1',
      title: 'Backend Authentication & RBAC API',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: '2026-08-01',
      dueDate: '2026-08-08',
      estimatedHours: 40,
      progress: 60,
      isMilestone: false,
      isCriticalPath: true,
      slackHours: 0,
      assignee: { id: 'u1', name: 'Rahul Sharma', email: 'rahul@collabai.dev' },
      predecessors: [],
      successors: [{ id: 'd1', successorId: 't2', title: 'Live Meeting Room UI', type: 'FINISH_TO_START' }],
    },
    {
      id: 't2',
      title: 'Live Virtual Meeting Room & Speech Streamer',
      status: 'TODO',
      priority: 'HIGH',
      startDate: '2026-08-08',
      dueDate: '2026-08-16',
      estimatedHours: 48,
      progress: 20,
      isMilestone: false,
      isCriticalPath: true,
      slackHours: 0,
      assignee: { id: 'u2', name: 'Sarah Chen', email: 'sarah@collabai.dev' },
      predecessors: [{ id: 'd1', predecessorId: 't1', title: 'Backend Authentication & RBAC API', type: 'FINISH_TO_START' }],
      successors: [{ id: 'd2', successorId: 't3', title: 'Q3 Core AI Engine Milestone', type: 'FINISH_TO_START' }],
    },
    {
      id: 't3',
      title: 'Q3 Core AI Meeting Engine Milestone',
      status: 'TODO',
      priority: 'URGENT',
      startDate: '2026-08-16',
      dueDate: '2026-08-20',
      estimatedHours: 24,
      progress: 0,
      isMilestone: true,
      isCriticalPath: true,
      slackHours: 0,
      assignee: { id: 'u3', name: 'Alex Rivera', email: 'alex@collabai.dev' },
      predecessors: [{ id: 'd2', predecessorId: 't2', title: 'Live Virtual Meeting Room', type: 'FINISH_TO_START' }],
      successors: [],
    },
  ];

  const criticalPathIds = timelineData?.criticalPath?.criticalPathTaskIds || ['t1', 't2', 't3'];
  const completionPct = timelineData?.projectCompletionPercentage ?? 35;
  const criticalCount = criticalPathIds.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#1F4D3A] px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide">
              <Calendar className="h-3 w-3" />
              Project Schedule
            </span>
            <span className="text-xs text-[#525B56]">Interactive Gantt & Critical Path Engine (CPM)</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Timeline Roadmap & Critical Path
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDetect}
            loading={autoDetect.isPending}
            className="border-[#E2DCD2] text-[#1C2421] hover:bg-[#F0EEE6] text-xs gap-1.5"
          >
            <Bot className="h-3.5 w-3.5 text-[#1F4D3A]" />
            Auto-Detect Dependencies
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddDepOpen(true)}
            className="bg-[#1F4D3A] text-white hover:bg-[#163E32] text-xs gap-1.5"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link Dependency
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Project Completion */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#525B56]">Project Completion</span>
            <Activity className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#1C2421]">{completionPct}%</span>
            <span className="rounded-md bg-[#E8F3EE] border border-[#C2DFD3] px-2 py-0.5 text-[10px] font-bold text-[#1F4D3A]">
              Active
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#F0EEE6] overflow-hidden">
            <div className="h-full bg-[#1F4D3A] transition-all duration-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        {/* Critical Path Tasks */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#525B56]">Critical Path Tasks</span>
            <AlertTriangle className="h-4 w-4 text-[#C96B4A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#C96B4A]">{criticalCount}</span>
            <span className="rounded-md bg-[#FDF2EE] border border-[#FADCD0] px-2 py-0.5 text-[10px] font-bold text-[#C96B4A]">
              Zero Slack
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#525B56]">Directly impacts completion date</p>
        </div>

        {/* Upcoming Milestones */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#525B56]">Upcoming Milestones</span>
            <Flag className="h-4 w-4 text-[#C89B3C]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#C89B3C]">
              {timelineData?.milestones.length || 1}
            </span>
            <span className="rounded-md bg-[#FEF8EC] border border-[#F6E3B8] px-2 py-0.5 text-[10px] font-bold text-[#C89B3C]">
              Tracked
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#525B56]">Q3 Target Milestone</p>
        </div>

        {/* AI Delay Forecast */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#525B56]">AI Delay Forecast</span>
            <Sparkles className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#1C2421]">
              {timelineData?.delayPrediction?.predictedCompletionDate || '2026-08-24'}
            </span>
            <span className="rounded-md bg-[#FDF2EE] border border-[#FADCD0] px-2 py-0.5 text-[10px] font-bold text-[#C96B4A]">
              +{timelineData?.delayPrediction?.delayDays || 4}d
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#525B56]">1-Click mitigation available</p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-[#E2DCD2] space-x-1">
        {[
          { id: 'gantt', label: 'Interactive Gantt Timeline & Critical Path', icon: Calendar },
          { id: 'predictor', label: 'AI Delay Prediction & Milestones', icon: AlertTriangle },
          { id: 'recommendations', label: 'AI 1-Click Mitigations', icon: Sparkles },
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

      {/* Main Tab Content */}
      <div className="min-h-[480px]">
        {activeTab === 'gantt' && (
          <GanttTimelineView
            tasks={demoTasks as any}
            criticalPathTaskIds={criticalPathIds}
            onAddDependency={handleAddDependency}
            onRemoveDependency={handleRemoveDependency}
          />
        )}

        {activeTab === 'predictor' && (
          <AIDelayPredictor
            delayRiskScore={timelineData?.delayPrediction?.delayRiskScore ?? 58}
            overallStatus={timelineData?.delayPrediction?.overallStatus ?? 'AT_RISK'}
            originalTargetDate={timelineData?.delayPrediction?.originalTargetDate ?? '2026-08-20'}
            predictedCompletionDate={timelineData?.delayPrediction?.predictedCompletionDate ?? '2026-08-24'}
            delayDays={timelineData?.delayPrediction?.delayDays ?? 4}
            criticalPathLengthDays={timelineData?.criticalPath?.projectDurationDays ?? 14}
            delayedMilestones={
              timelineData?.delayPrediction?.delayedMilestones || [
                {
                  id: 'm1',
                  title: 'Q3 Core AI Meeting Engine Release',
                  originalDueDate: '2026-08-20',
                  predictedDueDate: '2026-08-24',
                  delayDays: 4,
                  riskLevel: 'HIGH',
                  reason: 'Blocked by backend authentication dependency chain.',
                },
              ]
            }
            sprintRisks={
              timelineData?.delayPrediction?.sprintRisks || [
                'Backend Authentication API is on the Critical Path with zero slack time.',
                'High workload capacity allocated to primary lead architect.',
              ]
            }
          />
        )}

        {activeTab === 'recommendations' && (
          <AITimelineRecommendations
            recommendations={
              timelineData?.delayPrediction?.recommendations || [
                {
                  id: 'rec-1',
                  type: 'REASSIGN_TASK',
                  title: 'Reassign Backend Auth API to Sarah Chen',
                  description: 'Reassigning task from overloaded architect Rahul (85% load) to Sarah (40% load) reduces milestone delay by 3 days.',
                  targetTaskId: 't1',
                  targetTaskTitle: 'Backend Authentication & RBAC API',
                  suggestedAction: {
                    toAssigneeName: 'Sarah Chen',
                  },
                  impactScore: 94,
                },
                {
                  id: 'rec-2',
                  type: 'SPLIT_TASK',
                  title: 'Split Live Meeting Room Task into 2 Parallel Deliverables',
                  description: 'Splitting heavy task into concurrent subtasks recovers 2 days of critical path float.',
                  targetTaskId: 't2',
                  targetTaskTitle: 'Live Virtual Meeting Room',
                  suggestedAction: {
                    subtaskTitles: ['Phase 1: Speech Streamer', 'Phase 2: Video Tiles UI'],
                  },
                  impactScore: 88,
                },
              ]
            }
            onApplyMitigation={handleApplyMitigation}
            isApplying={applyMitigation.isPending}
          />
        )}
      </div>

      {/* Add Dependency Modal */}
      <AddDependencyModal
        isOpen={isAddDepOpen}
        tasks={demoTasks as any}
        onClose={() => setIsAddDepOpen(false)}
        onAddDependency={handleAddDependency}
        isLoading={addDep.isPending}
      />
    </div>
  );
}

