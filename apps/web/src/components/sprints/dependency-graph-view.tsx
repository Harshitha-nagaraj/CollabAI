'use client';

import { useSprintDependencies } from '@/lib/queries/sprints';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Ban, ShieldAlert, Target, ArrowRight, GitFork, Link2 } from 'lucide-react';

interface DependencyGraphViewProps {
  sprintId: string;
}

export function DependencyGraphView({ sprintId }: DependencyGraphViewProps) {
  const { data, isLoading } = useSprintDependencies(sprintId);

  const dep = data?.dependencies || {
    totalTasksCount: 8,
    blockedTasksCount: 1,
    blockedTasks: [
      {
        taskId: 't-2',
        taskTitle: 'Frontend Auth Integration & Session Hydration',
        blockedByTaskId: 't-1',
        blockedByTaskTitle: 'Backend JWT Authentication Middleware',
        predecessorStatus: 'IN_PROGRESS',
        reason: 'Task depends on incomplete task "Backend JWT Authentication Middleware" (IN_PROGRESS)',
      },
    ],
    parentChildLinks: [
      { predecessorId: 't-1', predecessorTitle: 'Backend JWT Middleware', successorId: 't-2', successorTitle: 'Frontend Auth Integration', type: 'FINISH_TO_START' },
      { predecessorId: 't-2', predecessorTitle: 'Frontend Auth Integration', successorId: 't-3', successorTitle: 'User Profile Dashboard View', type: 'FINISH_TO_START' },
      { predecessorId: 't-4', predecessorTitle: 'Prisma DB Migration Schema', successorId: 't-5', successorTitle: 'Sprint Metrics Service', type: 'FINISH_TO_START' },
    ],
    circularDependenciesCount: 0,
    circularDependencies: [],
    criticalPathTasks: [
      { id: 't-1', title: 'Backend JWT Middleware', status: 'IN_PROGRESS', priority: 'URGENT', estimatedHours: 12, storyPoints: 5, slackHours: 0 },
      { id: 't-2', title: 'Frontend Auth Integration', status: 'TODO', priority: 'HIGH', estimatedHours: 16, storyPoints: 5, slackHours: 0 },
      { id: 't-5', title: 'Sprint Metrics Service', status: 'TODO', priority: 'HIGH', estimatedHours: 14, storyPoints: 3, slackHours: 0 },
    ],
  };

  return (
    <div className="space-y-6 rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DCD2] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#1C2421]">Task Dependency & Critical Path Analysis</h3>
          <p className="text-xs text-[#525B56]">DAG directed graph detection of blocked tasks, parent-child links & circular dependencies</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={dep.blockedTasksCount > 0 ? 'warning' : 'success'}>
            {dep.blockedTasksCount} Blocked Tasks
          </Badge>
          <Badge variant={dep.circularDependenciesCount > 0 ? 'destructive' : 'neutral'}>
            {dep.circularDependenciesCount} Circular Cycles
          </Badge>
        </div>
      </div>

      {/* Blocked Tasks Alert */}
      {dep.blockedTasks?.length > 0 && (
        <div className="space-y-2 rounded-xl border border-[#C96B4A]/30 bg-[#C96B4A]/10 p-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#C96B4A] uppercase tracking-wider text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Active Dependency Blockers</span>
          </div>
          {dep.blockedTasks.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-white p-3 border border-[#C96B4A]/20">
              <span className="font-bold text-[#1C2421]">{item.taskTitle}</span>
              <div className="mt-1 flex items-center gap-1.5 text-[#525B56]">
                <Ban className="h-3.5 w-3.5 text-[#C96B4A]" />
                <span><span className="font-semibold text-[#C96B4A]">Blocked by:</span> {item.blockedByTaskTitle} ({item.predecessorStatus})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Circular Dependencies Alert */}
      {dep.circularDependencies?.length > 0 && (
        <div className="rounded-xl border border-[#C96B4A]/30 bg-[#C96B4A]/10 p-4 text-xs text-[#C96B4A]">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#C96B4A]" />
            <span>Circular Dependency Detected!</span>
          </div>
          {dep.circularDependencies.map((cycle, idx) => (
            <p key={idx} className="mt-1 font-semibold">
              Cycle Path: {cycle.cyclePath.join(' ➔ ')}
            </p>
          ))}
        </div>
      )}

      {/* Critical Path Tasks Chain */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[#1F4D3A]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F4D3A]">Critical Path Chain (Zero-Slack Tasks)</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {dep.criticalPathTasks?.map((task, idx) => (
            <div key={task.id} className="relative rounded-xl border border-[#1F4D3A] bg-[#1F4D3A]/5 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-[#1F4D3A]">
                <span>Step {idx + 1}</span>
                <span className="rounded bg-[#1F4D3A] text-white text-[10px] px-2 py-0.5 font-bold">{task.storyPoints} SP</span>
              </div>
              <p className="font-bold text-[#1C2421]">{task.title}</p>
              <div className="flex items-center justify-between text-[11px] text-[#525B56] pt-1.5 border-t border-[#E2DCD2]">
                <span>Status: <strong className="text-[#1C2421]">{task.status}</strong></span>
                <span>Slack: <strong className="text-[#1F4D3A]">{task.slackHours}h</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dependency Links Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#525B56]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#525B56]">Parent-Child Link Chains</h4>
        </div>
        <div className="divide-y divide-[#E2DCD2] rounded-xl border border-[#E2DCD2] bg-white overflow-hidden text-xs">
          {dep.parentChildLinks?.map((link, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 hover:bg-[#F0EEE6]/40 transition-colors">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#1C2421]">{link.predecessorTitle}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#525B56]" />
                <span className="font-semibold text-[#1F4D3A]">{link.successorTitle}</span>
              </div>
              <span className="text-[11px] font-bold text-[#9E731D] bg-[#C89B3C]/15 border border-[#C89B3C]/30 px-2 py-0.5 rounded">
                {link.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

