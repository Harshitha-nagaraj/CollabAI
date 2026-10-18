'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { History, ArrowRight } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  date: string;
  actor: string;
  link: string;
}

interface Props {
  events: EventItem[];
}

export function KnowledgeTimelineView({ events }: Props) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'DECISION':
      case 'APPROVAL':
        return 'bg-[#E8F3EE] text-[#1F4D3A] border-[#C2DFD3]';
      case 'REJECTION':
      case 'RISK':
        return 'bg-[#FDF2EE] text-[#C96B4A] border-[#FADCD0]';
      case 'MEETING':
        return 'bg-[#F0EEE6] text-[#1C2421] border-[#E2DCD2]';
      default:
        return 'bg-[#F0EEE6] text-[#525B56] border-[#E2DCD2]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5 border-b border-[#E2DCD2] pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
          <History className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1C2421]">Project History & Decision Timeline</h3>
          <p className="text-xs text-[#525B56]">Chronological history of major decisions, sprint changes, and meetings.</p>
        </div>
      </div>

      <div className="relative border-l-2 border-[#E2DCD2] pl-6 ml-4 space-y-4">
        {events.map((evt, idx) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative rounded-xl border border-[#E2DCD2] bg-white p-4 shadow-xs"
          >
            {/* Timeline Circle Bullet */}
            <span className="absolute -left-[31px] top-4 flex h-3.5 w-3.5 rounded-full ring-4 ring-[#F7F5F0] bg-[#1F4D3A]" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(evt.eventType)}`}>
                  {evt.eventType}
                </span>
                <span className="text-xs font-bold text-[#1C2421]">{evt.title}</span>
              </div>
              <span className="text-[11px] font-medium text-[#525B56]">{evt.date}</span>
            </div>

            <p className="mt-2 text-xs text-[#525B56] leading-relaxed">{evt.description}</p>

            <div className="mt-3 flex items-center justify-between border-t border-[#E2DCD2]/60 pt-2 text-[11px] text-[#525B56]">
              <span>Actor: {evt.actor}</span>
              <a href={evt.link} className="inline-flex items-center gap-1 font-semibold text-[#1F4D3A] hover:underline">
                View Details
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

