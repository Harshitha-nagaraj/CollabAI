'use client';

import React, { useState } from 'react';
import type { LearningPatternData } from '@/lib/queries/learning';
import { BookOpen, Search } from 'lucide-react';

interface LessonsLearnedLibraryProps {
  patterns: LearningPatternData[];
  onSearchLibrary: (query: string) => Promise<any>;
}

export function LessonsLearnedLibrary({ patterns, onSearchLibrary }: LessonsLearnedLibraryProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await onSearchLibrary(query.trim());
      setSearchResults(res?.results || []);
    } catch (err) {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  const filteredPatterns = patterns.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.description.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-[#E4DED4] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#205743]/10 text-[#205743] text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[#252D2A]">
            Organizational Learning Library & Lessons Repository
          </h3>
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#205743]/10 text-[#205743] border border-[#205743]/20">
          Semantic Vector Searchable
        </span>
      </div>

      {/* Search Bar & Filters */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organizational repository (e.g., 'testing acceleration', 'API integration', 'PR latency')"
            className="flex-1 rounded-lg border border-[#E4DED4] bg-[#F7F5F0] px-3.5 py-2 text-xs text-[#252D2A] placeholder-[#8C9590] focus:border-[#205743] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-1.5 rounded-lg bg-[#205743] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163E32] disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isSearching ? 'Searching...' : 'Search Library'}</span>
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          {['ALL', 'BEST_PRACTICE', 'RECURRING_RISK', 'ESTIMATION_PATTERN', 'WORKFLOW'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#205743] text-white'
                  : 'bg-[#F7F5F0] text-[#5F6863] border border-[#E4DED4] hover:bg-[#E4DED4]/50'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Results / Patterns Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredPatterns.map((pat) => (
          <div
            key={pat.id}
            className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 p-4 shadow-2xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <h4 className="text-xs font-bold text-[#252D2A]">
                {pat.title}
              </h4>
              <span className="rounded bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[10px] font-bold text-[#205743]">
                {pat.impactMetric}
              </span>
            </div>

            <p className="text-xs text-[#5F6863] leading-normal">
              {pat.description}
            </p>

            <div className="flex items-center justify-between text-[11px] font-medium text-[#5F6863] pt-2 border-t border-[#E4DED4]">
              <span>Verified across {pat.occurrences} historical projects</span>
              <span className="font-bold text-[#205743]">{pat.confidenceScore}% Confidence</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

