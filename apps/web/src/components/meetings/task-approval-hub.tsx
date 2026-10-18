'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { ActionItem } from '@/lib/queries/ai';
import { CheckCircle2, Zap, Edit2, Check, Plus, Calendar } from 'lucide-react';

interface Props {
  actionItems: ActionItem[];
  members: Array<{ id: string; name: string; email: string }>;
  onApproveTasks: (approvedTasks: ActionItem[]) => void;
  isSubmitting?: boolean;
}

export function TaskApprovalHub({ actionItems: initialItems, members, onApproveTasks, isSubmitting }: Props) {
  const [items, setItems] = useState<ActionItem[]>(
    initialItems.map((item, idx) => ({
      ...item,
      id: item.id || `task-${idx}-${Date.now()}`,
      approved: item.approved !== undefined ? item.approved : true,
    }))
  );

  useEffect(() => {
    setItems(
      initialItems.map((item, idx) => ({
        ...item,
        id: item.id || `task-${idx}-${Date.now()}`,
        approved: item.approved !== undefined ? item.approved : true,
      }))
    );
  }, [initialItems]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleApproval = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: !item.approved } : item))
    );
  };

  const handleUpdateItem = (id: string, updates: Partial<ActionItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const approvedCount = items.filter((i) => i.approved).length;

  const handleFinalSubmit = () => {
    const approvedTasks = items.filter((i) => i.approved);
    onApproveTasks(approvedTasks);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#205743] text-sm text-white">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#252D2A]">AI Task Approval & Skill Assignment Hub</h3>
          </div>
          <p className="mt-1 text-xs text-[#5F6863]">
            Review, edit assignees, and approve extracted tasks before creating them in the project Kanban board.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#205743]">
            {approvedCount} of {items.length} Approved
          </span>
          <Button
            onClick={handleFinalSubmit}
            loading={isSubmitting}
            disabled={approvedCount === 0}
            className="bg-[#205743] hover:bg-[#163E32] text-white text-xs shadow-xs"
          >
            Approve & Inject to Kanban ({approvedCount})
          </Button>
        </div>
      </div>

      {/* Task Cards Grid or Empty State */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4DED4] bg-white p-12 text-center">
          <span className="text-3xl">📋</span>
          <h4 className="mt-3 text-sm font-bold text-[#252D2A]">No Action Items Extracted</h4>
          <p className="mt-1 text-xs text-[#5F6863] max-w-sm">
            No action items were detected in the meeting content. Once actionable notes or decisions are saved and processed, extracted tasks will appear here for review.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {items.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                    item.approved
                      ? 'border-[#205743]/30 bg-white shadow-xs ring-1 ring-[#205743]/20'
                      : 'border-[#E4DED4] bg-[#F7F5F0]/50 opacity-60'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === 'URGENT' || item.priority === 'HIGH'
                              ? 'bg-[#C56D4B]/15 text-[#C56D4B] border border-[#C56D4B]/30'
                              : 'bg-[#D4A545]/15 text-[#8A661C] border border-[#D4A545]/30'
                          }`}
                        >
                          {item.priority}
                        </span>
                        {item.dueDate && (
                          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> {item.dueDate}
                          </span>
                        )}
                        {item.estimatedEffort && (
                          <span className="rounded-md bg-[#F7F5F0] border border-[#E4DED4] px-2 py-0.5 text-[10px] font-medium text-[#5F6863]">
                            ⏱️ {item.estimatedEffort}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="rounded-md bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[10px] font-bold text-[#205743]">
                          {item.confidence || 85}% Confidence
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItem(item.id!, { title: e.target.value })}
                          className="w-full rounded-lg border border-[#E4DED4] bg-white p-2 text-xs font-semibold text-[#252D2A] focus:outline-none focus:border-[#205743]"
                        />
                        <textarea
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id!, { description: e.target.value })}
                          className="w-full rounded-lg border border-[#E4DED4] bg-white p-2 text-xs text-[#5F6863] focus:outline-none focus:border-[#205743]"
                          rows={2}
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[10px] font-semibold text-[#5F6863]">Deadline:</label>
                          <input
                            type="date"
                            value={item.dueDate || ''}
                            onChange={(e) => handleUpdateItem(item.id!, { dueDate: e.target.value || null })}
                            className="rounded-md border border-[#E4DED4] bg-white px-2 py-1 text-xs text-[#252D2A] focus:outline-none focus:border-[#205743]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <h4 className="text-sm font-bold text-[#252D2A] leading-snug">{item.title}</h4>
                        <p className="mt-1 text-xs text-[#5F6863] line-clamp-2">{item.description}</p>
                      </div>
                    )}

                  {/* AI Assignee Recommendation Box */}
                  <div className="mt-4 rounded-lg border border-[#205743]/20 bg-[#205743]/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#205743] uppercase tracking-wider">
                        AI Assignment Recommendation
                      </span>
                      <select
                        value={item.suggestedAssigneeId || ''}
                        onChange={(e) => {
                          const selected = members.find((m) => m.id === e.target.value);
                          handleUpdateItem(item.id!, {
                            suggestedAssigneeId: e.target.value || null,
                            assignee: selected ? selected.name : null,
                          });
                        }}
                        className="rounded-md border border-[#E4DED4] bg-white px-2 py-1 text-[11px] font-semibold text-[#252D2A] shadow-2xs focus:outline-none focus:border-[#205743] cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="mt-1.5 text-[11px] text-[#252D2A] leading-relaxed font-medium">
                      💡 {item.assignmentJustification || `Assign to ${item.assignee || 'team member'} based on skill profile and capacity.`}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-[#E4DED4] pt-3">
                  <button
                    onClick={() => setEditingId(isEditing ? null : item.id!)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#5F6863] hover:text-[#252D2A] cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditing ? 'Done Editing' : 'Edit Task'}</span>
                  </button>

                  <button
                    onClick={() => toggleApproval(item.id!)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      item.approved
                        ? 'bg-[#205743] text-white shadow-2xs hover:bg-[#163E32]'
                        : 'bg-[#F7F5F0] text-[#5F6863] border border-[#E4DED4] hover:bg-[#E4DED4]/50'
                    }`}
                  >
                    {item.approved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{item.approved ? 'Approved' : 'Approve'}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

