'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export interface FullSprintPlan {
  sprintGoal: string;
  sprintNumber?: number;
  currentSprintTasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    assigneeName?: string | null;
    estimatedEffort?: string;
  }>;
  nextSprintTasks: Array<{
    id: string;
    title: string;
    priority: string;
    assigneeName?: string | null;
    estimatedEffort?: string;
  }>;
  backlogTasks: Array<{
    id: string;
    title: string;
    priority: string;
    assigneeName?: string | null;
    estimatedEffort?: string;
  }>;
  estimatedDurationDays: number;
  predictedCompletionDate: string;
  capacityUtilization: number;
  risks: string[];
}

interface Props {
  sprintPlan: FullSprintPlan;
}

export function SprintPlanningView({ sprintPlan }: Props) {
  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#5F6863] uppercase tracking-wider">Sprint Goal</span>
          <p className="mt-1 text-xs font-bold text-[#252D2A] line-clamp-2">{sprintPlan.sprintGoal}</p>
        </div>

        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#5F6863] uppercase tracking-wider">Estimated Duration</span>
          <p className="mt-1 text-lg font-extrabold text-[#205743]">
            {sprintPlan.estimatedDurationDays} Days
          </p>
          <span className="text-[10px] text-[#5F6863]">2-Week Sprint Cycle</span>
        </div>

        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#5F6863] uppercase tracking-wider">Target Completion</span>
          <p className="mt-1 text-lg font-extrabold text-[#205743]">
            {sprintPlan.predictedCompletionDate}
          </p>
          <span className="text-[10px] text-[#205743] font-medium">92% On-time Confidence</span>
        </div>

        <div className="rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#5F6863] uppercase tracking-wider">Team Capacity Used</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-extrabold text-[#252D2A]">
              {sprintPlan.capacityUtilization}%
            </span>
            <span className="rounded-md bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[10px] font-bold text-[#205743]">
              Balanced
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#E4DED4] overflow-hidden">
            <div
              className="h-full bg-[#205743] transition-all duration-500 rounded-full"
              style={{ width: `${sprintPlan.capacityUtilization}%` }}
            />
          </div>
        </div>
      </div>

      {/* Risks Alert Banner */}
      {sprintPlan.risks && sprintPlan.risks.length > 0 && (
        <div className="rounded-lg border border-[#C56D4B]/30 bg-[#C56D4B]/5 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#252D2A]">
            <AlertTriangle className="w-4 h-4 text-[#C56D4B]" />
            <span>AI Risk Prediction Alert</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-xs text-[#5F6863]">
            {sprintPlan.risks.map((risk, idx) => (
              <li key={idx}>• {risk}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sprint Task Columns */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Column 1: Current Sprint */}
        <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/60 p-4">
          <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#205743]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
                Current Sprint ({sprintPlan.currentSprintTasks.length})
              </h4>
            </div>
            <span className="rounded-md bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[10px] font-bold text-[#205743]">
              Active
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {sprintPlan.currentSprintTasks.map((task, idx) => (
              <motion.div
                key={task.id || idx}
                whileHover={{ y: -2 }}
                className="rounded-lg border border-[#E4DED4] bg-white p-3.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C56D4B] bg-[#C56D4B]/10 border border-[#C56D4B]/20 px-1.5 py-0.5 rounded">
                    {task.priority}
                  </span>
                  {task.estimatedEffort && (
                    <span className="text-[10px] text-[#5F6863] font-medium">{task.estimatedEffort}</span>
                  )}
                </div>
                <h5 className="mt-2 text-xs font-bold text-[#252D2A]">{task.title}</h5>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#5F6863] border-t border-[#E4DED4] pt-2">
                  <span>Assignee:</span>
                  <span className="font-semibold text-[#205743]">{task.assigneeName || 'Rahul'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Column 2: Next Sprint */}
        <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/60 p-4">
          <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D4A545]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
                Next Sprint ({sprintPlan.nextSprintTasks.length})
              </h4>
            </div>
            <span className="rounded-md bg-[#D4A545]/15 border border-[#D4A545]/30 px-2 py-0.5 text-[10px] font-bold text-[#8A661C]">
              Queued
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {sprintPlan.nextSprintTasks.map((task, idx) => (
              <motion.div
                key={task.id || idx}
                whileHover={{ y: -2 }}
                className="rounded-lg border border-[#E4DED4] bg-white p-3.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A661C] bg-[#D4A545]/15 border border-[#D4A545]/30 px-1.5 py-0.5 rounded">
                    {task.priority}
                  </span>
                  {task.estimatedEffort && (
                    <span className="text-[10px] text-[#5F6863] font-medium">{task.estimatedEffort}</span>
                  )}
                </div>
                <h5 className="mt-2 text-xs font-bold text-[#252D2A]">{task.title}</h5>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#5F6863] border-t border-[#E4DED4] pt-2">
                  <span>Assignee:</span>
                  <span className="font-semibold text-[#205743]">{task.assigneeName || 'Sarah'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Column 3: Backlog */}
        <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/60 p-4">
          <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#8C9590]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
                Backlog ({sprintPlan.backlogTasks.length})
              </h4>
            </div>
            <span className="rounded-md bg-[#E4DED4] px-2 py-0.5 text-[10px] font-bold text-[#5F6863]">
              Future
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {sprintPlan.backlogTasks.map((task, idx) => (
              <motion.div
                key={task.id || idx}
                className="rounded-lg border border-[#E4DED4] bg-white p-3.5 shadow-2xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6863] bg-[#F7F5F0] border border-[#E4DED4] px-1.5 py-0.5 rounded">
                  {task.priority}
                </span>
                <h5 className="mt-2 text-xs font-bold text-[#252D2A]">{task.title}</h5>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

