'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument, useUpdateDocument } from '@/lib/queries/documents';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { simulateAITaskGeneration, type AITaskProposal } from '@/lib/mock-ai';
import { AITaskProposalCard } from '@/components/ai-task-proposal-card';
import { useCreateTask } from '@/lib/queries/tasks';
import { useToast } from '@/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { selectedWorkspaceId } = useAppStore();

  const { data, isLoading } = useDocument(id);
  const updateDocument = useUpdateDocument();
  const createTask = useCreateTask();
  const { data: wsData } = useWorkspaceDetails(selectedWorkspaceId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposals, setProposals] = useState<AITaskProposal[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (data?.document) {
      setTitle(data.document.title);
      setContent(data.document.content || '');
    }
  }, [data?.document]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast('Title cannot be empty', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateDocument.mutateAsync({
        id,
        title,
        content,
      });
      toast('Saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtractTasks = async () => {
    if (!content.trim()) {
      toast('Document is empty', 'error');
      return;
    }
    setSidebarOpen(true);
    setIsGenerating(true);
    try {
      const generated = await simulateAITaskGeneration(content, wsData?.members || [], []);
      setProposals(generated);
    } catch (err) {
      toast('Failed to extract tasks', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveProposal = async (proposal: AITaskProposal) => {
    if (!selectedWorkspaceId) return;
    try {
      await createTask.mutateAsync({
        workspaceId: selectedWorkspaceId,
        title: proposal.title,
        description: proposal.description + `\n\n_Source: Document "${title}"_`,
        priority: proposal.priority,
        status: 'TODO',
        assigneeId: proposal.assigneeId || null,
        projectId: proposal.projectId || null,
      } as any);
      
      toast('Task created successfully', 'success');
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
    } catch (error: any) {
      toast(error.message || 'Failed to create task', 'error');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-500">Loading document...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] w-full">
      {/* Editor Column */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'max-w-[70%]' : 'max-w-full'}`}>
        
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard/documents')} className="text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <span className="text-sm text-gray-400">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleSave} loading={isSaving}>
              Save
            </Button>
            <Button variant="ai" size="sm" onClick={handleExtractTasks} loading={isGenerating}>
              ✨ Extract Action Items
            </Button>
          </div>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 overflow-y-auto bg-white px-8 py-12 pb-32 flex justify-center">
          <div className="w-full max-w-3xl">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              placeholder="Document Title"
              className="w-full border-none bg-transparent text-4xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 mb-8"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              placeholder="Start writing meeting notes, specs, or user feedback..."
              className="w-full min-h-[500px] resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* AI Insights Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '30%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-200 bg-slate-50 flex flex-col h-full overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 min-w-[300px]">
              <div className="flex items-center gap-2 text-indigo-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <h3 className="text-[14px] font-semibold">AI Extraction</h3>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[300px]">
              {isGenerating ? (
                <div className="space-y-4">
                  <div className="animate-pulse rounded-xl bg-indigo-100/50 h-32" />
                  <div className="animate-pulse rounded-xl bg-indigo-100/50 h-32" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 mb-4">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-[14px] font-medium text-gray-900">No Action Items Found</h4>
                  <p className="mt-1 text-[13px] text-gray-500">
                    Try adding more context or specific tasks to your notes.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-gray-500 mb-2">
                    Review and approve the tasks extracted from your document.
                  </p>
                  {proposals.map(prop => (
                    <AITaskProposalCard
                      key={prop.id}
                      proposal={prop}
                      members={wsData?.members || []}
                      onApprove={handleApproveProposal}
                      onRemove={(id) => setProposals(prev => prev.filter(p => p.id !== id))}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
