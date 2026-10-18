'use client';

import { useState } from 'react';
import type { AITaskProposal } from '@/lib/mock-ai';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/ui/badge';

interface AITaskProposalCardProps {
  proposal: AITaskProposal;
  members: any[];
  onApprove: (proposal: AITaskProposal) => void;
  onRemove: (id: string) => void;
}

export function AITaskProposalCard({ proposal, members, onApprove, onRemove }: AITaskProposalCardProps) {
  const [editedProposal, setEditedProposal] = useState<AITaskProposal>(proposal);
  const [isEditing, setIsEditing] = useState(false);

  const assignee = members.find(m => (m.user?.id || m.userId || m.id) === editedProposal.assigneeId);

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute right-0 top-0 rounded-bl-xl bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600">
        {editedProposal.confidence}% Match
      </div>

      <div className="mt-2">
        {isEditing ? (
          <input
            className="w-full rounded border border-gray-200 px-2 py-1 text-[14px] font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={editedProposal.title}
            onChange={e => setEditedProposal({ ...editedProposal, title: e.target.value })}
          />
        ) : (
          <h4 className="text-[15px] font-semibold text-gray-900 pr-16">{editedProposal.title}</h4>
        )}
      </div>

      <div className="mt-2">
        {isEditing ? (
          <textarea
            className="w-full rounded border border-gray-200 px-2 py-1 text-[13px] text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={editedProposal.description}
            onChange={e => setEditedProposal({ ...editedProposal, description: e.target.value })}
            rows={2}
          />
        ) : (
          <p className="text-[13px] text-gray-600">{editedProposal.description}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <select
              className="rounded border border-gray-200 text-[11px] text-gray-700 p-1 bg-white"
              value={editedProposal.priority}
              onChange={e => setEditedProposal({ ...editedProposal, priority: e.target.value as any })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          ) : (
            <PriorityBadge priority={editedProposal.priority} />
          )}

          {isEditing ? (
             <select
             className="rounded border border-gray-200 text-[11px] text-gray-700 p-1 bg-white"
             value={editedProposal.assigneeId || ''}
             onChange={e => setEditedProposal({ ...editedProposal, assigneeId: e.target.value || undefined })}
           >
             <option value="">Unassigned</option>
             {members.map(m => (
               <option key={m.id} value={m.user?.id || m.userId || m.id}>
                 {m.name || m.user?.name || m.email}
               </option>
             ))}
           </select>
          ) : (
            assignee && (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                <span className="flex h-3 w-3 items-center justify-center rounded-full bg-gray-300 text-[8px] font-bold text-gray-600">
                  {assignee.name?.[0] || assignee.user?.name?.[0] || '?'}
                </span>
                {assignee.name || assignee.user?.name || assignee.email?.split('@')[0] || 'Assigned'}
              </span>
            )
          )}
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Done
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          <Button variant="ai" size="sm" onClick={() => onApprove(editedProposal)}>
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
