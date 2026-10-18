'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  icon?: React.ReactNode;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  emptyMessage = 'No items found.',
  emptyActionLabel,
  onEmptyAction,
  icon
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find(o => o.id === value);

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      {label && <label className="text-[13px] font-medium text-gray-700">{label}</label>}
      
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-900 shadow-sm transition-colors hover:border-gray-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon || icon}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <div className="px-2 pb-1 pt-2">
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 bg-slate-50 px-2 py-1.5 text-[13px] text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="mt-1">
            {options.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-[13px] text-gray-500">{emptyMessage}</p>
                {onEmptyAction && emptyActionLabel && (
                  <button 
                    type="button" 
                    onClick={onEmptyAction}
                    className="mt-2 text-[13px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    {emptyActionLabel}
                  </button>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[13px] text-gray-500">
                No matching results.
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-gray-900 transition-colors hover:bg-gray-100"
                >
                  {opt.icon || icon}
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.subLabel && <span className="text-[11px] text-gray-500">{opt.subLabel}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
