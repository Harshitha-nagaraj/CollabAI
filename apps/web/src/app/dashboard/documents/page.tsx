'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useDocuments, useCreateDocument } from '@/lib/queries/documents';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export default function DocumentsPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { data, isLoading } = useDocuments(selectedWorkspaceId);
  const createDocument = useCreateDocument();
  const router = useRouter();
  const { toast } = useToast();

  const documents = data?.documents || [];

  const handleCreate = async () => {
    if (!selectedWorkspaceId) {
      toast('Please select a workspace first', 'error');
      return;
    }
    
    try {
      const { document } = await createDocument.mutateAsync({
        workspaceId: selectedWorkspaceId,
        title: 'Untitled Document',
      });
      router.push(`/dashboard/documents/${document.id}`);
    } catch (err: any) {
      toast(err.message || 'Failed to create document', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-2 space-y-6">
      {/* Top Bar Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4DED4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#205743] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Workspace Docs
            </span>
            <span className="text-xs text-[#5F6863]">Technical Specifications, Specs & Team Wiki</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#252D2A] mt-0.5">
            Documents & Knowledge Storage
          </h2>
        </div>

        <Button onClick={handleCreate} loading={createDocument.isPending} variant="primary" size="sm">
          + New Document
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded-xl bg-[#EFE9E1]" />
          <div className="h-16 rounded-xl bg-[#EFE9E1]" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2DACF] bg-[#F7F5F2]/50 py-20 text-center">
          <svg className="mb-3 h-10 w-10 text-[#767676]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="text-sm font-bold text-[#2D2D2D]">No workspace documents</h3>
          <p className="mt-1 text-xs text-[#5A5A5A]">Get started by creating a new technical document or meeting notes.</p>
          <Button className="mt-5" onClick={handleCreate} loading={createDocument.isPending} variant="primary" size="sm">
            + New Document
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/dashboard/documents/${doc.id}`}
              className="group relative flex flex-col justify-between rounded-xl border border-[#E2DACF] bg-white p-5 shadow-xs transition-all hover:border-[#1F4D3A] hover:shadow-sm"
            >
              <div>
                <h4 className="text-sm font-bold text-[#2D2D2D] group-hover:text-[#1F4D3A] transition-colors">
                  {doc.title}
                </h4>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#5A5A5A]">
                  {doc.content || 'Empty document...'}
                </p>
              </div>
              
              <div className="mt-6 flex items-center gap-2 border-t border-[#E2DACF]/60 pt-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A] text-[9px] font-bold text-white shadow-xs">
                  {doc.creator?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-[11px] font-semibold text-[#767676]">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
