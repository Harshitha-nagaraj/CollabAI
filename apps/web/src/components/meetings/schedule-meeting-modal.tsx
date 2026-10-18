'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCreateMeeting } from '@/lib/queries/meetings';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { useToast } from '@/components/ui/toast';
import { Calendar, X, Check, Plus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  workspaceId: string | null;
  onClose: () => void;
}

export function ScheduleMeetingModal({ isOpen, workspaceId, onClose }: Props) {
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const { data: wsData } = useWorkspaceDetails(workspaceId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('GENERAL');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleToggleMember = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      toast('Please select a workspace', 'error');
      return;
    }
    if (!title.trim()) {
      toast('Meeting title is required', 'error');
      return;
    }

    try {
      await createMeeting.mutateAsync({
        title,
        description,
        type,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        workspaceId,
        participantIds: selectedParticipants,
      });
      toast('Meeting scheduled successfully!', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to schedule meeting', 'error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252D2A]/60 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg rounded-xl border border-[#E4DED4] bg-white p-6 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#E4DED4] pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#205743] text-white">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#252D2A]">Schedule New Meeting</h3>
                <p className="text-xs text-[#5F6863]">
                  Invite workspace members and set up AI Meeting Intelligence capture.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F5F0] text-[#5F6863] hover:text-[#252D2A]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#252D2A]">Meeting Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Q3 Roadmap & Architecture Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-2.5 text-xs text-[#252D2A] focus:outline-none focus:border-[#205743] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#252D2A]">Meeting Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-2.5 text-xs text-[#252D2A] focus:outline-none focus:border-[#205743] focus:bg-white cursor-pointer"
                >
                  <option value="GENERAL">General Sync</option>
                  <option value="STANDUP">Daily Standup</option>
                  <option value="SPRINT_PLANNING">Sprint Planning</option>
                  <option value="ARCHITECTURE_REVIEW">Architecture Review</option>
                  <option value="CLIENT_SYNC">Client Review</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#252D2A]">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-2 text-xs text-[#252D2A] focus:outline-none focus:border-[#205743] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#252D2A]">Invite Workspace Members</label>
              <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-2">
                {wsData?.members?.map((m) => {
                  const memberId = m.userId || m.id || m.email;
                  const isSelected = selectedParticipants.includes(memberId);
                  return (
                    <div
                      key={memberId}
                      onClick={() => handleToggleMember(memberId)}
                      className={`flex cursor-pointer items-center justify-between rounded-md p-2 text-xs transition-all ${
                        isSelected
                          ? 'bg-[#205743] text-white'
                          : 'bg-white text-[#252D2A] border border-[#E4DED4] hover:bg-[#E4DED4]/30'
                      }`}
                    >
                      <span className="font-semibold">{m.name || m.email}</span>
                      <span className="text-[10px] flex items-center gap-1 font-bold">
                        {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {isSelected ? 'Invited' : 'Add'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E4DED4] pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs border-[#E4DED4] text-[#252D2A] hover:bg-[#F7F5F0]">
                Cancel
              </Button>
              <Button type="submit" loading={createMeeting.isPending} className="bg-[#205743] hover:bg-[#163E32] text-xs text-white">
                Schedule & Launch
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

