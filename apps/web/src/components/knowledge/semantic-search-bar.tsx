'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useSemanticSearch, type SemanticSearchResult } from '@/lib/queries/knowledge';
import { Search, Sparkles, Mic, FileText, CheckSquare, Scale } from 'lucide-react';

interface Props {
  workspaceId: string;
}

export function SemanticSearchBar({ workspaceId }: Props) {
  const [queryText, setQueryText] = useState('');
  const [result, setResult] = useState<SemanticSearchResult | null>(null);
  const searchMutation = useSemanticSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    try {
      const res = await searchMutation.mutateAsync({ query: queryText, workspaceId });
      setResult(res);
    } catch (err) {
      // Fallback display handled by mutation hook or static demo
    }
  };

  const sampleQueries = [
    'Why was this feature delayed?',
    'Who approved the database migration?',
    'What decisions were made during Sprint Planning?',
  ];

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center rounded-xl border border-[#E2DCD2] bg-white shadow-xs transition-all focus-within:border-[#1F4D3A] focus-within:ring-1 focus-within:ring-[#1F4D3A]">
          <Search className="ml-4 h-4 w-4 text-[#525B56]" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder='Ask natural questions e.g. "Why was this feature delayed?" or "Who approved the database migration?"...'
            className="w-full bg-transparent px-3.5 py-3 text-xs font-medium text-[#1C2421] placeholder-[#525B56]/60 focus:outline-none"
          />
          <div className="pr-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={searchMutation.isPending}
              className="bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32]"
            >
              Ask AI Knowledge
            </Button>
          </div>
        </div>

        {/* Sample Suggestions */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1">
          <span className="text-[11px] font-semibold text-[#525B56]">Suggested Questions:</span>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQueryText(q);
              }}
              className="rounded-md border border-[#E2DCD2] bg-[#F7F5F0] px-2.5 py-1 text-[11px] font-medium text-[#525B56] hover:text-[#1C2421] hover:border-[#1F4D3A]/40 transition-colors cursor-pointer"
            >
              "{q}"
            </button>
          ))}
        </div>
      </form>

      {/* Search Output Section */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-6 rounded-xl border border-[#E2DCD2] bg-white p-5 shadow-xs"
          >
            {/* Synthesized AI Answer Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F4D3A] text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1C2421]">Synthesized Answer</h3>
                </div>
                <span className="rounded-md bg-[#E8F3EE] border border-[#C2DFD3] px-2.5 py-0.5 text-xs font-semibold text-[#1F4D3A]">
                  {result.confidenceScore}% Confidence Match
                </span>
              </div>

              <p className="text-xs text-[#1C2421] leading-relaxed font-medium bg-[#F7F5F0] p-4 rounded-lg border border-[#E2DCD2]">
                {result.answer}
              </p>
            </div>

            {/* Supporting Evidence */}
            {result.supportingEvidence.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#525B56]">Supporting Evidence & Facts</h4>
                <div className="space-y-1.5">
                  {result.supportingEvidence.map((fact, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-3 text-xs text-[#525B56]"
                    >
                      <span className="text-[#1F4D3A] font-bold">•</span>
                      <span>{fact}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Citations Grid */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 pt-3 border-t border-[#E2DCD2]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">Related Meetings</span>
                <div className="mt-2 space-y-1.5">
                  {result.relatedMeetings.length === 0 ? (
                    <p className="text-[11px] text-[#525B56]">None linked.</p>
                  ) : (
                    result.relatedMeetings.map((m) => (
                      <a
                        key={m.id}
                        href={m.link}
                        className="block rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 transition-all hover:border-[#1F4D3A]/40"
                      >
                        <p className="inline-flex items-center gap-1 truncate text-xs font-bold text-[#1C2421]">
                          <Mic className="h-3 w-3 text-[#1F4D3A]" />
                          {m.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-[#525B56]">{m.snippet}</p>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">Related Documents</span>
                <div className="mt-2 space-y-1.5">
                  {result.relatedDocuments.length === 0 ? (
                    <p className="text-[11px] text-[#525B56]">None linked.</p>
                  ) : (
                    result.relatedDocuments.map((d) => (
                      <a
                        key={d.id}
                        href={d.link}
                        className="block rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 transition-all hover:border-[#1F4D3A]/40"
                      >
                        <p className="inline-flex items-center gap-1 truncate text-xs font-bold text-[#1C2421]">
                          <FileText className="h-3 w-3 text-[#1F4D3A]" />
                          {d.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-[#525B56]">{d.snippet}</p>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">Related Tasks</span>
                <div className="mt-2 space-y-1.5">
                  {result.relatedTasks.length === 0 ? (
                    <p className="text-[11px] text-[#525B56]">None linked.</p>
                  ) : (
                    result.relatedTasks.map((t) => (
                      <a
                        key={t.id}
                        href={t.link}
                        className="block rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 transition-all hover:border-[#1F4D3A]/40"
                      >
                        <p className="inline-flex items-center gap-1 truncate text-xs font-bold text-[#1C2421]">
                          <CheckSquare className="h-3 w-3 text-[#1F4D3A]" />
                          {t.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-[#525B56]">{t.snippet}</p>
                      </a>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#525B56]">Related Decisions</span>
                <div className="mt-2 space-y-1.5">
                  {result.relatedDecisions.length === 0 ? (
                    <p className="text-[11px] text-[#525B56]">None linked.</p>
                  ) : (
                    result.relatedDecisions.map((dec) => (
                      <a
                        key={dec.id}
                        href={dec.link}
                        className="block rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2.5 transition-all hover:border-[#1F4D3A]/40"
                      >
                        <p className="inline-flex items-center gap-1 truncate text-xs font-bold text-[#1C2421]">
                          <Scale className="h-3 w-3 text-[#1F4D3A]" />
                          {dec.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-[#525B56]">{dec.snippet}</p>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

