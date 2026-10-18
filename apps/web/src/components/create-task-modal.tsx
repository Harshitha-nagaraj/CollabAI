'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchableSelect } from '@/components/searchable-select';
import { AITaskProposalCard } from '@/components/ai-task-proposal-card';
import { simulateAITaskGeneration, type AITaskProposal } from '@/lib/mock-ai';
import { useCreateTask } from '@/lib/queries/tasks';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import type { Priority } from '@/types';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projects: any[];
  members: any[];
}

type Tab = 'ai' | 'manual';

export function CreateTaskModal({ open, onClose, projects, members }: CreateTaskModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  
  // AI State
  const [aiText, setAiText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposals, setProposals] = useState<AITaskProposal[]>([]);

  // Manual State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  const { selectedWorkspaceId } = useAppStore();
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!aiText.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await simulateAITaskGeneration(aiText, members, projects);
      setProposals(generated);
    } catch (err) {
      toast('Failed to generate tasks', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveProposal = async (proposal: AITaskProposal) => {
    if (!selectedWorkspaceId) {
      toast('Please select a workspace first', 'error');
      return;
    }

    const resolvedProjectId = proposal.projectId || projectId || (projects[0]?.id || null);

    try {
      await createTask.mutateAsync({
        workspaceId: selectedWorkspaceId,
        title: proposal.title,
        description: proposal.description,
        priority: proposal.priority,
        status: 'TODO',
        assigneeId: proposal.assigneeId || null,
        projectId: resolvedProjectId,
      } as any);
      
      toast('Task created from AI suggestion', 'success');
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      
      if (proposals.length === 1) { // That was the last one
        handleClose();
      }
    } catch (error: any) {
      toast(error.message || 'Failed to create task', 'error');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId) {
      toast('Please select a workspace first', 'error');
      return;
    }

    const resolvedProjectId = projectId || (projects[0]?.id || null);

    try {
      await createTask.mutateAsync({
        workspaceId: selectedWorkspaceId,
        title,
        description,
        priority,
        status: 'TODO',
        assigneeId: assigneeId || null,
        projectId: resolvedProjectId,
      } as any);
      toast('Task created successfully', 'success');
      handleClose();
    } catch (error: any) {
      toast(error.message || 'Failed to create task', 'error');
    }
  };

  const handleClose = () => {
    // Reset states
    setActiveTab('ai');
    setAiText('');
    setProposals([]);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setAssigneeId('');
    setProjectId('');
    onClose();
  };

  const memberOptions = members.map(m => ({
    id: m.user?.id || m.userId || m.id,
    label: m.name || m.user?.name || m.email?.split('@')[0] || 'Unknown',
    subLabel: m.email || m.user?.email,
    icon: (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">
        {(m.name?.[0] || m.user?.name?.[0] || '?').toUpperCase()}
      </div>
    )
  }));

  const projectOptions = projects.map(p => ({
    id: p.id,
    label: p.name,
    icon: (
      <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-gray-500">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
      </div>
    )
  }));

  return (
    <Modal open={open} onClose={handleClose} title="New Task" maxWidth={activeTab === 'ai' ? 'max-w-2xl' : 'max-w-md'}>
      
      {/* Tabs */}
      <div className="mb-6 flex space-x-1 rounded-lg bg-gray-100 p-1">
        <button
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-white text-[#1F4D3A] shadow-xs font-bold' : 'text-[#525B56] hover:text-[#1C2421]'}`}
          onClick={() => setActiveTab('ai')}
        >
          Generate with AI
        </button>
        <button
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all ${activeTab === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ai' ? (
          <motion.div key="ai" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
            {proposals.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-gray-900">Review AI Suggestions</h3>
                  <button onClick={() => setProposals([])} className="text-[12px] text-gray-500 hover:text-gray-900">Clear</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {proposals.map(prop => (
                    <AITaskProposalCard
                      key={prop.id}
                      proposal={prop}
                      members={members}
                      onApprove={handleApproveProposal}
                      onRemove={(id) => setProposals(prev => prev.filter(p => p.id !== id))}
                    />
                  ))}
                </div>
                {proposals.length === 0 && (
                  <p className="text-[13px] text-gray-500">All suggestions approved!</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <textarea
                  className="w-full min-h-[160px] resize-none rounded-xl border border-dashed border-gray-300 bg-slate-50 p-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Paste meeting notes, brainstorming sessions, or user feedback here..."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                />
                
                <div className="flex justify-end">
                  <Button variant="ai" onClick={handleGenerate} loading={isGenerating} disabled={!aiText.trim()}>
                    Generate Tasks
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="manual" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              <Input
                label="Task Title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-gray-700">Description</label>
                <textarea
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Add details, links, or context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SearchableSelect
                  label="Assignee"
                  options={memberOptions}
                  value={assigneeId}
                  onChange={setAssigneeId}
                  placeholder="Unassigned"
                  emptyMessage="No teammates found."
                  emptyActionLabel="Invite teammate"
                  onEmptyAction={() => console.log('Invite flow not implemented')}
                />

                <Select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'URGENT', label: 'Urgent' },
                  ]}
                />
              </div>
              
              <SearchableSelect
                label="Project"
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                placeholder="No project"
                emptyMessage="No active projects in this workspace."
                emptyActionLabel="Create your first project"
                onEmptyAction={() => console.log('Create project flow not implemented')}
              />

              <div className="mt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={createTask.isPending}>
                  Create Task
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
