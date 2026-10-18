'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { TimelineTask } from '@/lib/queries/timeline';
import { Link2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  tasks: TimelineTask[];
  onClose: () => void;
  onAddDependency: (predecessorId: string, successorId: string, type: string) => void;
  isLoading?: boolean;
}

export function AddDependencyModal({ isOpen, tasks, onClose, onAddDependency, isLoading }: Props) {
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [type, setType] = useState('FINISH_TO_START');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!predecessorId || !successorId) return;
    onAddDependency(predecessorId, successorId, type);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-xl border border-[#E2DCD2] bg-white p-6 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C2421]">Add Dependency Link</h3>
                <p className="text-xs text-[#525B56]">
                  Link a predecessor task that blocks execution of a successor task.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0EEE6] text-[#525B56] hover:text-[#1C2421] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#1C2421]">
                Predecessor Task (Must Finish / Start First)
              </label>
              <select
                required
                value={predecessorId}
                onChange={(e) => setPredecessorId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E2DCD2] bg-white p-2.5 text-xs font-medium text-[#1C2421] focus:outline-none focus:border-[#1F4D3A] focus:ring-1 focus:ring-[#1F4D3A]"
              >
                <option value="">Select Predecessor Task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1C2421]">
                Successor Task (Blocked / Depends On Predecessor)
              </label>
              <select
                required
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E2DCD2] bg-white p-2.5 text-xs font-medium text-[#1C2421] focus:outline-none focus:border-[#1F4D3A] focus:ring-1 focus:ring-[#1F4D3A]"
              >
                <option value="">Select Successor Task</option>
                {tasks
                  .filter((t) => t.id !== predecessorId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1C2421]">Dependency Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E2DCD2] bg-white p-2.5 text-xs font-medium text-[#1C2421] focus:outline-none focus:border-[#1F4D3A] focus:ring-1 focus:ring-[#1F4D3A]"
              >
                <option value="FINISH_TO_START">Finish-to-Start (FS - Standard)</option>
                <option value="START_TO_START">Start-to-Start (SS)</option>
                <option value="FINISH_TO_FINISH">Finish-to-Finish (FF)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E2DCD2] pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="border-[#E2DCD2] text-[#1C2421] text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isLoading} className="bg-[#1F4D3A] text-white hover:bg-[#163E32] text-xs">
                Add Dependency Link
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

