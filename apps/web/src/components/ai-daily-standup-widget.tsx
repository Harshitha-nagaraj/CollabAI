'use client';

import { useState, useMemo } from 'react';
import { useDailyStandup } from '@/lib/queries/ai';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function AIDailyStandupWidget() {
  const { selectedWorkspaceId } = useAppStore();
  const { data: standup, isLoading, refetch } = useDailyStandup(selectedWorkspaceId);

  const [scope, setScope] = useState<'workspace' | 'sprint' | 'member'>('workspace');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const members = standup?.members || [];

  const displayMembers = useMemo(() => {
    if (scope === 'member' && selectedMemberId) {
      return members.filter(m => m.userId === selectedMemberId);
    }
    return members;
  }, [members, scope, selectedMemberId]);

  const generateMarkdown = () => {
    const lines = [
      `# AI Daily Stand-up Report`,
      `**Date:** ${standup?.date || new Date().toISOString().split('T')[0]}`,
      `**Scope:** ${scope.toUpperCase()}`,
      ``,
    ];

    displayMembers.forEach(m => {
      lines.push(`## ${m.name}`);
      lines.push(`### Yesterday (Completed)`);
      m.yesterday.forEach(y => lines.push(`- ${y}`));
      lines.push(``);
      lines.push(`### Today (Planned)`);
      m.today.forEach(t => lines.push(`- ${t}`));
      lines.push(``);
      lines.push(`### Blockers / Risks`);
      if (m.blockers.length === 0) lines.push(`- None`);
      else m.blockers.forEach(b => lines.push(`- ⚠️ ${b}`));
      lines.push(``);
    });

    return lines.join('\n');
  };

  const handleCopy = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `standup-${standup?.date || 'report'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E2DACF] bg-white p-5 shadow-xs animate-pulse">
        <div className="h-5 w-44 rounded bg-[#EFE9E1]" />
        <div className="mt-4 h-24 rounded bg-[#F7F5F2]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E2DACF] bg-white p-5 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DACF] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4D3A] text-[#F7F5F2] font-bold shadow-xs">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#2D2D2D]">AI Daily Stand-up Generator</h3>
              <span className="rounded bg-[#1F4D3A]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#1F4D3A] uppercase tracking-wider">
                Automated Sync
              </span>
            </div>
            <p className="text-xs text-[#5A5A5A]">Team progress, sprint velocity & blocker aggregation</p>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy Report'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Export .MD
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Scope Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-[#F7F5F2] p-2 rounded-lg border border-[#E2DACF]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScope('workspace')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              scope === 'workspace' ? 'bg-[#1F4D3A] text-white shadow-xs' : 'text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            Entire Workspace
          </button>
          <button
            onClick={() => setScope('sprint')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              scope === 'sprint' ? 'bg-[#1F4D3A] text-white shadow-xs' : 'text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            Active Sprint
          </button>
          <button
            onClick={() => setScope('member')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              scope === 'member' ? 'bg-[#1F4D3A] text-white shadow-xs' : 'text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            Individual Member
          </button>
        </div>

        {scope === 'member' && (
          <select
            value={selectedMemberId || ''}
            onChange={(e) => setSelectedMemberId(e.target.value || null)}
            className="rounded-md border border-[#E2DACF] bg-white px-2.5 py-1 text-xs text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A]"
          >
            <option value="">Select Member...</option>
            {members.map(m => (
              <option key={m.userId} value={m.userId}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Standup Report Grid */}
      <div className="mt-4 space-y-4">
        <AnimatePresence>
          {displayMembers.map(m => (
            <motion.div
              key={m.userId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#E2DACF] bg-white p-4 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-[#E2DACF]/60 pb-2">
                <h4 className="text-xs font-bold text-[#2D2D2D]">{m.name}</h4>
                <span className="text-[11px] font-semibold text-[#767676]">Stand-up Summary</span>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Yesterday */}
                <div className="rounded-md bg-[#1F4D3A]/5 p-3 border border-[#1F4D3A]/15">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F4D3A]">
                    <span>Yesterday (Completed)</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-[#2D2D2D]">
                    {m.yesterday.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#1F4D3A] font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Today */}
                <div className="rounded-md bg-[#C89B3C]/10 p-3 border border-[#C89B3C]/25">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#8C6615]">
                    <span>Today (Planned)</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-[#2D2D2D]">
                    {m.today.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#C89B3C] font-bold">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Blockers */}
                <div className="rounded-md bg-[#C96B4A]/10 p-3 border border-[#C96B4A]/25">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#C96B4A]">
                    <span>Blockers & Risks</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-[#2D2D2D]">
                    {m.blockers.length > 0 ? (
                      m.blockers.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#C96B4A] font-bold">⚠️</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-[#767676] italic">No blockers reported</li>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {displayMembers.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E2DACF] p-8 text-center text-xs text-[#5A5A5A]">
            No member data found for selected scope.
          </div>
        )}
      </div>
    </div>
  );
}
