'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  useAICommand,
  useConfirmCommand,
  useAISearch,
  type ParsedCommand,
  type SearchResponse,
  type SourceCitation,
} from '@/lib/queries/ai';
import { useWorkspaces } from '@/lib/queries/workspaces';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function isExternalEditableElement(target: EventTarget | null, dialogElement: HTMLElement | null): boolean {
  if (!target || typeof target !== 'object') return false;

  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };

  // Keystrokes inside CommandBar dialog itself should not be suppressed
  if (dialogElement && 'contains' in dialogElement && target instanceof Node && dialogElement.contains(target)) {
    return false;
  }

  const tagName = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (Boolean(el.isContentEditable)) {
    return true;
  }

  if (typeof el.closest === 'function') {
    return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
  }

  return false;
}

const COMMAND_SUGGESTIONS = [
  'Assign login task to Harshitha.',
  'Move API testing to Done.',
  'Create a high priority bug.',
  'Schedule sprint planning tomorrow.',
  'Show overdue tasks.',
  'Show blocked tasks.',
];

const AI_SEARCH_EXAMPLES = [
  'Why is payment integration delayed?',
  "What decisions were made during yesterday's meeting?",
  'What are the active projects in this workspace?',
  'What tasks are currently overdue?',
  'What are the key architecture decisions on the database?',
  'What are the latest comments on backend tasks?',
];

const INSUFFICIENT_INFO_TEXT =
  'The available records in this workspace do not contain enough information to answer this question.';

