'use client';

import React from 'react';
import type { ActionItem } from '@/lib/queries/ai';
import { PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export interface StructuredMeetingSummaryData {
  source?: string;
  overview?: string;
  keyDiscussionPoints?: string[];
  executiveSummary?: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  risks?: string[];
  pendingQuestions?: string[];
  unresolvedQuestions?: string[];
  deadlinesMentioned?: Array<{ topic: string; date: string; urgency: string; context?: string }>;
  suggestedFollowUps?: string[];
  sentiment?: {
    label?: string;
    score?: number;
    summary?: string;
  };
}

interface MeetingSummaryViewProps {
  summary: StructuredMeetingSummaryData;
  onApproveAction?: (action: ActionItem) => void;
  onOpenApprovalHub?: () => void;
}

export function MeetingSummaryView({ summary, onApproveAction, onOpenApprovalHub }: MeetingSummaryViewProps) {
  const sourceLabel = summary.source || 'Meeting Notes';
  const overviewText = summary.overview || summary.executiveSummary || 'No overview available.';
  const discussionPoints = summary.keyDiscussionPoints || [];
  const unresolvedQuestions = summary.unresolvedQuestions || summary.pendingQuestions || [];
  const followUps = summary.suggestedFollowUps || [];
  const risks = summary.risks || [];

  return (
    <div className="space-y-6">
      {/* Source & Header Banner */}
      <div className="rounded-xl border border-[#E2DACF] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DACF]/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#1F4D3A] px-2.5 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
              Source: {sourceLabel}
            </span>
            <span className="text-xs text-[#525B56]">
              {sourceLabel === 'Meeting Notes'
                ? 'Derived strictly from collaborative notes recorded during the meeting'
                : sourceLabel === 'Meeting Transcript'
                ? 'Derived from recorded meeting transcript'
                : 'Derived from available meeting notes and conversation'}
            </span>
          </div>

          {onOpenApprovalHub && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenApprovalHub}
              className="text-xs font-semibold text-[#1F4D3A] border-[#1F4D3A]/30 hover:bg-[#1F4D3A]/5"
            >
              ⚡ Review {summary.actionItems?.length || 0} Action Items in Hub →
            </Button>
          )}
        </div>

        {/* Overview */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F4D3A]">
            ✨ Meeting Overview
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#2D2D2D] font-medium whitespace-pre-line">
            {overviewText}
          </p>
        </div>

        {/* Key Discussion Points */}
        {discussionPoints.length > 0 && (
          <div className="mt-5 border-t border-[#E2DACF]/60 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#525B56] mb-2.5">
              💬 Key Discussion Points
            </h4>
            <ul className="space-y-1.5 text-xs text-[#2D2D2D]">
              {discussionPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#1F4D3A] font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Decisions & Unresolved Questions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Decisions Made */}
        <Section title="Key Decisions Made" badge={`${summary.keyDecisions?.length || 0} Decisions`}>
          {summary.keyDecisions && summary.keyDecisions.length > 0 ? (
            <ul className="space-y-2 text-xs text-[#2D2D2D]">
              {summary.keyDecisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span className="font-medium">{d}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#525B56] italic">No explicit decisions recorded in notes.</p>
          )}
        </Section>

        {/* Unresolved Questions */}
        <Section title="Unresolved Questions & Follow-ups" badge={`${unresolvedQuestions.length} Open`} badgeColor="amber">
          {unresolvedQuestions.length > 0 ? (
            <ul className="space-y-2 text-xs text-[#2D2D2D]">
              {unresolvedQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">?</span>
                  <span className="font-medium">{q}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#525B56] italic">No unresolved questions detected.</p>
          )}
        </Section>
      </div>

      {/* Extracted Action Items */}
      <Section
        title={`Extracted Action Items (${summary.actionItems?.length || 0})`}
        action={
          onOpenApprovalHub ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenApprovalHub}
              className="text-xs bg-[#1F4D3A] hover:bg-[#163E32] text-white"
            >
              Open Task Approval Hub →
            </Button>
          ) : undefined
        }
      >
        <p className="mb-4 text-[11px] text-[#525B56]">
          Tasks require human review and approval before being created in the Kanban board.
        </p>
        <div className="space-y-3">
          {summary.actionItems?.map((item, i) => (
            <motion.div
              key={item.id || i}
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
                    <span className="rounded bg-white border border-[#E2DACF] px-2 py-0.5 text-[10px] font-semibold text-[#2D2D2D]">
                      👤 {item.assignee || 'Unassigned'}
                    </span>
                    {item.dueDate ? (
                      <span className="rounded bg-white border border-[#E2DACF] px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        📅 {item.dueDate}
                      </span>
                    ) : (
                      <span className="rounded bg-white border border-[#E2DACF] px-2 py-0.5 text-[10px] font-semibold text-[#525B56] italic">
                        No deadline
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-[#C89B3C]">
                      {item.confidence || 85}% match
                    </span>
                  </div>
                </div>
                {onApproveAction && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApproveAction(item)}
                    className="text-xs bg-[#1F4D3A] hover:bg-[#163E32] text-white"
                  >
                    + Review & Create
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          {(!summary.actionItems || summary.actionItems.length === 0) && (
            <p className="text-xs text-[#5A5A5A] italic">No action items detected in this meeting.</p>
          )}
        </div>
      </Section>

      {/* Risks & Follow-ups Row */}
      {(risks.length > 0 || followUps.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {risks.length > 0 && (
            <Section title="Risks & Concerns Identified">
              <ul className="space-y-2">
                {risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#2D2D2D]">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C96B4A]" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {followUps.length > 0 && (
            <Section title="Suggested Follow-ups">
              <ul className="space-y-2">
                {followUps.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#2D2D2D]">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#767676]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Internal Section Component ─────────────────────────────────────────────

function Section({
  title,
  badge,
  badgeColor = 'green',
  action,
  children,
}: {
  title: string;
  badge?: string;
  badgeColor?: 'green' | 'amber';
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2DACF] bg-white p-5 shadow-xs">
      <div className="mb-3 flex items-center justify-between border-b border-[#E2DACF]/60 pb-2">
        <h3 className="flex items-center gap-2 text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">
          <span className={`h-2 w-2 rounded-full ${badgeColor === 'amber' ? 'bg-[#8A661C]' : 'bg-[#1F4D3A]'}`} />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                badgeColor === 'amber' ? 'bg-[#D4A545]/15 text-[#8A661C]' : 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
              }`}
            >
              {badge}
            </span>
          )}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}
