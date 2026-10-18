'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ReleaseNoteItem } from '@/lib/queries/github';
import { Tag, Sparkles, Copy, Check, FileText, Calendar, GitPullRequest, Layers, Clock } from 'lucide-react';

interface Props {
  releaseNotes: ReleaseNoteItem[];
  onGenerateReleaseNotes: (version: string) => void;
  isGenerating?: boolean;
}

export function ReleaseNotesView({ releaseNotes, onGenerateReleaseNotes, isGenerating }: Props) {
  const [versionInput, setVersionInput] = useState('v1.2.0');
  const [selectedNote, setSelectedNote] = useState<ReleaseNoteItem | null>(releaseNotes[0] || null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionInput.trim()) return;
    onGenerateReleaseNotes(versionInput.trim());
  };

  const defaultNoteContent = `# Release v1.2.0 - Core AI Meeting Intelligence & GitHub Integration

## Merged Pull Requests
- #101: Implemented AI Meeting Intelligence Service (by @rahul)
- #102: Interactive Gantt Chart Timeline & Critical Path (by @sarah)
- #103: GitHub Webhook Automatic Task Status Updates (by @alex)

## Completed Features & Tasks
- Backend Authentication API & RBAC [HIGH]
- Live Virtual Meeting Room Streamer [HIGH]
- Smart Project Timeline & Dependency Engine [URGENT]

## Architectural Decisions & Governance
- Approved PostgreSQL + Prisma Schema Migration (ARCHITECTURE)
- Standardized Cosine Similarity Vector Store Abstraction (INFRASTRUCTURE)

---
*Generated automatically by CollabAI Release Generator Engine.*`;

  const activeNote = selectedNote || releaseNotes[0] || {
    id: 'rn-demo',
    version: 'v1.2.0',
    title: 'Release v1.2.0 - Core AI Meeting Intelligence & GitHub Integration',
    createdAt: new Date().toISOString(),
    content: defaultNoteContent,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* AI Generator Control Box */}
      <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2DCD2] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C2421]">AI Release Notes Generator</h3>
              <p className="text-xs text-[#525B56]">
                Synthesize merged PRs, completed tasks, and governance decisions into formatted release notes.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Tag className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#525B56]" />
            <input
              type="text"
              value={versionInput}
              onChange={(e) => setVersionInput(e.target.value)}
              placeholder="Release Version (e.g. v1.2.0)"
              className="w-56 rounded-lg border border-[#E2DCD2] bg-white pl-9 pr-3.5 py-2 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isGenerating}
            className="bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32] gap-1.5 px-4"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Release Notes
          </Button>
        </form>
      </div>

      {/* Main Grid Layout: History Sidebar + Markdown Preview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Version History Sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">
              Release Changelogs ({releaseNotes.length > 0 ? releaseNotes.length : 1})
            </span>
          </div>

          <div className="space-y-2">
            {releaseNotes.length === 0 ? (
              <div
                onClick={() => setSelectedNote(activeNote)}
                className="cursor-pointer rounded-xl border border-[#1F4D3A] bg-[#F0EEE6] p-3.5 shadow-xs transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F4D3A] flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    {activeNote.version}
                  </span>
                  <span className="text-[10px] text-[#525B56] flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {activeNote.createdAt.split('T')[0]}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-medium text-[#1C2421]">{activeNote.title}</p>
              </div>
            ) : (
              releaseNotes.map((note) => {
                const isSelected = (selectedNote?.id || releaseNotes[0]?.id) === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-[#1F4D3A] bg-[#F0EEE6] shadow-xs'
                        : 'border-[#E2DCD2] bg-white hover:border-[#1F4D3A]/50 hover:bg-[#F7F5F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${isSelected ? 'text-[#1F4D3A]' : 'text-[#1C2421]'}`}>
                        <Tag className="h-3 w-3" />
                        {note.version}
                      </span>
                      <span className="text-[10px] text-[#525B56] flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {note.createdAt.split('T')[0]}
                      </span>
                    </div>
                    <p className={`mt-1.5 line-clamp-2 text-xs font-medium ${isSelected ? 'text-[#1C2421]' : 'text-[#525B56]'}`}>
                      {note.title}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Markdown Content Viewer (2 columns) */}
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs md:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DCD2] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1F4D3A]" />
              <span className="text-xs font-bold text-[#1C2421]">{activeNote.version} — Markdown Release Notes</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-[11px] border-[#E2DCD2] text-[#1C2421] hover:bg-[#F0EEE6] gap-1.5 h-7 px-3"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#1F4D3A]" /> : <Copy className="h-3.5 w-3.5 text-[#525B56]" />}
              {copied ? 'Copied to Clipboard' : 'Copy Markdown'}
            </Button>
          </div>

          <div className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-4 text-xs font-mono text-[#1C2421] leading-relaxed overflow-x-auto min-h-[320px]">
            <pre className="whitespace-pre-wrap font-mono">{activeNote.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}