export function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'ai_search'>('all');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ParsedCommand | SearchResponse | null>(null);
  const [mode, setMode] = useState<'idle' | 'loading' | 'result'>('idle');
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useAppStore();
  const { data: wsData } = useWorkspaces();

  // Resolve active workspace ID: preferred from store if valid for current user, or primary user workspace
  const activeWorkspaceId = useMemo(() => {
    const userWorkspaces = wsData?.workspaces || [];
    if (selectedWorkspaceId && userWorkspaces.some((w) => w.id === selectedWorkspaceId)) {
      return selectedWorkspaceId;
    }
    if (userWorkspaces.length > 0) {
      return userWorkspaces[0].id;
    }
    return null;
  }, [selectedWorkspaceId, wsData?.workspaces]);

  // Keep store in sync if active workspace was resolved from user's workspaces
  useEffect(() => {
    if (activeWorkspaceId && activeWorkspaceId !== selectedWorkspaceId) {
      setSelectedWorkspaceId(activeWorkspaceId);
    }
  }, [activeWorkspaceId, selectedWorkspaceId, setSelectedWorkspaceId]);

  const aiCommand = useAICommand();
  const confirmCommand = useConfirmCommand();
  const aiSearch = useAISearch();

  // Filter suggestions based on active tab and query
  const suggestionsList = tab === 'ai_search' ? AI_SEARCH_EXAMPLES : [...COMMAND_SUGGESTIONS, ...AI_SEARCH_EXAMPLES];

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return suggestionsList;
    const q = query.toLowerCase().trim();
    return suggestionsList.filter((s) => s.toLowerCase().includes(q));
  }, [query, suggestionsList]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, tab]);

  // ⌘K / Ctrl+K shortcut & custom events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const isModifierK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      const isEscape = e.key === 'Escape';

      if (!isModifierK && !isEscape) return;

      if (isEscape) {
        setOpen(false);
        return;
      }

      // If user is currently typing in an external form field (textarea/input), don't intercept Ctrl+K
      if (isExternalEditableElement(e.target, dialogRef.current)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setOpen((prev) => !prev);
    };

    const handleOpen = (e?: Event) => {
      const customEvent = e as CustomEvent<{ tab?: 'all' | 'ai_search' }>;
      if (customEvent?.detail?.tab) {
        setTab(customEvent.detail.tab);
      }
      setOpen(true);
    };
    const handleClose = () => setOpen(false);
    const handleToggle = () => setOpen((prev) => !prev);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-bar', handleOpen);
    window.addEventListener('close-command-bar', handleClose);
    window.addEventListener('toggle-command-bar', handleToggle);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-bar', handleOpen);
      window.removeEventListener('close-command-bar', handleClose);
      window.removeEventListener('toggle-command-bar', handleToggle);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResult(null);
      setExecutionMessage(null);
      setExecutionError(false);
      setMode('idle');
      setSelectedIndex(-1);
    }
  }, [open]);

  const executeQuery = useCallback(
    async (textToSubmit?: string) => {
      const commandText = (textToSubmit ?? query).trim();
      if (!commandText) return;
      if (mode === 'loading' || confirmCommand.isPending || aiCommand.isPending || aiSearch.isPending) return;

      setMode('loading');
      setExecutionMessage(null);
      setExecutionError(false);

      try {
        const isActionCommand =
          tab === 'all' && /^(create|add|move|assign|schedule|update|delete)\b/i.test(commandText);

        if (isActionCommand) {
          const parsed = await aiCommand.mutateAsync({
            command: commandText,
            workspaceId: activeWorkspaceId || undefined,
          });
          setResult(parsed);
        } else if (activeWorkspaceId) {
          const searchResult = await aiSearch.mutateAsync({
            query: commandText,
            workspaceId: activeWorkspaceId,
          });
          setResult(searchResult);
        } else {
          const parsed = await aiCommand.mutateAsync({
            command: commandText,
            workspaceId: activeWorkspaceId || undefined,
          });
          setResult(parsed);
        }
        setMode('result');
      } catch (err: any) {
        setMode('result');
        setResult({
          query: commandText,
          results: [],
          sources: [],
          answer: err?.message || 'Failed to process command or search.',
          isGrounded: false,
          isError: true,
          facts: [],
          inferences: [],
          supportingEvidence: [],
          relatedTasks: [],
          relatedMeetings: [],
          relatedDocuments: [],
        });
      }
    },
    [query, mode, tab, activeWorkspaceId, aiCommand, aiSearch, confirmCommand]
  );

  const handleConfirmAction = useCallback(
    async (command: ParsedCommand) => {
      if (!activeWorkspaceId || confirmCommand.isPending || executionMessage) return;
      const isTaskAction = command.action === 'move_task' || command.action === 'assign_task';
      if (isTaskAction && command.taskMatch?.status === 'multiple' && !command.executablePayload?.taskId) {
        return;
      }
      if (isTaskAction && command.taskMatch?.status === 'none') {
        return;
      }
      try {
        const res = await confirmCommand.mutateAsync({
          action: command.action,
          payload: command.executablePayload || command.parameters,
          workspaceId: activeWorkspaceId,
        });
        setExecutionMessage(res.message);
        setExecutionError(false);
      } catch (err: any) {
        setExecutionMessage(err?.message || 'Failed to execute platform action.');
        setExecutionError(true);
      }
    },
    [activeWorkspaceId, confirmCommand, executionMessage]
  );

  const handleEnterPress = useCallback(() => {
    if (mode === 'loading' || confirmCommand.isPending || aiCommand.isPending || aiSearch.isPending) {
      return;
    }

    if (mode === 'result' && result && 'action' in result) {
      const cmd = result as ParsedCommand;
      const isTaskAction = cmd.action === 'move_task' || cmd.action === 'assign_task';
      if (isTaskAction && cmd.taskMatch?.status === 'multiple' && !cmd.executablePayload?.taskId) {
        return;
      }
      if (isTaskAction && cmd.taskMatch?.status === 'none') {
        return;
      }
      if (!executionMessage) {
        handleConfirmAction(cmd);
      }
      return;
    }

    if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
      const chosen = filteredSuggestions[selectedIndex];
      setQuery(chosen);
      setSelectedIndex(-1);
      executeQuery(chosen);
      return;
    }

    if (query.trim()) {
      executeQuery(query.trim());
    }
  }, [
    mode,
    result,
    executionMessage,
    handleConfirmAction,
    selectedIndex,
    filteredSuggestions,
    executeQuery,
    confirmCommand.isPending,
    aiCommand.isPending,
    aiSearch.isPending,
    query,
  ]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleEnterPress();
      return;
    }

    if (filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      }
    }
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'BUTTON' && target.textContent?.trim().toLowerCase() === 'cancel') {
        return;
      }
      if (target !== inputRef.current) {
        e.preventDefault();
        handleEnterPress();
      }
      return;
    }

    if (filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      }
    }
  };

  const navigateToSource = (link?: string) => {
    if (!link) return;
    setOpen(false);
    router.push(link as any);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-[#1F4D3A]/20 backdrop-blur-xs"
        onClick={() => setOpen(false)}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={handleDialogKeyDown}
          initial={{ opacity: 0, scale: 0.97, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -6 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#E2DACF] bg-white shadow-2xl focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-[#E2DACF] bg-[#F7F5F2] px-4 pt-2.5 pb-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setTab('all');
                  setMode('idle');
                  setResult(null);
                  inputRef.current?.focus();
                }}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  tab === 'all'
                    ? 'bg-[#1F4D3A] text-white shadow-xs'
                    : 'text-[#5A5A5A] hover:bg-[#EAE4DC] hover:text-[#1F4D3A]'
                }`}
              >
                All Actions & Commands
              </button>
              <button
                type="button"
                id="ask-workspace-ai-tab"
                onClick={() => {
                  setTab('ai_search');
                  setMode('idle');
                  setResult(null);
                  inputRef.current?.focus();
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  tab === 'ai_search'
                    ? 'bg-[#1F4D3A] text-white shadow-xs'
                    : 'text-[#5A5A5A] hover:bg-[#EAE4DC] hover:text-[#1F4D3A]'
                }`}
              >
                <span className="text-[#C89B3C] font-bold">✨</span>
                <span>Ask Workspace AI</span>
              </button>
            </div>
            <kbd className="hidden sm:inline-flex rounded border border-[#E2DACF] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A] shadow-xs">
              ESC to Close
            </kbd>
          </div>

          {/* Input Header Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnterPress();
            }}
            className="flex items-center gap-3 border-b border-[#E2DACF] px-4 py-3 bg-white"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F4D3A] text-white text-xs font-bold shadow-xs">
              {tab === 'ai_search' ? 'AI' : '⌘'}
            </div>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onKeyDown={handleInputKeyDown}
              onChange={(e) => {
                setQuery(e.target.value);
                if (mode !== 'idle') {
                  setMode('idle');
                  setResult(null);
                  setExecutionMessage(null);
                }
              }}
              placeholder={
                tab === 'ai_search'
                  ? 'Ask any question across workspace tasks, meetings, decisions, and documents...'
                  : 'Type a command (e.g. Move API testing to Done) or ask AI a question...'
              }
              className="flex-1 border-none bg-transparent text-sm font-medium text-[#2D2D2D] placeholder:text-[#8C857B] focus:outline-none"
            />
            <button
              type="submit"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              disabled={!query.trim() && selectedIndex < 0}
            />
            <button
              type="button"
              onClick={() => executeQuery()}
              disabled={!query.trim() || mode === 'loading'}
              className="rounded-md bg-[#1F4D3A] px-2.5 py-1 text-xs font-bold text-white transition-opacity hover:bg-[#16382A] disabled:opacity-40 cursor-pointer"
            >
              Ask ↵
            </button>
          </form>

          {/* Suggested / Example Prompts */}
          {mode === 'idle' && (
            <div className="p-4 space-y-3 bg-[#FFFFFF]">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">
                  {tab === 'ai_search'
                    ? 'Example Questions for Workspace AI'
                    : query
                    ? 'Matching Commands & Questions'
                    : 'Suggested Actions & Questions'}
                </p>
                <span className="text-[10px] text-[#8C857B]">Use ↑↓ to navigate, ↵ to run</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {filteredSuggestions.map((suggestion: string, idx: number) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        inputRef.current?.focus();
                        executeQuery(suggestion);
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'border-[#1F4D3A] bg-[#1F4D3A]/10 text-[#1F4D3A] ring-1 ring-[#1F4D3A]'
                          : 'border-[#E2DACF] bg-[#F7F5F2] text-[#2D2D2D] hover:border-[#1F4D3A] hover:bg-[#1F4D3A]/5 hover:text-[#1F4D3A]'
                      }`}
                    >
                      <span className="text-[#C89B3C] font-bold">›</span>
                      <span className="truncate">{suggestion}</span>
                    </button>
                  );
                })}

                {filteredSuggestions.length === 0 && query.trim() && (
                  <div className="col-span-full py-4 px-3 text-center rounded-lg border border-dashed border-[#E2DACF] bg-[#F7F5F2] space-y-2">
                    <p className="text-xs text-[#5A5A5A]">
                      {tab === 'all'
                        ? `No matching commands found for "${query}".`
                        : `No preset examples matching "${query}".`}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => executeQuery(query)}
                        className="rounded-md bg-[#1F4D3A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#16382A] cursor-pointer"
                      >
                        Ask Workspace AI &ldquo;{query}&rdquo; ↵
                      </button>
                      {tab === 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTab('ai_search');
                            inputRef.current?.focus();
                          }}
                          className="rounded-md border border-[#1F4D3A] px-2.5 py-1 text-xs font-semibold text-[#1F4D3A] hover:bg-[#1F4D3A]/5 cursor-pointer"
                        >
                          Switch to Ask Workspace AI ✨
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {mode === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 bg-white">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1F4D3A]/20 border-t-[#1F4D3A]" />
              <span className="mt-3 text-xs font-semibold text-[#5A5A5A]">
                Retrieving and verifying grounded workspace records...
              </span>
            </div>
          )}

          {/* Result Content */}
          {mode === 'result' && result && (
            <div className="max-h-[28rem] overflow-y-auto p-4 space-y-4 bg-white">
              {'action' in result ? (
                /* Command Action Result View */
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#E2DACF] bg-[#F7F5F2] p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[#1F4D3A] px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                        {result.action.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold text-[#C89B3C]">{result.confidence}% Confidence</span>
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-[#2D2D2D]">{result.explanation}</h4>

                    {/* Task Match Status & Disambiguation */}
                    {result.taskMatch && (
                      <>
                        {result.taskMatch.status === 'multiple' && (
                          <div className="mt-3 space-y-2 rounded-md bg-white p-3 border border-[#E2DACF]">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold text-[#8C857B] uppercase tracking-wider">
                                Multiple tasks matched &mdash; please choose one:
                              </p>
                              <span className="text-[10px] text-[#C89B3C] font-semibold">Selection Required</span>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {result.taskMatch.matches.map((cand) => {
                                const isChosen = result.executablePayload?.taskId === cand.id;
                                return (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    onClick={() => {
                                      setResult({
                                        ...result,
                                        executablePayload: {
                                          ...result.executablePayload,
                                          taskId: cand.id,
                                          taskTitle: cand.title,
                                          projectName: cand.projectName,
                                        },
                                        explanation: `${result.action === 'move_task' ? 'Move' : 'Assign'} task "${cand.title}"${
                                          result.executablePayload?.targetStatus
                                            ? ` to ${result.executablePayload.targetStatus}`
                                            : ''
                                        }`,
                                      });
                                    }}
                                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                                      isChosen
                                        ? 'border-[#1F4D3A] bg-[#1F4D3A]/10 text-[#1F4D3A] ring-1 ring-[#1F4D3A]'
                                        : 'border-[#E2DACF] bg-[#F7F5F2] text-[#2D2D2D] hover:border-[#1F4D3A] hover:bg-[#1F4D3A]/5'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#C89B3C]">{isChosen ? '●' : '○'}</span>
                                      <span className="font-semibold">{cand.title}</span>
                                      {cand.projectName && (
                                        <span className="text-[10px] text-[#767676]">({cand.projectName})</span>
                                      )}
                                    </div>
                                    <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold text-[#5A5A5A]">
                                      {cand.status}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {result.taskMatch.status === 'none' && (
                          <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>⚠️</span>
                              <span>Task Not Found</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-amber-800">
                              {result.taskMatch.message}
                            </p>
                          </div>
                        )}

                        {(result.taskMatch.status === 'exact' || result.taskMatch.status === 'partial') && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#1F4D3A] font-semibold">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                            <span>
                              Matched: &ldquo;{result.executablePayload?.taskTitle || result.taskMatch.matches[0]?.title}&rdquo;
                              {result.taskMatch.status === 'partial' ? ' (partial match)' : ''}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {result.executablePayload && (
                      <div className="mt-3 rounded-md bg-white p-3 border border-[#E2DACF] text-xs space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#767676]">
                          Action Parameters Review
                        </p>
                        {Object.entries(result.executablePayload)
                          .filter(([k]) => k !== 'candidates')
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[#2D2D2D]">
                              <span className="font-medium text-[#5A5A5A] capitalize">{k}:</span>
                              <span className="font-semibold text-[#2D2D2D]">{String(v ?? '')}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {(() => {
                      const isTaskAction = result.action === 'move_task' || result.action === 'assign_task';
                      const hasMultipleUnselected =
                        isTaskAction && result.taskMatch?.status === 'multiple' && !result.executablePayload?.taskId;
                      const isNotFound = isTaskAction && result.taskMatch?.status === 'none';
                      const isExecuteDisabled =
                        confirmCommand.isPending || !!executionMessage || hasMultipleUnselected || isNotFound;
                      const buttonLabel = confirmCommand.isPending
                        ? 'Executing...'
                        : executionMessage
                        ? 'Executed'
                        : isNotFound
                        ? 'No Matching Task'
                        : hasMultipleUnselected
                        ? 'Select Task to Proceed'
                        : 'Review & Execute Action (↵)';

                      return (
                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#E2DACF] pt-3">
                          <Button variant="ghost" size="sm" onClick={() => setMode('idle')}>
                            Cancel
                          </Button>
                          <Button
                            id="confirm-execute-button"
                            data-testid="confirm-execute-button"
                            size="sm"
                            variant="primary"
                            onClick={() => handleConfirmAction(result as ParsedCommand)}
                            disabled={isExecuteDisabled}
                          >
                            {buttonLabel}
                          </Button>
                        </div>
                      );
                    })()}

                    {executionMessage && (
                      <div
                        className={`mt-3 rounded-md p-2.5 text-center text-xs font-bold border ${
                          executionError
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-[#1F4D3A]/10 text-[#1F4D3A] border-[#1F4D3A]/20'
                        }`}
                      >
                        {executionError ? '⚠ ' : '✓ '}
                        {executionMessage}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Grounded Workspace AI Search Result View */
                <div className="space-y-4">
                  {/* Check for Search Error */}
                  {result.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/70 p-5 text-center space-y-3">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 text-lg font-bold">
                        ⚠
                      </div>
                      <h4 className="text-sm font-bold text-red-950">Search Error</h4>
                      <p className="text-xs leading-relaxed text-red-900 max-w-md mx-auto">
                        {result.answer || 'An error occurred while searching workspace records.'}
                      </p>
                    </div>
                  ) : result.answer === INSUFFICIENT_INFO_TEXT || (!result.isGrounded && (!result.sources || result.sources.length === 0)) ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-center space-y-3">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-lg font-bold">
                        ℹ
                      </div>
                      <h4 className="text-sm font-bold text-amber-950">Insufficient Workspace Records</h4>
                      <p className="text-xs leading-relaxed text-amber-900 max-w-md mx-auto">
                        {INSUFFICIENT_INFO_TEXT}
                      </p>
                      <div className="pt-2 text-[11px] text-[#767676] max-w-md mx-auto border-t border-amber-200/60">
                        Try asking questions about tasks, meetings, architecture decisions, or documents that exist in this workspace.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Synthesized Grounded Answer */}
                      {result.answer && (
                        <div className="rounded-xl border border-[#1F4D3A]/20 bg-[#F7F5F2] p-4 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A] text-white text-[10px] font-bold">
                                AI
                              </span>
                              <h4 className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider">
                                Grounded Answer
                              </h4>
                            </div>
                            <span className="text-[10px] text-[#1F4D3A] font-semibold bg-[#1F4D3A]/10 px-2 py-0.5 rounded">
                              Workspace Ground-Truth
                            </span>
                          </div>
                          <p className="mt-2.5 text-sm leading-relaxed text-[#2D2D2D] font-medium">
                            {result.answer}
                          </p>
                        </div>
                      )}

                      {/* Explicit Facts vs Inferences */}
                      {result.facts && result.facts.length > 0 && (
                        <div className="rounded-lg border border-[#E2DACF] bg-[#FFFFFF] p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1F4D3A]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1F4D3A]" />
                            <span>Retrieved Facts (Verified Workspace Records)</span>
                          </div>
                          <ul className="space-y-1 pl-1">
                            {result.facts.map((fact: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5 text-xs text-[#2D2D2D]">
                                <span className="text-[#1F4D3A] font-bold">✓</span>
                                <span>{fact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.inferences && result.inferences.length > 0 && (
                        <div className="rounded-lg border border-[#E2DACF] bg-[#F7F5F2] p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C89B3C]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C89B3C]" />
                            <span>Contextual Inferences</span>
                          </div>
                          <ul className="space-y-1 pl-1">
                            {result.inferences.map((inf: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5 text-xs text-[#5A5A5A] italic">
                                <span className="text-[#C89B3C] font-bold">›</span>
                                <span>{inf}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Source Records & Deep Links */}
                      {(result.sources?.length > 0 || result.results?.length > 0) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#767676]">
                              Verified Source Records ({result.sources?.length || result.results?.length})
                            </h5>
                            <span className="text-[10px] text-[#8C857B]">
                              Click to view record in dashboard
                            </span>
                          </div>
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {(result.sources || (result.results as any[]))?.map(
                              (s: SourceCitation | any, i: number) => {
                                const resourceType = (s.type || 'record').replace('_', ' ').toUpperCase();
                                const relevanceScore = s.relevanceScore ?? s.relevance ?? 0;

                                return (
                                  <button
                                    key={s.id || i}
                                    type="button"
                                    onClick={() => navigateToSource(s.link)}
                                    className="w-full text-left rounded-lg border border-[#E2DACF] bg-white p-3 transition-all hover:border-[#1F4D3A] hover:bg-[#1F4D3A]/5 cursor-pointer shadow-2xs group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="rounded bg-[#EFE9E1] px-1.5 py-0.5 text-[9px] font-bold text-[#1F4D3A] uppercase tracking-wide">
                                          {resourceType}
                                        </span>
                                        <h4 className="text-xs font-bold text-[#2D2D2D] group-hover:text-[#1F4D3A] transition-colors truncate max-w-sm">
                                          {s.title}
                                        </h4>
                                      </div>
                                      <span className="text-[10px] text-[#767676] font-medium shrink-0">
                                        {relevanceScore}% Match Relevance
                                      </span>
                                    </div>
                                    <p className="mt-1.5 text-xs text-[#5A5A5A] leading-snug line-clamp-2">
                                      {s.snippet}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-[#1F4D3A] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span>Open {resourceType.toLowerCase()} &rarr;</span>
                                    </div>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#E2DACF] bg-[#F7F5F2] px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#5A5A5A]">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[#E2DACF] bg-white px-1.5 py-0.5 text-[10px] font-semibold">↵</kbd>
                {mode === 'result' && result && 'action' in result && !executionMessage
                  ? 'Confirm Action'
                  : 'Execute / Ask'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[#E2DACF] bg-white px-1.5 py-0.5 text-[10px] font-semibold">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[#E2DACF] bg-white px-1.5 py-0.5 text-[10px] font-semibold">ESC</kbd>
                Close
              </span>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'result' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('idle');
                    setResult(null);
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs font-semibold text-[#1F4D3A] hover:underline cursor-pointer"
                >
                  New Search
                </button>
              )}
              <span className="text-xs text-[#1F4D3A] font-bold">CollabAI Knowledge Engine</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
