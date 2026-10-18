'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { TimelineTask } from '@/lib/queries/timeline';
import { Layers, AlertTriangle, Flag, Link2, ArrowLeft, ArrowRight, X } from 'lucide-react';

interface Props {
  tasks: TimelineTask[];
  criticalPathTaskIds: string[];
  onAddDependency: (predecessorId: string, successorId: string) => void;
  onRemoveDependency: (dependencyId: string) => void;
}

export function GanttTimelineView({ tasks, criticalPathTaskIds, onAddDependency, onRemoveDependency }: Props) {
  const [zoomLevel, setZoomLevel] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);

  const displayTasks = showCriticalOnly
    ? tasks.filter((t) => criticalPathTaskIds.includes(t.id))
    : tasks;

  // Timeline headers calculations
  const columnsCount = zoomLevel === 'days' ? 14 : zoomLevel === 'weeks' ? 8 : 6;
  const timeLabels = Array.from({ length: columnsCount }).map((_, i) => {
    if (zoomLevel === 'days') return `Day ${i + 1}`;
    if (zoomLevel === 'weeks') return `Wk ${i + 1}`;
    return `Mth ${i + 1}`;
  });

  return (
    <div className="space-y-4">
      {/* View Controls Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C2421]">Interactive Gantt Timeline</h3>
            <p className="text-xs text-[#525B56]">
              {tasks.length} total tasks &bull; {criticalPathTaskIds.length} critical path items
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Critical Path Toggle */}
          <button
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showCriticalOnly
                ? 'bg-[#FDF2EE] border-[#FADCD0] text-[#C96B4A]'
                : 'border-[#E2DCD2] bg-white text-[#1C2421] hover:bg-[#F0EEE6]'
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${showCriticalOnly ? 'text-[#C96B4A]' : 'text-[#525B56]'}`} />
            {showCriticalOnly ? 'Critical Path Only' : 'Highlight Critical Path'}
          </button>

          {/* Zoom Selector */}
          <div className="flex rounded-lg border border-[#E2DCD2] bg-[#F0EEE6] p-0.5">
            {(['days', 'weeks', 'months'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  zoomLevel === lvl
                    ? 'bg-[#1F4D3A] text-white shadow-xs'
                    : 'text-[#525B56] hover:text-[#1C2421]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div className="overflow-x-auto rounded-xl border border-[#E2DCD2] bg-white shadow-xs">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="flex border-b border-[#E2DCD2] bg-[#F0EEE6]">
            <div className="w-64 shrink-0 border-r border-[#E2DCD2] p-3 text-xs font-bold uppercase tracking-wider text-[#525B56]">
              Task Name
            </div>
            <div className="w-32 shrink-0 border-r border-[#E2DCD2] p-3 text-xs font-bold uppercase tracking-wider text-[#525B56]">
              Assignee
            </div>
            <div className="flex flex-1">
              {timeLabels.map((lbl, idx) => (
                <div
                  key={idx}
                  className="flex flex-1 items-center justify-center border-r border-[#E2DCD2] p-2 text-[11px] font-bold text-[#525B56] last:border-r-0"
                >
                  {lbl}
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-[#E2DCD2]/60">
            {displayTasks.map((task, idx) => {
              const isCritical = criticalPathTaskIds.includes(task.id);
              const colOffset = (idx % (columnsCount - 2)) + 1;
              const colSpan = Math.min(3, columnsCount - colOffset);

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`group flex cursor-pointer transition-colors ${
                    isCritical ? 'bg-[#FDF2EE]/40 hover:bg-[#FDF2EE]/70' : 'hover:bg-[#F7F5F0]'
                  }`}
                >
                  {/* Task Name Column */}
                  <div className="flex w-64 shrink-0 items-center justify-between border-r border-[#E2DCD2] p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {task.isMilestone ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#FEF8EC] border border-[#F6E3B8] text-[#C89B3C]">
                          <Flag className="h-3 w-3 text-[#C89B3C]" />
                        </span>
                      ) : isCritical ? (
                        <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#C96B4A] animate-pulse" />
                      ) : (
                        <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#1F4D3A]" />
                      )}

                      <span
                        className={`truncate text-xs font-semibold ${
                          isCritical ? 'text-[#C96B4A] font-bold' : 'text-[#1C2421]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {isCritical && (
                      <span className="rounded bg-[#FDF2EE] border border-[#FADCD0] px-1.5 py-0.5 text-[9px] font-bold text-[#C96B4A]">
                        CRITICAL
                      </span>
                    )}
                  </div>

                  {/* Assignee Column */}
                  <div className="flex w-32 shrink-0 items-center border-r border-[#E2DCD2] p-3 text-xs text-[#525B56]">
                    <span className="truncate font-medium">{task.assignee?.name || 'Unassigned'}</span>
                  </div>

                  {/* Timeline Bar Cell Grid */}
                  <div className="relative flex flex-1 items-center px-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(colSpan / columnsCount) * 100}%` }}
                      style={{ marginLeft: `${((colOffset - 1) / columnsCount) * 100}%` }}
                      className={`relative flex h-7 items-center justify-between rounded-lg px-2.5 text-[11px] font-semibold text-white shadow-xs transition-all overflow-hidden ${
                        task.isMilestone
                          ? 'bg-[#C89B3C]'
                          : isCritical
                          ? 'bg-[#C96B4A]'
                          : 'bg-[#1F4D3A]'
                      }`}
                    >
                      <span className="truncate relative z-10">{task.progress}%</span>

                      {/* Progress Inner Fill */}
                      <div
                        className="absolute inset-y-0 left-0 bg-black/15"
                        style={{ width: `${task.progress}%` }}
                      />
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Dependency Detail Drawer */}
      {selectedTask && (
        <div className="rounded-xl border border-[#E2DCD2] bg-[#F7F5F0] p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#1F4D3A]" />
              <span className="text-xs font-bold text-[#1F4D3A]">Task Dependency Chain:</span>
              <span className="text-xs font-bold text-[#1C2421]">{selectedTask.title}</span>
            </div>
            <button
              onClick={() => setSelectedTask(null)}
              className="inline-flex items-center gap-1 text-xs text-[#525B56] hover:text-[#1C2421] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">Blocked By (Predecessors)</span>
              {selectedTask.predecessors.length === 0 ? (
                <p className="mt-1.5 text-xs text-[#525B56]">No predecessors. Ready to start immediately.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {selectedTask.predecessors.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg bg-white border border-[#E2DCD2] p-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1C2421]">
                        <ArrowLeft className="h-3 w-3 text-[#1F4D3A]" />
                        {p.title}
                      </span>
                      <button
                        onClick={() => onRemoveDependency(p.id)}
                        className="text-[10px] font-bold text-[#C96B4A] hover:underline cursor-pointer"
                      >
                        Remove Link
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">Blocks (Successors)</span>
              {selectedTask.successors.length === 0 ? (
                <p className="mt-1.5 text-xs text-[#525B56]">No successor tasks linked.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {selectedTask.successors.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg bg-white border border-[#E2DCD2] p-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1C2421]">
                        <ArrowRight className="h-3 w-3 text-[#1F4D3A]" />
                        {s.title}
                      </span>
                      <button
                        onClick={() => onRemoveDependency(s.id)}
                        className="text-[10px] font-bold text-[#C96B4A] hover:underline cursor-pointer"
                      >
                        Remove Link
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

