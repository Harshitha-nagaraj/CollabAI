'use client';

import type { MeetingSummary, ActionItem } from '@/lib/queries/ai';
import { PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface MeetingSummaryViewProps {
  summary: MeetingSummary;
  onApproveAction?: (action: ActionItem) => void;
}

export function MeetingSummaryView({ summary, onApproveAction }: MeetingSummaryViewProps) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Section title="Executive Summary">
        <p className="text-xs leading-relaxed text-[#2D2D2D] font-medium">{summary.executiveSummary}</p>
      </Section>

      {/* Key Decisions */}
      <Section title="Key Decisions & Approvals">
        <ul className="space-y-2">
          {summary.keyDecisions.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#2D2D2D]">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1F4D3A]" />
              <span className="font-medium">{d}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Action Items */}
      <Section title="Extracted Action Items">
        <div className="space-y-3">
          {summary.actionItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border border-[#E2DACF] bg-[#F7F5F2]/50 p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#2D2D2D]">{item.title}</h4>
                  <p className="mt-1 text-xs text-[#5A5A5A]">{item.description}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={item.priority} />
                    {item.assignee && (
                      <span className="rounded bg-white border border-[#E2DACF] px-2 py-0.5 text-[10px] font-semibold text-[#2D2D2D]">
                        👤 {item.assignee}
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="rounded bg-white border border-[#E2DACF] px-2 py-0.5 text-[10px] font-semibold text-[#2D2D2D]">
                        📅 {item.dueDate}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-[#C89B3C]">
                      {item.confidence}% match
                    </span>
                  </div>
                </div>
                {onApproveAction && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApproveAction(item)}
                  >
                    + Create Task
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          {summary.actionItems.length === 0 && (
            <p className="text-xs text-[#5A5A5A] italic">No action items detected.</p>
          )}
        </div>
      </Section>

      {/* Risks */}
      {summary.risks.length > 0 && (
        <Section title="Risks & Concerns Identified">
          <ul className="space-y-2">
            {summary.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#2D2D2D]">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C96B4A]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pending Questions */}
      {summary.pendingQuestions.length > 0 && (
        <Section title="Pending Questions">
          <ul className="space-y-2">
            {summary.pendingQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#2D2D2D]">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C89B3C]" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Follow-ups */}
      {summary.suggestedFollowUps.length > 0 && (
        <Section title="Suggested Follow-ups">
          <ul className="space-y-2">
            {summary.suggestedFollowUps.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#2D2D2D]">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#767676]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ─── Internal Section Component ─────────────────────────────────────────────

function Section({ title, children }: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2DACF] bg-white p-5 shadow-xs">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-[#2D2D2D] uppercase tracking-wider border-b border-[#E2DACF]/60 pb-2">
        <span className="h-2 w-2 rounded-full bg-[#1F4D3A]" />
        {title}
      </h3>
      {children}
    </div>
  );
}
