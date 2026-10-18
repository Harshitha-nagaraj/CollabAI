'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, User, Check, X, ChevronDown, UserX } from 'lucide-react';

export interface WorkspaceMemberOption {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  role?: string;
}

interface MemberSelectorProps {
  label?: string;
  members: WorkspaceMemberOption[];
  value?: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function MemberSelector({
  label,
  members,
  value,
  onChange,
  disabled = false,
  placeholder = 'Unassigned',
  className = '',
  size = 'md',
}: MemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const selectedMember = useMemo(() => {
    if (!value) return null;
    return members.find((m) => m.userId === value) || null;
  }, [members, value]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  const getInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold tracking-tight text-[#1C2421]">
          {label}
        </label>
      )}

      {/* Selector Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-lg border border-[#E2DCD2] bg-white text-left transition-all hover:border-[#1F4D3A] focus:border-[#1F4D3A] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-xs'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedMember ? (
            <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[10px] font-bold text-[#1F4D3A] border border-[#1F4D3A]/25">
                {getInitials(selectedMember.name, selectedMember.email)}
              </span>
              <div className="truncate">
                <span className="font-semibold text-[#1C2421]">
                  {selectedMember.name || selectedMember.email}
                </span>
                {selectedMember.name && (
                  <span className="ml-1.5 text-[11px] text-[#525B56]/80 truncate">
                    ({selectedMember.email})
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[#525B56]/80 italic">
              <UserX className="h-3.5 w-3.5" />
              <span>{placeholder}</span>
            </div>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#525B56] opacity-70" />
      </button>

      {/* Dropdown Menu with Search */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full min-w-[260px] rounded-xl border border-[#E2DCD2] bg-white p-1.5 shadow-lg space-y-1">
          {/* Search Input */}
          <div className="relative px-1 pt-1 pb-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#525B56]/70" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[#E2DCD2] bg-[#F7F5F0]/60 pl-8 pr-2.5 py-1.5 text-xs text-[#1C2421] placeholder:text-[#525B56]/70 focus:border-[#1F4D3A] focus:outline-none focus:bg-white"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {/* Unassigned Option */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-[#F0EEE6] cursor-pointer ${
                !value ? 'bg-[#F0EEE6] font-semibold text-[#1F4D3A]' : 'text-[#525B56]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F0EEE6] border border-dashed border-[#E2DCD2] text-[#525B56]">
                  <UserX className="h-3.5 w-3.5" />
                </span>
                <span>Unassigned</span>
              </div>
              {!value && <Check className="h-3.5 w-3.5 text-[#1F4D3A]" />}
            </button>

            <div className="my-1 border-t border-[#E2DCD2]/70" />

            {/* Members List */}
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-[#525B56] italic">
                No workspace members match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = value === m.userId;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => {
                      onChange(m.userId);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[#F0EEE6] cursor-pointer ${
                      isSelected ? 'bg-[#1F4D3A]/10 font-semibold text-[#1F4D3A]' : 'text-[#1C2421]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[10px] font-bold text-[#1F4D3A] border border-[#1F4D3A]/20">
                        {getInitials(m.name, m.email)}
                      </span>
                      <div className="flex flex-col text-left truncate">
                        <span className="truncate">{m.name || m.email}</span>
                        {m.name && (
                          <span className="text-[10px] text-[#525B56] truncate">
                            {m.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#1F4D3A]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
