'use client';

import React, { useState } from 'react';

interface NaturalLanguageBarProps {
  onSimulateNL: (prompt: string) => void;
  isLoading: boolean;
}

const examplePrompts = [
  "What happens if Rahul is on leave for one week?",
  "What if we add two frontend developers?",
  "What if authentication takes five more days?",
  "What if we move testing 3 days earlier?",
  "What if scope increases by 25%?",
];

export function NaturalLanguageBar({ onSimulateNL, isLoading }: NaturalLanguageBarProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSimulateNL(prompt.trim());
    }
  };

  const handleExampleClick = (ex: string) => {
    setPrompt(ex);
    onSimulateNL(ex);
  };

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#205743] text-white font-bold text-xs">
          💬
        </span>
        <h3 className="text-sm font-bold text-[#252D2A]">
          Natural Language Scenario Prompt
        </h3>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-[#205743]/10 text-[#205743] border border-[#205743]/20 uppercase tracking-wider">
          AI Converter
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type any 'What if?' question (e.g., 'What if authentication API takes 5 more days?')"
            className="w-full rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs text-[#252D2A] placeholder-[#5F6863] focus:border-[#205743] focus:bg-white focus:outline-none transition-all"
          />
          {prompt && (
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6863] hover:text-[#252D2A] text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          className="flex items-center gap-2 rounded-lg bg-[#205743] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#163E32] disabled:opacity-50 transition-all cursor-pointer border border-[#163E32]"
        >
          {isLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>⚡ Run Simulation</span>
            </>
          )}
        </button>
      </form>

      {/* Preset example prompt pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-[#5F6863] uppercase tracking-wider">Quick Prompts:</span>
        {examplePrompts.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => handleExampleClick(ex)}
            className="rounded-md bg-[#F7F5F0] px-2.5 py-1 text-xs font-medium text-[#252D2A] hover:bg-[#205743]/10 hover:text-[#205743] border border-[#E4DED4] transition-colors cursor-pointer"
          >
            "{ex}"
          </button>
        ))}
      </div>
    </div>
  );
}
