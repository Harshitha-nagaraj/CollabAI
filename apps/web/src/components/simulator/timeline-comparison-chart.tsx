'use client';

import React from 'react';
import type { TimelineDiff, SimulatedTask } from '@/lib/queries/simulations';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TimelineComparisonChartProps {
  timeline: TimelineDiff;
  tasks: SimulatedTask[];
}

export function TimelineComparisonChart({ timeline, tasks }: TimelineComparisonChartProps) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-5">
      {/* Top Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E4DED4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-sm font-bold text-[#252D2A]">
              Timeline Comparison (Baseline vs Simulated)
            </h3>
          </div>
          <p className="text-xs text-[#5F6863] mt-0.5">
            Milestones and task schedule variance tracking.
          </p>
        </div>

        {/* Completion Dates Badge */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="rounded-lg bg-[#F7F5F0] border border-[#E4DED4] px-3 py-1.5 text-[#5F6863]">
            <span>Baseline Target: </span>
            <span className="font-semibold text-[#252D2A]">
              {timeline.baselineCompletionDate}
            </span>
          </div>

          <div className="rounded-lg bg-[#205743]/10 border border-[#205743]/20 px-3 py-1.5 text-[#205743]">
            <span>Simulated Completion: </span>
            <span className="font-bold">
              {timeline.simulatedCompletionDate}
            </span>
          </div>
        </div>
      </div>

      {/* Milestone Alerts */}
      {(timeline.delayedMilestones.length > 0 || timeline.improvedMilestones.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {timeline.delayedMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-[#C56D4B]/30 bg-[#C56D4B]/5 px-3.5 py-2 text-xs text-[#252D2A]"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C56D4B]" />
                <span className="font-semibold">{m.title}</span>
              </div>
              <span className="font-bold bg-[#C56D4B]/15 px-2 py-0.5 rounded text-[11px] text-[#C56D4B]">
                +{m.delayDays}d Delayed ({m.newDate})
              </span>
            </div>
          ))}

          {timeline.improvedMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-[#205743]/30 bg-[#205743]/5 px-3.5 py-2 text-xs text-[#252D2A]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#205743]" />
                <span className="font-semibold">{m.title}</span>
              </div>
              <span className="font-bold bg-[#205743]/15 px-2 py-0.5 rounded text-[11px] text-[#205743]">
                -{m.advanceDays}d Accelerated ({m.newDate})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Gantt Bar Comparison */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[#5F6863] uppercase tracking-wider">
          <span>Task / Deliverable</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8C9590]"></span> Baseline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#205743]"></span> Simulated (On-Time)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C56D4B]"></span> Critical / Delayed
            </span>
          </div>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {tasks.map((task) => {
            const hasDelay = task.delayDays > 0;
            const isCritical = task.isCritical;

            return (
              <div
                key={task.id}
                className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-3"
              >
                <div className="flex items-center justify-between mb-1.5 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-[#252D2A]">{task.title}</span>
                    {task.isMilestone && (
                      <span className="rounded bg-[#D4A545]/15 border border-[#D4A545]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#8A661C]">
                        Milestone
                      </span>
                    )}
                    {isCritical && (
                      <span className="rounded bg-[#C56D4B]/15 border border-[#C56D4B]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#C56D4B]">
                        Critical Path
                      </span>
                    )}
                  </div>
                  <span className="text-[#5F6863] text-[11px]">
                    Assignee: {task.assigneeName} | {task.estimatedHours}h
                  </span>
                </div>

                {/* Stacked Schedule Bar */}
                <div className="space-y-1">
                  {/* Baseline Schedule Bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-medium text-[#5F6863]">Baseline</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#E4DED4] overflow-hidden">
                      <div
                        className="h-full bg-[#8C9590] rounded-full"
                        style={{ width: `${Math.max(20, Math.min(100, task.progress || 60))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Simulated Schedule Bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-medium text-[#205743]">Simulated</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#E4DED4] overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          hasDelay ? 'bg-[#C56D4B]' : isCritical ? 'bg-[#D4A545]' : 'bg-[#205743]'
                        }`}
                        style={{ width: `${Math.max(25, Math.min(100, (task.progress || 60) + (hasDelay ? 15 : 0)))}%` }}
                      ></div>
                    </div>
                    {hasDelay && (
                      <span className="text-[10px] font-bold text-[#C56D4B] bg-[#C56D4B]/15 border border-[#C56D4B]/30 px-1.5 py-0.2 rounded">
                        +{task.delayDays}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

