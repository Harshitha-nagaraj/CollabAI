'use client';

import React from 'react';
import type { TeamPerformanceInsight } from '@/lib/queries/learning';
import { Sprout, Sparkles } from 'lucide-react';

interface TeamCoachingWidgetProps {
  insights: TeamPerformanceInsight;
}

export function TeamCoachingWidget({ insights }: TeamCoachingWidgetProps) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <Sprout className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Team Performance Coaching & Growth Insights
          </h3>
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#205743]/10 text-[#205743] border border-[#205743]/20">
          Growth & Coaching Focused
        </span>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[#F7F5F0] p-3 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Avg Completion Time</span>
          <p className="mt-0.5 text-base font-extrabold text-[#252D2A]">
            {insights.avgTaskCompletionDays} Days
          </p>
        </div>

        <div className="rounded-lg bg-[#F7F5F0] p-3 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Sprint Velocity</span>
          <p className="mt-0.5 text-base font-extrabold text-[#205743]">
            {insights.sprintVelocity} Tasks/Sprint
          </p>
        </div>

        <div className="rounded-lg bg-[#F7F5F0] p-3 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">Collaboration Index</span>
          <p className="mt-0.5 text-base font-extrabold text-[#205743]">
            {insights.collaborationScore}/100
          </p>
        </div>

        <div className="rounded-lg bg-[#F7F5F0] p-3 text-center border border-[#E4DED4]">
          <span className="text-[10px] font-semibold text-[#5F6863]">PR Review Turnaround</span>
          <p className="mt-0.5 text-base font-extrabold text-[#205743]">
            {insights.reviewTurnaroundHours} Hours
          </p>
        </div>
      </div>

      {/* Strengths & Improvement Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Team Strengths */}
        <div className="rounded-lg border border-[#205743]/20 bg-[#205743]/5 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#205743] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Team Strengths
          </h4>
          <ul className="space-y-1.5 text-xs text-[#252D2A]">
            {insights.teamStrengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="font-bold text-[#205743]">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Growth */}
        <div className="rounded-lg border border-[#D4A545]/30 bg-[#D4A545]/5 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A661C] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Opportunities for Coaching
          </h4>
          <ul className="space-y-1.5 text-xs text-[#252D2A]">
            {insights.areasForImprovement.map((area, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="font-bold text-[#D4A545]">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Skill Distribution */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F6863] mb-2.5">
          Workspace Skill Distribution & Resiliency Coverage
        </h4>
        <div className="space-y-2">
          {insights.skillDistribution.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-[#F7F5F0] p-2.5 border border-[#E4DED4]">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-[#252D2A]">{item.skill}</span>
                <span className="text-[#205743] font-bold">{item.coveragePercentage}% Coverage ({item.count} Members)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#E4DED4] overflow-hidden">
                <div
                  className="h-full bg-[#205743] rounded-full"
                  style={{ width: `${item.coveragePercentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coaching Notes */}
      {insights.coachingNotes.length > 0 && (
        <div className="rounded-lg bg-[#205743]/5 border border-[#205743]/20 p-3.5 text-xs text-[#252D2A]">
          <span className="font-bold text-[#205743]">AI Coaching Note: </span>
          {insights.coachingNotes[0]}
        </div>
      )}
    </div>
  );
}

