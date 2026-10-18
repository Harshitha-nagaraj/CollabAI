'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useAICommand, useConfirmCommand, useAISearch, type ParsedCommand, type SearchResponse } from '@/lib/queries/ai';
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

const SUGGESTIONS = [
  'Assign login task to Harshitha.',
  'Move API testing to Done.',
  'Create a high priority bug.',
  'Schedule sprint planning tomorrow.',
  'Why is payment integration delayed?',
  "What decisions were made during yesterday's meeting?",
  "What are Rahul's pending tasks?",
  'Show overdue tasks.',
];

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ParsedCommand | SearchResponse | null>(null);
  const [mode, setMode] = useState<'idle' | 'loading' | 'result'>('idle');
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { selectedWorkspaceId } = useAppStore();

  const aiCommand = useAICommand();
  const confirmCommand = useConfirmCommand();
  const aiSearch = useAISearch();

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return SUGGESTIONS;
    const q = query.toLowerCase().trim();
    return SUGGESTIONS.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

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

    const handleOpen = () => setOpen(true);
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

  const executeQuery = useCallback(async (textToSubmit?: string) => {
    const commandText = (textToSubmit ?? query).trim();
    if (!commandText) return;
    if (mode === 'loading' || confirmCommand.isPending || aiCommand.isPending || aiSearch.isPending) return;

    setMode('loading');
    setExecutionMessage(null);
    setExecutionError(false);

    try {
      const isCommand = /^(create|add|move|assign|schedule|show|list|update|delete)\b/i.test(commandText);

      if (isCommand) {
        const parsed = await aiCommand.mutateAsync({
          command: commandText,
          workspaceId: selectedWorkspaceId || undefined,
        });
        setResult(parsed);
      } else if (selectedWorkspaceId) {
        const searchResult = await aiSearch.mutateAsync({ query: commandText, workspaceId: selectedWorkspaceId });
        setResult(searchResult);
      } else {
        const parsed = await aiCommand.mutateAsync({
          command: commandText,
          workspaceId: selectedWorkspaceId || undefined,
        });
        setResult(parsed);
      }
      setMode('result');
    } catch (err: any) {
      setMode('result');
      setResult({
        query: commandText,
        results: [],
        answer: err?.message || 'Failed to process command or search.',
        supportingEvidence: [],
        relatedTasks: [],
        relatedMeetings: [],
        relatedDocuments: [],
      });
    }
  }, [query, mode, selectedWorkspaceId, aiCommand, aiSearch, confirmCommand]);

  const handleConfirmAction = useCallback(async (command: ParsedCommand) => {
    if (!selectedWorkspaceId || confirmCommand.isPending || executionMessage) return;
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
        workspaceId: selectedWorkspaceId,
      });
      setExecutionMessage(res.message);
      setExecutionError(false);
    } catch (err: any) {
      setExecutionMessage(err?.message || 'Failed to execute platform action.');
      setExecutionError(true);
    }
  }, [selectedWorkspaceId, confirmCommand, executionMessage]);

  const handleEnterPress = useCallback(() => {
    // Prevent double execution while any async mutation or loading is in progress
    if (mode === 'loading' || confirmCommand.isPending || aiCommand.isPending || aiSearch.isPending) {
      return;
    }

    // In result mode with confirmation action: advance confirmation step on Enter
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

    // If a suggestion is currently selected via ArrowUp/ArrowDown, submit that suggestion
    if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
      const chosen = filteredSuggestions[selectedIndex];
      setQuery(chosen);
      setSelectedIndex(-1);
      executeQuery(chosen);
      return;
    }

    // Otherwise submit current non-empty query
    if (query.trim()) {
      executeQuery(query.trim());
    }
  }, [mode, result, executionMessage, handleConfirmAction, selectedIndex, filteredSuggestions, executeQuery, confirmCommand.isPending, aiCommand.isPending, aiSearch.isPending, query]);

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
      // If Enter originates outside input (e.g. dialog container or action button), trigger enter press
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

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-[#1F4D3A]/20 backdrop-blur-xs"
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
          className="w-full max-w-xl overflow-hidden rounded-xl border border-[#E2DACF] bg-white shadow-2xl focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input Header Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnterPress();
            }}
            className="flex items-center gap-3 border-b border-[#E2DACF] px-4 py-3 bg-[#F7F5F2]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1F4D3A] text-white text-xs font-bold shadow-xs">
              C
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
              placeholder="Type a natural language command or ask AI a question..."
              className="flex-1 border-none bg-transparent text-sm font-medium text-[#2D2D2D] placeholder:text-[#8C857B] focus:outline-none"
            />
            {/* Hidden submit button to guarantee standard form submission in all browsers */}
            <button
              type="submit"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              disabled={!query.trim() && selectedIndex < 0}
            />
            <kbd className="hidden sm:inline-flex rounded border border-[#E2DACF] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A] shadow-xs">
              ESC
            </kbd>
          </form>

          {/* Suggestions */}
          {mode === 'idle' && filteredSuggestions.length > 0 && (
            <div className="p-4 space-y-3 bg-[#FFFFFF]">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">
                  {query ? 'Matching Commands' : 'Suggested Commands'}
                </p>
                <span className="text-[10px] text-[#8C857B]">Use ↑↓ to navigate, ↵ to run</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
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
              </div>
            </div>
          )}

          {/* Loading State */}
          {mode === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1F4D3A]/20 border-t-[#1F4D3A]" />
              <span className="ml-3 text-xs font-semibold text-[#5A5A5A]">Processing natural language command...</span>
            </div>
          )}

          {/* Result Content */}
          {mode === 'result' && result && (
            <div className="max-h-96 overflow-y-auto p-4 space-y-4 bg-white">
              {'action' in result ? (
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
                                          result.executablePayload?.targetStatus ? ` to ${result.executablePayload.targetStatus}` : ''
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
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#767676]">Action Parameters Review</p>
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
                      const hasMultipleUnselected = isTaskAction && result.taskMatch?.status === 'multiple' && !result.executablePayload?.taskId;
                      const isNotFound = isTaskAction && result.taskMatch?.status === 'none';
                      const isExecuteDisabled = confirmCommand.isPending || !!executionMessage || hasMultipleUnselected || isNotFound;
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
                        {executionError ? '⚠ ' : '✓ '}{executionMessage}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.answer && (
                    <div className="rounded-lg border border-[#1F4D3A]/20 bg-[#1F4D3A]/5 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A] text-white text-[10px] font-bold">
                          AI
                        </span>
                        <h4 className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider">Synthesized Answer</h4>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#2D2D2D] font-medium">{result.answer}</p>
                    </div>
                  )}

                  {result.supportingEvidence && result.supportingEvidence.length > 0 && (
                    <div className="rounded-lg border border-[#E2DACF] bg-[#F7F5F2] p-3 space-y-1.5">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#767676]">Supporting Evidence</h5>
                      <ul className="space-y-1">
                        {result.supportingEvidence.map((ev: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-[#2D2D2D]">
                            <span className="text-[#1F4D3A] font-bold">›</span>
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.results && result.results.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#767676] px-1">Related Knowledge Items</h5>
                      {result.results.map((r: any, i: number) => (
                        <div key={i} className="rounded-lg border border-[#E2DACF] bg-white p-3 transition-colors hover:border-[#C5BBAE]">
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-[#EFE9E1] px-1.5 py-0.5 text-[10px] font-bold text-[#2D2D2D] uppercase">
                              {r.type}
                            </span>
                            <span className="text-[11px] text-[#767676] font-medium">{r.relevance}% relevance</span>
                          </div>
                          <h4 className="mt-1 text-xs font-bold text-[#2D2D2D]">{r.title}</h4>
                          <p className="mt-1 text-xs text-[#5A5A5A] leading-snug">{r.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#E2DACF] bg-[#F7F5F2] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#5A5A5A]">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[#E2DACF] bg-white px-1.5 py-0.5 text-[10px] font-semibold">↵</kbd>
                {mode === 'result' && result && 'action' in result && !executionMessage
                  ? 'Confirm Action'
                  : 'Execute'}
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
            <span className="text-xs text-[#1F4D3A] font-bold">CollabAI Knowledge Engine</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
