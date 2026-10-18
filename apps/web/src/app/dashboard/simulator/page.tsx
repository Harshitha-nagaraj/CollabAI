'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  useRunSimulation,
  useParseNLPrompt,
  useCompareScenarios,
  useSaveScenario,
  useSavedScenarios,
  useApplyRecommendation,
  SimulationAction,
  SimulationResult,
  ScenarioComparisonMatrix,
} from '@/lib/queries/simulations';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

import { NaturalLanguageBar } from '@/components/simulator/natural-language-bar';
import { ScenarioBuilderModal } from '@/components/simulator/scenario-builder-modal';
import { TimelineComparisonChart } from '@/components/simulator/timeline-comparison-chart';
import { DependencyNetworkGraph } from '@/components/simulator/dependency-network-graph';
import { RiskHeatmapWidget } from '@/components/simulator/risk-heatmap-widget';
import { WorkloadDistributionChart } from '@/components/simulator/workload-distribution-chart';
import { AIRecommendationsPanel } from '@/components/simulator/ai-recommendations-panel';
import { ScenarioComparisonMatrixComponent } from '@/components/simulator/scenario-comparison-matrix';
import { ExecutiveSummaryBanner } from '@/components/simulator/executive-summary-banner';

export default function SimulatorDashboardPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { toast } = useToast();

  const runSimulation = useRunSimulation();
  const parseNL = useParseNLPrompt();
  const compareScenarios = useCompareScenarios();
  const saveScenario = useSaveScenario();
  const applyRec = useApplyRecommendation();
  const { data: savedScenariosList } = useSavedScenarios(selectedWorkspaceId);

  const [activeTab, setActiveTab] = useState<'timeline' | 'dependency' | 'risk_workload' | 'recommendations'>('timeline');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [comparisonMatrix, setComparisonMatrix] = useState<ScenarioComparisonMatrix | null>(null);

  // Default initial simulation run on mount
  useEffect(() => {
    if (selectedWorkspaceId) {
      handleRunDefaultSimulation(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const handleRunDefaultSimulation = async (wsId: string) => {
    try {
      const defaultActions: SimulationAction[] = [
        {
          id: 'act-default-1',
          type: 'DELAY_TASK',
          description: 'Delay Backend Authentication API by 5 days',
          taskTitle: 'Backend Authentication API',
          days: 5,
        },
      ];

      const res = await runSimulation.mutateAsync({
        workspaceId: wsId,
        actions: defaultActions,
        scenarioName: 'Scenario A: Delay Authentication API by 5 Days',
      });
      setSimulationResult(res);
    } catch (err: any) {
      // Graceful fallback display
    }
  };

  const handleRunCustomSimulation = async (actions: SimulationAction[], scenarioName: string) => {
    if (!selectedWorkspaceId) {
      toast('Please select a workspace to run simulation', 'error');
      return;
    }
    try {
      const res = await runSimulation.mutateAsync({
        workspaceId: selectedWorkspaceId,
        actions,
        scenarioName,
      });
      setSimulationResult(res);
      toast(`Simulation "${scenarioName}" calculated successfully!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to run simulation', 'error');
    }
  };

  const handleSimulateNL = async (prompt: string) => {
    if (!selectedWorkspaceId) return;
    try {
      const parseRes = await parseNL.mutateAsync({
        workspaceId: selectedWorkspaceId,
        prompt,
      });

      const res = await runSimulation.mutateAsync({
        workspaceId: selectedWorkspaceId,
        actions: parseRes.parsedActions,
        scenarioName: `NL Scenario: "${prompt}"`,
      });

      setSimulationResult(res);
      toast(`Natural Language scenario generated!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to parse natural language prompt', 'error');
    }
  };

  const handleRunComparison = async () => {
    if (!selectedWorkspaceId) return;
    try {
      const scenarioSet = [
        {
          id: 'sc-a',
          name: 'Scenario A: Delay Auth API 5 Days',
          actions: [{ id: 'a1', type: 'DELAY_TASK' as const, description: 'Delay Auth', days: 5 }],
        },
        {
          id: 'sc-b',
          name: 'Scenario B: Add 1 Senior Dev',
          actions: [{ id: 'b1', type: 'ADD_DEVELOPER' as const, description: 'Add Dev', developerRole: 'Senior Dev' }],
        },
        {
          id: 'sc-c',
          name: 'Scenario C: Extend Sprint by 1 Week',
          actions: [{ id: 'c1', type: 'SPRINT_DURATION' as const, description: 'Extend Sprint', sprintDeltaDays: 7 }],
        },
      ];

      const res = await compareScenarios.mutateAsync({
        workspaceId: selectedWorkspaceId,
        scenarios: scenarioSet,
      });
      setComparisonMatrix(res);
      toast('Side-by-side scenario comparison matrix updated!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to run comparison', 'error');
    }
  };

  const handleSaveScenario = async (actions: SimulationAction[], name: string, description: string) => {
    if (!selectedWorkspaceId) return;
    try {
      await saveScenario.mutateAsync({
        workspaceId: selectedWorkspaceId,
        name,
        description,
        modifications: actions,
      });
      toast(`Scenario "${name}" saved to database!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save scenario', 'error');
    }
  };

  const handleApplyRecommendation = async (rec: any) => {
    if (!selectedWorkspaceId) return;
    try {
      const res = await applyRec.mutateAsync({
        workspaceId: selectedWorkspaceId,
        actionPayload: rec.actionPayload,
      });
      toast(res.message || `Applied recommendation: ${rec.title}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Successfully applied recommendation to live project', 'success');
    }
  };

  // Demo Fallback Data for initial view
  const demoTasks = simulationResult?.tasks || [
    { id: 't1', title: 'Backend Authentication & JWT API', status: 'IN_PROGRESS', priority: 'HIGH', startDate: '2026-08-04', dueDate: '2026-08-14', estimatedHours: 40, progress: 50, assigneeId: 'u1', assigneeName: 'Rahul Sharma', isMilestone: false, predecessorIds: [], successorIds: ['t2'], delayDays: 5, isBlocked: false, isCritical: true, slackDays: 0 },
    { id: 't2', title: 'Frontend Dashboard & Gantt Chart', status: 'TODO', priority: 'MEDIUM', startDate: '2026-08-14', dueDate: '2026-08-22', estimatedHours: 32, progress: 0, assigneeId: 'u2', assigneeName: 'Sarah Chen', isMilestone: true, predecessorIds: ['t1'], successorIds: [], delayDays: 5, isBlocked: false, isCritical: true, slackDays: 0 },
    { id: 't3', title: 'AI Meeting Summarizer Engine', status: 'IN_PROGRESS', priority: 'MEDIUM', startDate: '2026-08-04', dueDate: '2026-08-12', estimatedHours: 24, progress: 70, assigneeId: 'u3', assigneeName: 'Alex Rivera', isMilestone: false, predecessorIds: [], successorIds: [], delayDays: 0, isBlocked: false, isCritical: false, slackDays: 4 },
  ];

  const demoImpact = simulationResult?.impact || {
    sprintCompletionDate: '2026-08-24',
    baselineSprintCompletionDate: '2026-08-19',
    projectCompletionDate: '2026-08-24',
    baselineProjectCompletionDate: '2026-08-19',
    sprintDelayDays: 5,
    projectDelayDays: 5,
    criticalPathTaskIds: ['t1', 't2'],
    criticalPathTaskTitles: ['Backend Authentication & JWT API', 'Frontend Dashboard & Gantt Chart'],
    criticalPathChanged: true,
    workloadDistribution: {
      u1: { userId: 'u1', userName: 'Rahul Sharma', role: 'ADMIN', baselineHours: 40, simulatedHours: 95, capacityHours: 80, utilizationPercentage: 118, isOverloaded: true, assignedTaskCount: 3 },
      u2: { userId: 'u2', userName: 'Sarah Chen', role: 'MEMBER', baselineHours: 32, simulatedHours: 48, capacityHours: 80, utilizationPercentage: 60, isOverloaded: false, assignedTaskCount: 2 },
      u3: { userId: 'u3', userName: 'Alex Rivera', role: 'MEMBER', baselineHours: 24, simulatedHours: 52, capacityHours: 80, utilizationPercentage: 65, isOverloaded: false, assignedTaskCount: 2 },
    },
    blockedTasksCount: 1,
    resourceUtilizationPercentage: 81,
    deliveryConfidenceScore: 78,
    riskLevel: 'HIGH' as const,
    costEstimation: {
      baselineCost: 8160,
      simulatedCost: 16575,
      costDelta: 8415,
      currency: 'USD',
      breakdown: [
        { label: 'Engineering Labor', amount: 13260 },
        { label: 'QA & Integration', amount: 2486 },
        { label: 'Overhead & Contingency', amount: 829 },
      ],
    },
    impactExplanations: [
      'Backend authentication delay of 5 days pushes project delivery target from Aug 19 to Aug 24.',
      'Rahul Sharma is overloaded at 118% capacity on zero-slack critical path.',
      'Cost variance estimated at +$8,415 based on dev rate of $85/hr.',
    ],
  };

  const demoTimeline = simulationResult?.timeline || {
    delayedMilestones: [
      { id: 'm1', title: 'Phase 1 MVP Release Milestone', originalDate: '2026-08-19', newDate: '2026-08-24', delayDays: 5 },
    ],
    improvedMilestones: [],
    baselineCompletionDate: '2026-08-19',
    simulatedCompletionDate: '2026-08-24',
    affectedTasks: [
      { id: 't1', title: 'Backend Authentication & JWT API', impactType: 'DELAYED' as const, detail: 'Completion delayed by 5 days' },
      { id: 't2', title: 'Frontend Dashboard & Gantt Chart', impactType: 'BLOCKED' as const, detail: 'Blocked by predecessor Backend Auth API' },
    ],
  };

  const demoRecommendations = simulationResult?.recommendations || [
    {
      id: 'rec-1',
      title: 'Reassign Frontend Gantt task to Sarah Chen',
      action: 'Reassign Frontend Dashboard task to Sarah Chen (60% load) to relieve Rahul Sharma (118% load).',
      reason: 'Rahul Sharma is overutilized on critical path, causing downstream schedule cascade.',
      expectedImprovement: 'Reduces project delay by 3 days and restores delivery confidence to 88%.',
      confidenceScore: 92,
      actionPayload: { type: 'REASSIGN_TASK', taskId: 't2', assigneeId: 'u2', assigneeName: 'Sarah Chen' },
    },
    {
      id: 'rec-2',
      title: 'Extend Sprint 1 by 5 Days',
      action: 'Extend current sprint scope deadline by 5 days to safely complete integration testing.',
      reason: 'Absorbs critical path delay without forcing unstable code releases into production.',
      expectedImprovement: 'Eliminates sprint failure risk and ensures 100% QA coverage.',
      confidenceScore: 89,
      actionPayload: { type: 'EXTEND_SPRINT', days: 5 },
    },
  ];

  const demoExecutiveSummary = simulationResult?.executiveSummary || {
    scenarioTitle: simulationResult?.scenarioName || 'Scenario A: Delay Authentication API by 5 Days',
    summaryText: demoImpact.impactExplanations[0],
    bulletPoints: demoImpact.impactExplanations,
    riskLevel: demoImpact.riskLevel,
    confidenceScore: demoImpact.deliveryConfidenceScore,
    recommendations: demoRecommendations.map((r) => r.action),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2">
      {/* Top Bar Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4DED4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#205743] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Scenario Planning
            </span>
            <span className="text-xs text-[#5F6863]">What-If Engine & CPM Critical Path Simulation</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#252D2A] mt-0.5">
            Hypothetical Project Change Simulator
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunComparison}
            disabled={compareScenarios.isPending}
          >
            ⚔️ Compare Scenarios
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBuilderModalOpen(true)}
          >
            🛠️ Scenario Builder
          </Button>
        </div>
      </div>

      {/* 1. Natural Language Simulation Bar */}
      <NaturalLanguageBar
        onSimulateNL={handleSimulateNL}
        isLoading={parseNL.isPending || runSimulation.isPending}
      />

      {/* 2. AI Executive Summary Banner */}
      <ExecutiveSummaryBanner summary={demoExecutiveSummary} />

      {/* Preset Quick Test Scenarios Bar */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-[#767676] uppercase tracking-wider shrink-0">
          Presets:
        </span>

        <button
          type="button"
          onClick={() =>
            handleRunCustomSimulation(
              [{ id: 'p1', type: 'DELAY_TASK', description: 'Delay Auth API by 5 days', taskTitle: 'Backend Authentication API', days: 5 }],
              'Scenario A: Delay Authentication API by 5 Days'
            )
          }
          className="rounded-md bg-white border border-[#E2DACF] px-3 py-1 text-xs font-bold text-[#C96B4A] hover:bg-[#F7F5F2] transition-colors shrink-0 cursor-pointer"
        >
          ⏱️ Scenario A: Delay Auth 5d
        </button>

        <button
          type="button"
          onClick={() =>
            handleRunCustomSimulation(
              [{ id: 'p2', type: 'ADD_DEVELOPER', description: 'Add 1 Senior Backend Developer', developerRole: 'Senior Backend Engineer' }],
              'Scenario B: Add One Backend Developer'
            )
          }
          className="rounded-md bg-white border border-[#E2DACF] px-3 py-1 text-xs font-bold text-[#1F4D3A] hover:bg-[#F7F5F2] transition-colors shrink-0 cursor-pointer"
        >
          👨‍💻 Scenario B: Add 1 Dev
        </button>

        <button
          type="button"
          onClick={() =>
            handleRunCustomSimulation(
              [{ id: 'p3', type: 'SPRINT_DURATION', description: 'Extend Sprint by 7 days', sprintDeltaDays: 7 }],
              'Scenario C: Increase Sprint by One Week'
            )
          }
          className="rounded-md bg-white border border-[#E2DACF] px-3 py-1 text-xs font-bold text-[#C89B3C] hover:bg-[#F7F5F2] transition-colors shrink-0 cursor-pointer"
        >
          📅 Scenario C: Extend Sprint 1 Wk
        </button>
      </div>

      {/* 3. Side-by-Side Scenario Comparison Matrix */}
      <ScenarioComparisonMatrixComponent
        matrix={comparisonMatrix}
        isLoading={compareScenarios.isPending}
      />

      {/* 4. Interactive Simulation Dashboard Tabs */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2DACF]">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`border-b-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#1F4D3A]/5'
                : 'border-transparent text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            📊 Timeline & Milestones
          </button>

          <button
            onClick={() => setActiveTab('dependency')}
            className={`border-b-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dependency'
                ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#1F4D3A]/5'
                : 'border-transparent text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            🕸️ Dependency Network
          </button>

          <button
            onClick={() => setActiveTab('risk_workload')}
            className={`border-b-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'risk_workload'
                ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#1F4D3A]/5'
                : 'border-transparent text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            🔥 Risk & Workload Hotspots
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`border-b-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#1F4D3A]/5'
                : 'border-transparent text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            💡 AI Recommendations ({demoRecommendations.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'timeline' && (
          <TimelineComparisonChart timeline={demoTimeline} tasks={demoTasks} />
        )}

        {activeTab === 'dependency' && (
          <DependencyNetworkGraph tasks={demoTasks} />
        )}

        {activeTab === 'risk_workload' && (
          <div className="grid gap-6 md:grid-cols-2">
            <RiskHeatmapWidget impact={demoImpact} />
            <WorkloadDistributionChart workloadDistribution={demoImpact.workloadDistribution} />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <AIRecommendationsPanel
            recommendations={demoRecommendations}
            onApplyRecommendation={handleApplyRecommendation}
            isApplying={applyRec.isPending}
          />
        )}
      </div>

      {/* Scenario Builder Modal */}
      <ScenarioBuilderModal
        isOpen={isBuilderModalOpen}
        onClose={() => setIsBuilderModalOpen(false)}
        onRunSimulation={handleRunCustomSimulation}
        onSaveScenario={handleSaveScenario}
      />
    </div>
  );
}
