'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useReleaseDashboard, useCreateRelease, useReleases } from '@/lib/queries/releases';
import {
  Rocket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Layers,
  Activity,
  Plus,
  GitPullRequest,
  Check,
  ChevronRight,
  TrendingUp,
  Server,
  User,
} from 'lucide-react';

interface ReleaseDashboardViewProps {
  workspaceId: string;
  onNavigateToNotes?: (version: string) => void;
}

export function ReleaseDashboardView({ workspaceId, onNavigateToNotes }: ReleaseDashboardViewProps) {
  const { toast } = useToast();
  const { data: releasesData } = useReleases(workspaceId);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useReleaseDashboard(workspaceId, selectedReleaseId);
  const createReleaseMutation = useCreateRelease();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v2.5.0');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  const d = data?.dashboard || {
    releaseName: 'Release v2.4.0 — Enterprise Intelligence',
    releaseVersion: 'v2.4.0',
    targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    confidenceScore: 88,
    status: 'SCHEDULED',
    completedFeaturesCount: 14,
    pendingFeaturesCount: 6,
    blockedFeaturesCount: 2,
    resolvedBugsCount: 5,
    completedFeaturesSummary: [
      { id: '1', title: 'Sprint Management Lifecycle', assignee: 'Alex Rivera' },
      { id: '2', title: 'AI Sprint Backlog Planner', assignee: 'Sarah Chen' },
      { id: '3', title: 'DAG Task Dependency Engine', assignee: 'David Kim' },
    ],
    pendingFeaturesSummary: [
      { id: '4', title: 'GitHub PR Release Automation', assignee: 'Elena Rostova' },
      { id: '5', title: 'Staging Environment Dry Run', assignee: 'Alex Rivera' },
    ],
    blockedFeaturesSummary: [
      { id: '6', title: 'WebRTC Multi-party Audio Sync', assignee: 'Sarah Chen' },
    ],
    sprintProgressList: [
      { sprintId: 's1', sprintName: 'Sprint 22 — Core Foundations', status: 'COMPLETED', totalTasks: 12, completedTasks: 12, completionPct: 100 },
      { sprintId: 's2', sprintName: 'Sprint 23 — Meeting & Knowledge', status: 'COMPLETED', totalTasks: 10, completedTasks: 10, completionPct: 100 },
      { sprintId: 's3', sprintName: 'Sprint 24 — Sprint & Release Engine', status: 'ACTIVE', totalTasks: 10, completedTasks: 7, completionPct: 70 },
    ],
    milestones: [
      { id: 'm1', title: 'Core Architecture Freeze', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'COMPLETED' },
      { id: 'm2', title: 'Security Audit & Compliance', dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), status: 'OPEN' },
      { id: 'm3', title: 'Staging Environment Dry Run', dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(), status: 'OPEN' },
    ],
    deploymentStatus: {
      environment: 'Staging-US-East',
      lastDeployedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      buildVersion: 'v2.4.0',
      status: 'HEALTHY',
      automatedTestsPassing: '99.4%',
      securityVulnerabilities: 0,
    },
    openRisks: [
      'Third-party WebRTC API rate limiting could delay video sync tests by 2 days.',
      'Staging database index optimization pending for high-throughput queries.',
    ],
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !version.trim()) return;
    try {
      await createReleaseMutation.mutateAsync({
        name: name.trim(),
        version: version.trim(),
        targetDate: targetDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: notes.trim() || undefined,
        workspaceId,
      });
      toast(`Release plan '${version}' created successfully!`, 'success');
      setShowCreateModal(false);
      setName('');
      setNotes('');
    } catch (err: any) {
      toast(err.message || 'Failed to create release plan', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#E2DCD2] bg-white">
        <div className="flex items-center gap-3 text-xs font-semibold text-[#525B56]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1F4D3A] border-t-transparent" />
          Loading release dashboard data...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[#C93B3B]/20 bg-[#FFF5F5] p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-[#C93B3B]" />
        <h3 className="mt-2 text-sm font-bold text-[#1C2421]">Unable to load release dashboard</h3>
        <p className="mt-1 text-xs text-[#525B56]">There was an issue fetching the release metrics for this workspace.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-[#E2DCD2]">
          Retry Loading
        </Button>
      </div>
    );
  }

  const releases = releasesData?.releases || [];

  return (
    <div className="space-y-6">
      {/* Selector & Header Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[#1F4D3A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#525B56]">Active Release Candidate</span>
          </div>
          {releases.length > 0 && (
            <select
              value={selectedReleaseId || ''}
              onChange={(e) => setSelectedReleaseId(e.target.value || undefined)}
              className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] px-3 py-1.5 text-xs font-medium text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            >
              <option value="">Latest Release ({d.releaseVersion})</option>
              {releases.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.version} - {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToNotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToNotes(d.releaseVersion)}
              className="gap-1.5 border-[#E2DCD2] text-xs font-semibold text-[#1C2421] hover:bg-[#F0EEE6]"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-[#1F4D3A]" />
              View Release Notes
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5 bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32]"
          >
            <Plus className="h-4 w-4" />
            Create Release Plan
          </Button>
        </div>
      </div>

      {/* Main Release Candidate Overview Card */}
      <div className="rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2DCD2] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#1F4D3A]/10 px-2 py-0.5 text-xs font-extrabold text-[#1F4D3A]">
                {d.releaseVersion}
              </span>
              <Badge variant={d.status === 'RELEASED' ? 'success' : d.status === 'SCHEDULED' ? 'warning' : 'neutral'}>
                {d.status}
              </Badge>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-[#1C2421]">{d.releaseName}</h3>
            <div className="flex items-center gap-4 text-xs text-[#525B56] pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#525B56]" />
                Target Date:{' '}
                <span className="font-semibold text-[#1C2421]">
                  {new Date(d.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-[#525B56]" />
                Workspace Scope
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1F4D3A] text-white font-extrabold text-lg shadow-xs">
              {d.confidenceScore}%
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#1F4D3A] uppercase tracking-wider block">RELEASE CONFIDENCE</span>
              <p className="text-xs font-medium text-[#525B56]">High probability of on-time delivery</p>
            </div>
          </div>
        </div>

        {/* Status Counter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4">
            <div className="flex items-center justify-between text-[#1F4D3A]">
              <span className="text-xs font-semibold text-[#525B56]">Completed Features</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#1F4D3A]">{d.completedFeaturesCount}</p>
          </div>

          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4">
            <div className="flex items-center justify-between text-[#C89B3C]">
              <span className="text-xs font-semibold text-[#525B56]">Pending Features</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#9E731D]">{d.pendingFeaturesCount}</p>
          </div>

          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4">
            <div className="flex items-center justify-between text-[#C96B4A]">
              <span className="text-xs font-semibold text-[#525B56]">Blocked Features</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#C96B4A]">{d.blockedFeaturesCount}</p>
          </div>

          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4">
            <div className="flex items-center justify-between text-[#1C2421]">
              <span className="text-xs font-semibold text-[#525B56]">Resolved Bugs</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#1C2421]">{d.resolvedBugsCount}</p>
          </div>
        </div>

        {/* Feature Breakdown 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Completed Features Column */}
          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F4D3A]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed Deliverables ({d.completedFeaturesSummary?.length || 0})</span>
            </div>
            <div className="space-y-2">
              {d.completedFeaturesSummary?.length === 0 ? (
                <p className="text-xs italic text-[#525B56]">No completed deliverables yet</p>
              ) : (
                d.completedFeaturesSummary?.map((f) => (
                  <div key={f.id} className="rounded-lg border border-[#E2DCD2] bg-white p-3 space-y-1">
                    <p className="text-xs font-semibold text-[#1C2421]">{f.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#525B56]">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#525B56]" />
                        {f.assignee}
                      </span>
                      <span className="font-medium text-[#1F4D3A]">Done</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Features Column */}
          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9E731D]">
              <Clock className="h-4 w-4" />
              <span>Pending Deliverables ({d.pendingFeaturesSummary?.length || 0})</span>
            </div>
            <div className="space-y-2">
              {d.pendingFeaturesSummary?.length === 0 ? (
                <p className="text-xs italic text-[#525B56]">No pending items</p>
              ) : (
                d.pendingFeaturesSummary?.map((f) => (
                  <div key={f.id} className="rounded-lg border border-[#E2DCD2] bg-white p-3 space-y-1">
                    <p className="text-xs font-semibold text-[#1C2421]">{f.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#525B56]">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#525B56]" />
                        {f.assignee}
                      </span>
                      <span className="font-medium text-[#9E731D]">In Progress</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Blocked Features Column */}
          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C96B4A]">
              <AlertTriangle className="h-4 w-4" />
              <span>Blocked Deliverables ({d.blockedFeaturesSummary?.length || 0})</span>
            </div>
            <div className="space-y-2">
              {d.blockedFeaturesSummary?.length === 0 ? (
                <p className="text-xs italic text-[#525B56]">No blocked items</p>
              ) : (
                d.blockedFeaturesSummary?.map((f) => (
                  <div key={f.id} className="rounded-lg border border-[#C96B4A]/30 bg-white p-3 space-y-1">
                    <p className="text-xs font-semibold text-[#1C2421]">{f.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#525B56]">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#525B56]" />
                        {f.assignee}
                      </span>
                      <span className="font-medium text-[#C96B4A]">Blocked</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sprints Progress & Deployment Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Completion Tracker */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#1F4D3A]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">Sprint Scope Completion</h4>
            </div>
            <span className="text-xs font-medium text-[#525B56]">{d.sprintProgressList?.length || 0} Associated Sprints</span>
          </div>

          <div className="space-y-3">
            {d.sprintProgressList?.map((s) => (
              <div key={s.sprintId} className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1C2421]">{s.sprintName}</span>
                  <Badge variant={s.status === 'COMPLETED' ? 'success' : 'warning'}>{s.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#525B56]">
                  <span>{s.completedTasks} / {s.totalTasks} tasks completed</span>
                  <span className="font-bold text-[#1F4D3A]">{s.completionPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2DCD2]">
                  <div
                    className="h-full rounded-full bg-[#1F4D3A] transition-all duration-300"
                    style={{ width: `${s.completionPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Health & Security Status */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[#1F4D3A]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">Deployment Health & Pipeline</h4>
            </div>
            <Badge variant="success">HEALTHY</Badge>
          </div>

          <div className="space-y-2.5 text-xs text-[#525B56]">
            <div className="flex items-center justify-between py-1.5 border-b border-[#E2DCD2]/60">
              <span>Environment Target:</span>
              <span className="font-bold text-[#1C2421]">{d.deploymentStatus.environment}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#E2DCD2]/60">
              <span>Last Deployment Timestamp:</span>
              <span className="font-medium text-[#1C2421]">
                {new Date(d.deploymentStatus.lastDeployedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#E2DCD2]/60">
              <span>Active Build Version:</span>
              <span className="font-bold text-[#1F4D3A]">{d.deploymentStatus.buildVersion}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#E2DCD2]/60">
              <span>Automated Test Pass Rate:</span>
              <span className="font-bold text-[#1F4D3A]">{d.deploymentStatus.automatedTestsPassing}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>Security Vulnerabilities:</span>
              <span className="font-bold text-[#1F4D3A]">{d.deploymentStatus.securityVulnerabilities} Detected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones & Risk Assessment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Release Milestones */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">Release Milestones</h4>
            <span className="text-xs text-[#525B56]">{d.milestones?.length || 0} Items</span>
          </div>

          <div className="space-y-2 text-xs">
            {d.milestones?.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-[#E2DCD2] bg-[#F7F5F0]">
                <div>
                  <p className="font-bold text-[#1C2421]">{m.title}</p>
                  <span className="text-[11px] text-[#525B56]">
                    Due: {new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <Badge variant={m.status === 'COMPLETED' ? 'success' : 'warning'}>{m.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Open Risks & Mitigation */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C96B4A]">Open Risk Assessment</h4>
            <span className="text-xs text-[#525B56]">{d.openRisks?.length || 0} Identified</span>
          </div>

          <div className="space-y-2 text-xs">
            {d.openRisks?.map((risk, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-[#F4D6CC] bg-[#FFF8F6] p-3 text-[#1C2421]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#C96B4A] mt-0.5" />
                <p className="leading-relaxed">{risk}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Release Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Release Plan" maxWidth="max-w-md">
        <form onSubmit={handleCreateRelease} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Release Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Release v2.5.0 — Core Intelligence Engine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Version Identifier</label>
            <input
              type="text"
              required
              placeholder="e.g. v2.5.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Target Delivery Date</label>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1C2421] mb-1">Release Notes & Scope Summary</label>
            <textarea
              rows={3}
              placeholder="Describe scope, objectives, or key deliverables for this release..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2DCD2]">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)} className="border-[#E2DCD2]">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={createReleaseMutation.isPending}
              className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              Save Release Plan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

