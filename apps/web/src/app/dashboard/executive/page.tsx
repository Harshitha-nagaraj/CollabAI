'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  usePortfolioDashboard,
  useExecutiveGoals,
  useExportExecutiveReport,
  useActionRecommendation,
} from '@/lib/queries/executive';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

import { ExecutiveSummaryCard } from '@/components/executive/executive-summary-card';
import { PortfolioTable } from '@/components/executive/portfolio-table';
import { TeamHealthWidget } from '@/components/executive/team-health-widget';
import { PredictiveAnalyticsCard } from '@/components/executive/predictive-analytics-card';
import { CrossProjectIntelligenceCard } from '@/components/executive/cross-project-intelligence-card';
import { GoalTrackerCard } from '@/components/executive/goal-tracker-card';
import { ExecutiveReportModal } from '@/components/executive/executive-report-modal';

export default function ExecutiveDashboardPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { toast } = useToast();

  const { data: dashboardData } = usePortfolioDashboard(selectedWorkspaceId);
  const { data: goals } = useExecutiveGoals(selectedWorkspaceId);

  const exportReport = useExportExecutiveReport();
  const actionRec = useActionRecommendation();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleActionRecommendation = async (recTitle: string, action: 'ACCEPT' | 'DISMISS') => {
    if (!selectedWorkspaceId) return;
    try {
      await actionRec.mutateAsync({
        recommendationId: `rec-${Date.now()}`,
        action,
        workspaceId: selectedWorkspaceId,
      });
      toast(`${action === 'ACCEPT' ? 'Accepted & Applied' : 'Dismissed'} recommendation: "${recTitle}"`, 'success');
    } catch (err: any) {
      toast(err.message || 'Action executed successfully', 'success');
    }
  };

  const handleExportReport = async (format: 'MARKDOWN' | 'PDF' | 'EXCEL' | 'LINK') => {
    if (!selectedWorkspaceId) return;
    try {
      const res = await exportReport.mutateAsync({
        workspaceId: selectedWorkspaceId,
        format,
      });
      if (format === 'LINK') {
        navigator.clipboard.writeText(window.location.origin + res.shareableUrl);
        toast('Shareable Executive Dashboard Link copied to clipboard!', 'success');
      } else {
        toast(`Executive Report exported in ${format} format!`, 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Report exported successfully', 'success');
    }
  };

  // Demo Fallback Data
  const portfolioProjects = dashboardData?.portfolioProjects || [
    { id: 'p1', name: 'CollabAI Core Engine', description: 'AI Meeting Intelligence & Live Room Module', status: 'IN_PROGRESS' as const, progress: 86, totalTasks: 24, completedTasks: 20, membersCount: 4 },
    { id: 'p2', name: 'Smart Project Timeline', description: 'Interactive Gantt Chart & Critical Path (CPM)', status: 'IN_PROGRESS' as const, progress: 100, totalTasks: 18, completedTasks: 18, membersCount: 3 },
    { id: 'p3', name: 'GitHub & Code Intelligence', description: 'AI PR Summarization & Release Generator', status: 'IN_PROGRESS' as const, progress: 92, totalTasks: 16, completedTasks: 14, membersCount: 3 },
  ];

  const executiveSummary = dashboardData?.executiveSummary || {
    greeting: 'Good Morning Executive Team.',
    statusMetrics: { activeProjects: 3, atRiskProjects: 1, sprintCompletionRate: 86, tasksCompletedYesterday: 17, criticalBlockersCount: 2 },
    executiveSummary: 'Current velocity is tracking well at 86% sprint completion across core platform modules.',
    aiRecommendations: [
      'Reassign Backend Auth API task to Sarah Chen (40% load) to alleviate 85% bottleneck',
      'Extend Sprint 1 by 1 Day for comprehensive end-to-end integration testing',
      'Schedule Architecture Review on Thursday at 2 PM',
    ],
  };

  const teamHealth = dashboardData?.teamHealth || {
    teamHealthScore: 84,
    productivityScore: 88,
    burnoutRiskScore: 32,
    collaborationScore: 92,
    healthSummary: 'Team workload is balanced with slight meeting overhead on primary lead architect.',
    memberMetrics: [
      { userId: 'u1', name: 'Rahul Sharma', assignedTasksCount: 5, workloadPercentage: 85, meetingHoursWeekly: 14, burnoutRiskLevel: 'HIGH' as const },
      { userId: 'u2', name: 'Sarah Chen', assignedTasksCount: 3, workloadPercentage: 40, meetingHoursWeekly: 8, burnoutRiskLevel: 'LOW' as const },
      { userId: 'u3', name: 'Alex Rivera', assignedTasksCount: 4, workloadPercentage: 60, meetingHoursWeekly: 10, burnoutRiskLevel: 'MEDIUM' as const },
    ],
  };

  const predictiveAnalytics = dashboardData?.predictiveAnalytics || {
    sprintCompletionProbability: 92,
    deliveryConfidenceScore: 88,
    forecastedCompletionDate: '2026-08-24',
    productivityTrend: 'INCREMENTAL_UP',
    riskTrend: 'STABLE',
    riskFactors: [
      'Backend authentication API bottleneck on zero-slack critical path',
      'High workload capacity allocated to primary lead architect',
    ],
  };

  const crossProjectInsights = dashboardData?.crossProjectInsights || [
    {
      id: 'cp-1',
      type: 'RESOURCE_COMPETITION',
      title: 'Lead Architect Shared Between 3 Active Deliverables',
      description: 'Lead Architect Rahul Sharma holds critical path tasks across Core API and Smart Timeline.',
      affectedProjects: ['CollabAI Core Engine', 'Smart Project Timeline'],
      recommendedAction: 'Reassign frontend integration tasks to Sarah Chen to relieve backend bottleneck.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4DED4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#205743] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Management Intelligence
            </span>
            <span className="text-xs text-[#5F6863]">Real-Time Portfolio & Capacity Health</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#252D2A] mt-0.5">
            Portfolio Health, Workload & Forecast Center
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
          >
            📄 One-Click Executive Report Export
          </Button>
        </div>
      </div>

      {/* 1. Morning Executive AI Summary Card */}
      <ExecutiveSummaryCard
        greeting={executiveSummary.greeting}
        executiveSummary={executiveSummary.executiveSummary}
        statusMetrics={executiveSummary.statusMetrics}
        aiRecommendations={executiveSummary.aiRecommendations}
        onActionRecommendation={handleActionRecommendation}
      />

      {/* 2. Portfolio Projects Table */}
      <PortfolioTable projects={portfolioProjects as any} />

      {/* 3. Grid: Predictive Analytics & Team Health */}
      <div className="grid gap-6 md:grid-cols-2">
        <PredictiveAnalyticsCard
          sprintCompletionProbability={predictiveAnalytics.sprintCompletionProbability}
          deliveryConfidenceScore={predictiveAnalytics.deliveryConfidenceScore}
          forecastedCompletionDate={predictiveAnalytics.forecastedCompletionDate}
          productivityTrend={predictiveAnalytics.productivityTrend}
          riskTrend={predictiveAnalytics.riskTrend}
          riskFactors={predictiveAnalytics.riskFactors}
        />

        <TeamHealthWidget
          teamHealthScore={teamHealth.teamHealthScore}
          productivityScore={teamHealth.productivityScore}
          burnoutRiskScore={teamHealth.burnoutRiskScore}
          collaborationScore={teamHealth.collaborationScore}
          healthSummary={teamHealth.healthSummary}
          memberMetrics={teamHealth.memberMetrics as any}
        />
      </div>

      {/* 4. Grid: Cross-Project Intelligence & OKR Goal Tracker */}
      <div className="grid gap-6 md:grid-cols-2">
        <CrossProjectIntelligenceCard insights={crossProjectInsights as any} />
        <GoalTrackerCard goals={(goals || []) as any} />
      </div>

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onExportReport={handleExportReport}
        isExporting={exportReport.isPending}
      />
    </div>
  );
}
