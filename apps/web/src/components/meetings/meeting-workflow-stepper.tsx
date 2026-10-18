'use client';

import React from 'react';

export interface WorkflowStep {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
}

const STEPS: WorkflowStep[] = [
  { id: 'meeting', label: '1. Meeting Room', sublabel: 'Live Video/Audio Sync', icon: '🎙️' },
  { id: 'transcript', label: '2. Live Transcript', sublabel: 'Speech-to-Text Capture', icon: '📝' },
  { id: 'ai-engine', label: '3. AI Engine', sublabel: 'Deep Content Processing', icon: '✨' },
  { id: 'summary', label: '4. Exec Summary', sublabel: 'Decisions & Sentiment', icon: '📊' },
  { id: 'tasks', label: '5. Task Generator', sublabel: 'AI Skill Assignment', icon: '⚡' },
  { id: 'sprint', label: '6. Sprint Planner', sublabel: 'Velocity & Capacity', icon: '🚀' },
  { id: 'docs', label: '7. Auto-Docs', sublabel: 'Notes & Decision Log', icon: '📚' },
  { id: 'dashboard', label: '8. Dashboard Sync', sublabel: 'Kanban & Calendar Live', icon: '🔄' },
];

interface Props {
  currentStep: string; // id of active step
  onSelectStep?: (stepId: string) => void;
}

export function MeetingWorkflowStepper({ currentStep, onSelectStep }: Props) {
  const activeIdx = STEPS.findIndex((s) => s.id === currentStep);
  const currentIdx = activeIdx >= 0 ? activeIdx : 0;

  return (
    <div className="w-full rounded-xl border border-[#E4DED4] bg-white p-3 shadow-xs">
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStep?.(step.id)}
                className={`group flex min-w-[120px] flex-1 flex-col items-center justify-center rounded-lg p-2.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#205743] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-[#205743]/10 text-[#205743] border border-[#205743]/20 hover:bg-[#205743]/20'
                    : 'bg-[#F7F5F0] text-[#5F6863] border border-[#E4DED4] hover:bg-[#E4DED4]/50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{step.icon}</span>
                  <span className="text-[12px] font-bold tracking-tight">{step.label}</span>
                </div>
                <span
                  className={`mt-0.5 text-[10px] font-medium ${
                    isActive ? 'text-white/80' : isCompleted ? 'text-[#205743]' : 'text-[#5F6863]'
                  }`}
                >
                  {step.sublabel}
                </span>
              </button>

              {idx < STEPS.length - 1 && (
                <div className="hidden h-0.5 w-3 bg-[#E4DED4] sm:block">
                  <div
                    className="h-full bg-[#205743] transition-all duration-300"
                    style={{ width: idx < currentIdx ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

