'use client';

import { useState } from 'react';
import { useProjectIntelligence } from '@/lib/queries/projects';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  HelpCircle,
  TrendingUp,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  CheckSquare,
} from 'lucide-react';
import type { Priority } from '@/types';

interface ProjectIntelligenceSectionProps {
  projectId: string;
  onNavigateToTasks?: (filter?: { status?: string; assignee?: string }) => void;
  onNavigateToTeam?: () => void;
}

export function ProjectIntelligenceSection({
  projectId,
  onNavigateToTasks,
  onNavigateToTeam,
}: ProjectIntelligenceSectionProps) {
  const { data: intelligence, isLoading, isError, refetch, isFetching } = useProjectIntelligence(projectId);

  // Sub-tab selection: 'overview' | 'risks' | 'workload' | 'recommendations'
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'risks' | 'workload' | 'recommendations'>('overview');
  const [showExplainability, setShowExplainability] = useState(false);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs animate-pulse space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2DCD2]/70 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#EAE5DC]" />
            <div className="space-y-1.5">
              <div className="h-4 w-44 rounded bg-[#EAE5DC]" />
              <div className="h-3 w-64 rounded bg-[#F2EFE9]" />
            </div>
          </div>
          <div className="h-6 w-20 rounded bg-[#EAE5DC]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="h-24 rounded-lg bg-[#F7F5F0]" />
          <div className="h-24 rounded-lg bg-[#F7F5F0]" />
          <div className="h-24 rounded-lg bg-[#F7F5F0]" />
          <div className="h-24 rounded-lg bg-[#F7F5F0]" />
        </div>
      </div>
    );
  }

  if (isError || !intelligence) {
    return (
      <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-4 text-xs text-[#525B56] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#C93B3B]" />
          <span>Unable to calculate project intelligence right now.</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs border-[#E2DCD2]">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const { health, risks, workload, recommendations } = intelligence;
  const isHealthy = health.status === 'HEALTHY';
  const isNeedsAttention = health.status === 'NEEDS_ATTENTION';
  const isAtRisk = health.status === 'AT_RISK';

  // Badge styling
  const statusColorClass = isHealthy
    ? 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/30'
    : isNeedsAttention
    ? 'bg-[#C89B3C]/15 text-[#9E731D] border-[#C89B3C]/30'
    : 'bg-[#C93B3B]/10 text-[#C93B3B] border-[#C93B3B]/25';

  const statusBgGlow = isHealthy
    ? 'border-l-4 border-l-[#1F4D3A]'
    : isNeedsAttention
    ? 'border-l-4 border-l-[#C89B3C]'
    : 'border-l-4 border-l-[#C93B3B]';

  return (
    <div className={`rounded-xl border border-[#E2DCD2] bg-white shadow-xs overflow-hidden transition-all ${statusBgGlow}`}>
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2]/80 bg-[#FAF8F5] px-5 py-3.5 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1C2421]">Smart Project Intelligence</h3>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${statusColorClass}`}>
                {health.status.replace('_', ' ')} ({health.score}/100)
              </span>
            </div>
            <p className="text-xs text-[#525B56]">Explainable health assessment, risk detection & capacity balance</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 text-xs text-[#525B56] hover:text-[#1C2421]"
            title="Recalculate project metrics"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isFetching ? 'animate-spin text-[#1F4D3A]' : ''}`} />
            <span>{isFetching ? 'Analyzing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Banner (Health Score + Quick Underlying Metrics) */}
      <div className="p-5 border-b border-[#E2DCD2]/60 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Health Score Dial */}
          <div className="md:col-span-4 rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/70 p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#525B56]">
                <span>Health Assessment</span>
                <button
                  onClick={() => setShowExplainability(!showExplainability)}
                  className="text-[#1F4D3A] hover:underline flex items-center text-[11px] font-bold"
                  title="Toggle score factors"
                >
                  <HelpCircle className="h-3 w-3 mr-0.5" />
                  {showExplainability ? 'Hide factors' : 'Why?'}
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${
                  isHealthy ? 'text-[#1F4D3A]' : isNeedsAttention ? 'text-[#9E731D]' : 'text-[#C93B3B]'
                }`}>
                  {health.score}
                </span>
                <span className="text-xs font-semibold text-[#525B56]">/ 100</span>
              </div>
              <div className="text-[11px] text-[#525B56]">
                {health.metrics.completionRate}% completion velocity
              </div>
            </div>

            {/* Score Progress Gauge */}
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#E2DCD2]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isHealthy ? 'text-[#1F4D3A]' : isNeedsAttention ? 'text-[#C89B3C]' : 'text-[#C93B3B]'}
                  strokeDasharray={`${health.score}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-[11px] font-bold text-[#1C2421]">
                {health.score}%
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Overdue */}
            <div className="rounded-lg border border-[#E2DCD2] p-2.5 bg-[#F7F5F0]/50">
              <div className="text-[11px] font-semibold text-[#525B56] flex items-center justify-between">
                <span>Overdue Tasks</span>
                <Clock className="h-3 w-3 text-[#C93B3B]" />
              </div>
              <div className={`mt-1 text-base font-bold ${health.metrics.overdueTasks > 0 ? 'text-[#C93B3B]' : 'text-[#1C2421]'}`}>
                {health.metrics.overdueTasks}
              </div>
              <div className="text-[10px] text-[#525B56]">
                {health.metrics.overdueTasks > 0 ? 'Past deadline' : 'None overdue'}
              </div>
            </div>

            {/* Blocked */}
            <div className="rounded-lg border border-[#E2DCD2] p-2.5 bg-[#F7F5F0]/50">
              <div className="text-[11px] font-semibold text-[#525B56] flex items-center justify-between">
                <span>Blockers</span>
                <AlertTriangle className="h-3 w-3 text-[#C89B3C]" />
              </div>
              <div className={`mt-1 text-base font-bold ${health.metrics.blockedTasks > 0 ? 'text-[#9E731D]' : 'text-[#1C2421]'}`}>
                {health.metrics.blockedTasks}
              </div>
              <div className="text-[10px] text-[#525B56]">
                {health.metrics.blockedTasks > 0 ? 'Pending predecessors' : 'Clean dependency flow'}
              </div>
            </div>

            {/* Stalled */}
            <div className="rounded-lg border border-[#E2DCD2] p-2.5 bg-[#F7F5F0]/50">
              <div className="text-[11px] font-semibold text-[#525B56] flex items-center justify-between">
                <span>Stalled Work</span>
                <Clock className="h-3 w-3 text-[#525B56]" />
              </div>
              <div className={`mt-1 text-base font-bold ${health.metrics.stalledTasks > 0 ? 'text-[#9E731D]' : 'text-[#1C2421]'}`}>
                {health.metrics.stalledTasks}
              </div>
              <div className="text-[10px] text-[#525B56]">
                {health.metrics.stalledTasks > 0 ? '>7 days inactive' : 'Active velocity'}
              </div>
            </div>

            {/* Unassigned */}
            <div className="rounded-lg border border-[#E2DCD2] p-2.5 bg-[#F7F5F0]/50">
              <div className="text-[11px] font-semibold text-[#525B56] flex items-center justify-between">
                <span>Unassigned</span>
                <Users className="h-3 w-3 text-[#1F4D3A]" />
              </div>
              <div className={`mt-1 text-base font-bold ${health.metrics.unassignedTasks > 0 ? 'text-[#1C2421]' : 'text-[#1F4D3A]'}`}>
                {health.metrics.unassignedTasks}
              </div>
              <div className="text-[10px] text-[#525B56]">
                {health.metrics.unassignedTasks > 0 ? 'Need designated owner' : '100% assigned'}
              </div>
            </div>
          </div>
        </div>

        {/* Explainability Breakdown Panel (Expandable) */}
        <AnimatePresence>
          {showExplainability && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-[#E2DCD2]/60 overflow-hidden"
            >
              <div className="rounded-lg border border-[#E2DCD2] bg-[#FAF8F5] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1C2421] flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-[#1F4D3A]" />
                    Explainable Score Factors
                  </h4>
                  <span className="text-[11px] text-[#525B56]">Calculated from underlying project execution data</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {health.explainability.map((factor, idx) => {
                    const isNeg = factor.impact === 'NEGATIVE';
                    const isPos = factor.impact === 'POSITIVE';
                    return (
                      <div
                        key={idx}
                        className="rounded border border-[#E2DCD2] p-2.5 bg-white flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1C2421]">{factor.factor}</span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                isNeg
                                  ? 'bg-[#C93B3B]/10 text-[#C93B3B]'
                                  : isPos
                                  ? 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
                                  : 'bg-[#525B56]/10 text-[#525B56]'
                              }`}
                            >
                              {factor.impact}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#525B56] leading-relaxed">{factor.message}</p>
                        </div>
                        {factor.scoreDelta !== undefined && factor.scoreDelta !== 0 && (
                          <span
                            className={`font-mono text-xs font-bold ${
                              factor.scoreDelta < 0 ? 'text-[#C93B3B]' : 'text-[#1F4D3A]'
                            }`}
                          >
                            {factor.scoreDelta > 0 ? `+${factor.scoreDelta}` : factor.scoreDelta} pts
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center border-b border-[#E2DCD2] bg-[#F7F5F0]/60 px-5 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 cursor-pointer transition-all ${
            activeSubTab === 'overview'
              ? 'border-[#1F4D3A] text-[#1F4D3A]'
              : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Intelligence Overview</span>
        </button>

        <button
          onClick={() => setActiveSubTab('risks')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 cursor-pointer transition-all ${
            activeSubTab === 'risks'
              ? 'border-[#1F4D3A] text-[#1F4D3A]'
              : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Risk Detection</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              risks.length > 0 ? 'bg-[#C93B3B]/10 text-[#C93B3B]' : 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
            }`}
          >
            {risks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('workload')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 cursor-pointer transition-all ${
            activeSubTab === 'workload'
              ? 'border-[#1F4D3A] text-[#1F4D3A]'
              : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Workload & Capacity</span>
          {workload.overloadedCount > 0 && (
            <span className="rounded-full bg-[#C93B3B]/15 px-1.5 py-0.2 text-[10px] font-bold text-[#C93B3B]">
              {workload.overloadedCount} overloaded
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('recommendations')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 cursor-pointer transition-all ${
            activeSubTab === 'recommendations'
              ? 'border-[#1F4D3A] text-[#1F4D3A]'
              : 'border-transparent text-[#525B56] hover:text-[#1C2421]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Recommendations</span>
          <span className="rounded-full bg-[#1F4D3A]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#1F4D3A]">
            {recommendations.length}
          </span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      <div className="p-5">
        {/* SUBTAB 1: Overview */}
        {activeSubTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Highlights Card */}
              <div className="rounded-xl border border-[#E2DCD2] bg-[#FAF8F5] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#1C2421] flex items-center justify-between border-b border-[#E2DCD2]/70 pb-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-[#1F4D3A]" />
                    Key Health Findings
                  </span>
                  <span className="text-[11px] font-normal text-[#525B56]">Deterministic assessment</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {health.explainability.slice(0, 4).map((factor, i) => (
                    <div key={i} className="flex items-start gap-2 py-1 border-b border-[#E2DCD2]/40 last:border-0">
                      {factor.impact === 'NEGATIVE' ? (
                        <AlertCircle className="h-3.5 w-3.5 text-[#C93B3B] shrink-0 mt-0.5" />
                      ) : factor.impact === 'POSITIVE' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1F4D3A] shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-3.5 w-3.5 text-[#525B56] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-[#1C2421]">{factor.factor}: </span>
                        <span className="text-[#525B56]">{factor.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Next Steps Preview */}
              <div className="rounded-xl border border-[#E2DCD2] bg-white p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#1C2421] flex items-center justify-between border-b border-[#E2DCD2]/70 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#C89B3C]" />
                    Top Recommendations ({recommendations.length})
                  </span>
                  <button
                    onClick={() => setActiveSubTab('recommendations')}
                    className="text-[11px] font-bold text-[#1F4D3A] hover:underline"
                  >
                    View all
                  </button>
                </h4>

                <div className="space-y-2.5">
                  {recommendations.slice(0, 2).map((rec) => (
                    <div key={rec.id} className="rounded-lg border border-[#E2DCD2] p-2.5 bg-[#F7F5F0]/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1C2421]">{rec.title}</span>
                        <span className="text-[10px] font-bold text-[#1F4D3A] uppercase tracking-wider">{rec.category}</span>
                      </div>
                      <p className="text-[11px] text-[#525B56]">{rec.rationale}</p>
                    </div>
                  ))}
                  {recommendations.length === 0 && (
                    <p className="text-xs text-[#525B56] italic">No active risk recommendations. Execution is healthy!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#525B56] border-t border-[#E2DCD2]/60">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1C2421]">Delivery Status:</span>
                <span>
                  {health.metrics.targetDueDate
                    ? `Milestone targeted for ${new Date(health.metrics.targetDueDate).toLocaleDateString()}`
                    : 'No target delivery date configured'}
                </span>
                {health.metrics.isDeliveryOverdue && (
                  <span className="text-[#C93B3B] font-bold">(Target overdue)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubTab('risks')}
                  className="h-7 text-xs border-[#E2DCD2]"
                >
                  Inspect {risks.length} Detected Risks
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: Risks */}
        {activeSubTab === 'risks' && (
          <div className="space-y-3">
            {risks.length === 0 ? (
              <div className="rounded-xl border border-[#E2DCD2] bg-[#FAF8F5] p-6 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[#1F4D3A]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-[#1C2421]">Zero Active Risks Detected</h4>
                <p className="text-xs text-[#525B56] max-w-md mx-auto">
                  No overdue tasks, dependency blockers, stalled work, or critical unassigned scope detected.
                </p>
              </div>
            ) : (
              risks.map((risk) => {
                const isExpanded = expandedRiskId === risk.id;
                const isHigh = risk.severity === 'HIGH';
                const isMed = risk.severity === 'MEDIUM';

                const badgeBg = isHigh
                  ? 'bg-[#C93B3B]/10 text-[#C93B3B] border-[#C93B3B]/30'
                  : isMed
                  ? 'bg-[#C89B3C]/15 text-[#9E731D] border-[#C89B3C]/30'
                  : 'bg-[#525B56]/10 text-[#525B56] border-[#525B56]/20';

                return (
                  <div
                    key={risk.id}
                    className="rounded-xl border border-[#E2DCD2] bg-white overflow-hidden shadow-2xs transition-all"
                  >
                    <div
                      onClick={() => setExpandedRiskId(isExpanded ? null : risk.id)}
                      className="flex items-center justify-between p-3.5 bg-[#FAF8F5] cursor-pointer hover:bg-[#F2EFE9]/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${badgeBg}`}>
                          {risk.severity} RISK
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#1C2421]">{risk.title}</h4>
                          <p className="text-[11px] text-[#525B56]">{risk.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#525B56]">
                          {risk.affectedCount} affected item(s)
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[#525B56]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#525B56]" />
                        )}
                      </div>
                    </div>

                    {/* Affected items preview */}
                    {isExpanded && (
                      <div className="p-3.5 border-t border-[#E2DCD2]/70 bg-white space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">
                          Affected Task Scope Preview:
                        </div>
                        <div className="space-y-1.5">
                          {risk.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg border border-[#E2DCD2] p-2.5 bg-[#F7F5F0]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-[#1C2421] flex items-center gap-1.5">
                                  <span>{item.title}</span>
                                  {item.priority && (
                                    <span className="rounded bg-white border border-[#E2DCD2] px-1.5 py-0.2 text-[9px] font-bold text-[#525B56]">
                                      {item.priority}
                                    </span>
                                  )}
                                </div>
                                {item.details && (
                                  <div className="text-[11px] text-[#C89B3C] font-medium">{item.details}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#525B56] self-end sm:self-auto">
                                <span>Assignee: <strong className="text-[#1C2421]">{item.assigneeName}</strong></span>
                                {item.dueDate && (
                                  <span>• Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBTAB 3: Workload & Capacity */}
        {activeSubTab === 'workload' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DCD2]/70 pb-3">
              <div>
                <h4 className="text-xs font-bold text-[#1C2421]">Effort-Aware Workload Distribution</h4>
                <p className="text-[11px] text-[#525B56]">
                  Transparent rules factoring hours, high-priority scope, overdue load, and concurrent assignments
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#525B56]">
                  Total Assignees: <strong className="text-[#1C2421]">{workload.totalAssignees}</strong>
                </span>
                {workload.overloadedCount > 0 && (
                  <span className="rounded bg-[#C93B3B]/10 border border-[#C93B3B]/20 px-2 py-0.5 text-[11px] font-bold text-[#C93B3B]">
                    {workload.overloadedCount} Overloaded
                  </span>
                )}
              </div>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workload.members.map((member) => {
                const isOver = member.status === 'OVERLOADED';
                const isHeavy = member.status === 'HEAVY';
                const isMod = member.status === 'MODERATE';

                const statusBadge = isOver
                  ? 'bg-[#C93B3B]/10 text-[#C93B3B] border-[#C93B3B]/30'
                  : isHeavy
                  ? 'bg-[#C89B3C]/15 text-[#9E731D] border-[#C89B3C]/30'
                  : isMod
                  ? 'bg-[#2B5C7D]/10 text-[#2B5C7D] border-[#2B5C7D]/30'
                  : 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/30';

                return (
                  <div
                    key={member.userId}
                    className="rounded-xl border border-[#E2DCD2] bg-white p-3.5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F4D3A] text-white text-xs font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1C2421]">{member.name}</div>
                          <div className="text-[10px] text-[#525B56]">{member.email || 'Member'}</div>
                        </div>
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
                        {member.status}
                      </span>
                    </div>

                    {/* Metric Indicators */}
                    <div className="grid grid-cols-4 gap-1.5 text-center bg-[#F7F5F0]/70 rounded-lg p-2 text-xs">
                      <div>
                        <div className="text-[10px] text-[#525B56]">Open</div>
                        <div className="font-bold text-[#1C2421]">{member.openTasks}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#525B56]">Urgent/High</div>
                        <div className={`font-bold ${member.urgentOrHighTasks > 0 ? 'text-[#C93B3B]' : 'text-[#1C2421]'}`}>
                          {member.urgentOrHighTasks}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#525B56]">Overdue</div>
                        <div className={`font-bold ${member.overdueTasks > 0 ? 'text-[#C93B3B]' : 'text-[#1C2421]'}`}>
                          {member.overdueTasks}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#525B56]">Hours</div>
                        <div className="font-bold text-[#1C2421]">{member.totalEstimatedHours}h</div>
                      </div>
                    </div>

                    {/* Transparent Overload Reasons */}
                    {member.overloadReasons.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase text-[#525B56]">Capacity Rationale:</div>
                        <ul className="space-y-0.5">
                          {member.overloadReasons.map((r, i) => (
                            <li key={i} className="text-[11px] text-[#C93B3B] flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#C93B3B]" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {workload.members.length === 0 && (
                <div className="col-span-2 rounded-xl border border-[#E2DCD2] bg-[#FAF8F5] p-5 text-center text-xs text-[#525B56]">
                  No assigned team members in this project yet.
                </div>
              )}
            </div>

            {/* Unassigned Work Notification */}
            {workload.unassignedWork.openTasks > 0 && (
              <div className="rounded-xl border border-[#E2DCD2] bg-[#FAF8F5] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#C89B3C] shrink-0" />
                  <div>
                    <span className="font-bold text-[#1C2421]">Unassigned Workload: </span>
                    <span className="text-[#525B56]">
                      {workload.unassignedWork.openTasks} open tasks without an assigned owner (
                      {workload.unassignedWork.urgentOrHighTasks} high/urgent priority)
                    </span>
                  </div>
                </div>
                {onNavigateToTasks && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToTasks({ status: 'TODO', assignee: '' })}
                    className="h-7 text-xs border-[#E2DCD2]"
                  >
                    View Unassigned Tasks
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 4: Recommendations */}
        {activeSubTab === 'recommendations' && (
          <div className="space-y-3">
            <div className="text-[11px] text-[#525B56] border-b border-[#E2DCD2]/70 pb-2 flex items-center justify-between">
              <span>Deterministic suggestions with transparent causal explanations</span>
              <span className="text-[10px] uppercase font-bold text-[#1F4D3A]">Advisory Only</span>
            </div>

            <div className="space-y-3">
              {recommendations.map((rec) => {
                const isHigh = rec.priority === 'HIGH';
                const isMed = rec.priority === 'MEDIUM';

                const priorityBadge = isHigh
                  ? 'bg-[#C93B3B]/10 text-[#C93B3B] border-[#C93B3B]/30'
                  : isMed
                  ? 'bg-[#C89B3C]/15 text-[#9E731D] border-[#C89B3C]/30'
                  : 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/30';

                return (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-[#E2DCD2] bg-white p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DCD2]/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${priorityBadge}`}>
                          {rec.priority} PRIORITY
                        </span>
                        <span className="rounded bg-[#F7F5F0] border border-[#E2DCD2] px-2 py-0.5 text-[10px] font-bold text-[#525B56] uppercase">
                          {rec.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#1C2421]">{rec.title}</h4>
                      </div>
                    </div>

                    {/* Action Suggestion */}
                    <div className="text-xs font-semibold text-[#1F4D3A]">
                      Suggested Action: {rec.action}
                    </div>

                    {/* Why this appears (Rationale) */}
                    <div className="rounded-lg bg-[#FAF8F5] border border-[#E2DCD2] p-2.5 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#525B56] mb-0.5">
                        Why this appears:
                      </div>
                      <p className="text-[#1C2421] leading-relaxed">{rec.rationale}</p>
                    </div>

                    {/* Suggested Steps */}
                    {rec.suggestedSteps && rec.suggestedSteps.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">
                          Actionable Steps:
                        </div>
                        <ul className="space-y-1">
                          {rec.suggestedSteps.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-center gap-1.5 text-[#525B56]">
                              <CheckSquare className="h-3.5 w-3.5 text-[#1F4D3A] shrink-0" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {recommendations.length === 0 && (
                <div className="rounded-xl border border-[#E2DCD2] bg-[#FAF8F5] p-6 text-center text-xs text-[#525B56]">
                  No active recommendations required. Project velocity and workload balance are optimal.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
