'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { FileText, Copy, Check } from 'lucide-react';

interface Props {
  generatedDocs: {
    meetingNotes: string;
    sprintNotes: string;
    decisionLog: string;
    releaseNotes?: string;
  };
}

export function MeetingDocumentationView({ generatedDocs }: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'notes' | 'sprint' | 'decisions' | 'release'>('notes');

  const getActiveContent = () => {
    switch (activeTab) {
      case 'notes':
        return generatedDocs.meetingNotes;
      case 'sprint':
        return generatedDocs.sprintNotes;
      case 'decisions':
        return generatedDocs.decisionLog;
      case 'release':
        return generatedDocs.releaseNotes || '# Release Notes\n- Version 1.2.0 deployed.\n- AI Meeting Intelligence Engine enabled.';
      default:
        return generatedDocs.meetingNotes;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    toast('Documentation copied to clipboard', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E4DED4] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#205743] text-white">
            <FileText className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-[#252D2A]">Auto-Generated Workspace Documentation</h4>
            <p className="text-xs text-[#5F6863]">
              Meeting notes, sprint notes, and decision logs automatically persisted to the Documents section.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[#205743]/10 border border-[#205743]/20 px-3 py-1 text-[11px] font-bold text-[#205743]">
            <Check className="w-3 h-3" /> Auto-Saved to Documents
          </span>
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs border-[#E4DED4] text-[#252D2A] hover:bg-[#F7F5F0]">
            <Copy className="w-3.5 h-3.5 mr-1 text-[#5F6863]" /> Copy Markdown
          </Button>
        </div>
      </div>

      {/* Doc Tabs */}
      <div className="flex border-b border-[#E4DED4]">
        {[
          { id: 'notes', label: 'Meeting Notes' },
          { id: 'sprint', label: 'Sprint Notes' },
          { id: 'decisions', label: 'Decision Log' },
          { id: 'release', label: 'Release Notes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#205743] text-[#205743]'
                : 'border-transparent text-[#5F6863] hover:text-[#252D2A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Markdown Content Display */}
      <div className="rounded-xl border border-[#E4DED4] bg-white p-6 shadow-xs">
        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#252D2A]">
          {getActiveContent()}
        </pre>
      </div>
    </div>
  );
}

