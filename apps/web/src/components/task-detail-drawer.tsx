'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, TaskComment } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MemberSelector, type WorkspaceMemberOption } from '@/components/member-selector';
import { useTaskComments, useCreateTaskComment } from '@/lib/queries/tasks';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { useToast } from '@/components/ui/toast';
import {
  AlertCircle,
  AtSign,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  User,
  Users,
} from 'lucide-react';

interface TaskDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: () => void;
  onDelete: () => void;
  members?: WorkspaceMemberOption[];
  onAssigneeChange?: (newAssigneeId: string | null) => Promise<void> | void;
  isUpdatingAssignee?: boolean;
}

export function TaskDetailDrawer({
  open,
  onClose,
  task,
  onEdit,
  onDelete,
  members,
  onAssigneeChange,
  isUpdatingAssignee = false,
}: TaskDetailDrawerProps) {
  // Fetch workspace details if members are not explicitly supplied by parent
  const workspaceId = task?.project?.workspaceId || (task as { workspaceId?: string } | null)?.workspaceId || null;
  const { data: wsDetails } = useWorkspaceDetails(workspaceId);

  const effectiveMembers: WorkspaceMemberOption[] = useMemo(() => {
    if (members && members.length > 0) return members;
    if (!wsDetails?.members) return [];
    return wsDetails.members.map((m) => ({
      userId: m.userId,
      name: m.name || null,
      email: m.email,
      avatarUrl: m.avatarUrl || null,
      role: m.role,
    }));
  }, [members, wsDetails]);

  // Ensure global CommandBar is closed when Task Detail Drawer opens
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('close-command-bar'));
    }
  }, [open]);

  if (!task) return null;

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const createdAt = new Date(task.createdAt);
  const updatedAt = new Date(task.updatedAt);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#1F4D3A]/20 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-[#E2DACF] bg-white p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#E2DACF]/60">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-lg font-bold text-[#1C2421] break-words leading-snug">{task.title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-[#525B56] hover:bg-[#F0EEE6] hover:text-[#1C2421] transition-colors cursor-pointer"
                  aria-label="Close task drawer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Status & Priority */}
              <div className="flex gap-2 mb-5">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>

              {/* Description */}
              {task.description && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#525B56] mb-2">Description</h3>
                  <p className="text-xs text-[#2D3330] leading-relaxed whitespace-pre-wrap bg-[#FAF9F5] p-3 rounded-xl border border-[#E2DCD2]/70">{task.description}</p>
                </div>
              )}

              {/* AI Insights Suggestion */}
              <div className="mb-5 rounded-xl border border-[#1F4D3A]/20 bg-[#1F4D3A]/5 p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-[#1F4D3A] text-[9px] font-bold text-white">
                    AI
                  </span>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1F4D3A]">Task Risk & Optimization Insight</h4>
                </div>
                <p className="text-xs text-[#1C2421] leading-relaxed font-medium">
                  {dueDate && dueDate < new Date() && task.status !== 'DONE'
                    ? `Risk Detected: This task is past due. Dependent milestone items may be delayed.`
                    : task.assignee
                    ? `Optimal Workload: Assigned to ${task.assignee.name || task.assignee.email}. Velocity is healthy.`
                    : `Optimization Tip: Task is unassigned. AI Workload Balancer suggests assigning to an underloaded member.`}
                </p>
              </div>

              {/* Details Grid */}
              <div className="space-y-2.5 mb-6 p-4 rounded-xl border border-[#E2DCD2] bg-[#F7F5F0]/50 text-xs">
                <DetailRow label="Due Date" value={dueDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || '—'} />
                <DetailRow label="Creator" value={task.creator?.name || task.creator?.email || '—'} />
                
                {/* Assignee Row with Interactive Selector */}
                <div className="py-1.5 border-t border-b border-[#E2DCD2]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#525B56]">Assignee</span>
                    {isUpdatingAssignee && (
                      <span className="flex items-center gap-1 text-[10px] text-[#1F4D3A] font-semibold">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                  </div>
                  {effectiveMembers.length > 0 && onAssigneeChange ? (
                    <MemberSelector
                      members={effectiveMembers}
                      value={task.assigneeId || null}
                      onChange={(newId) => onAssigneeChange(newId)}
                      disabled={isUpdatingAssignee}
                      placeholder="Unassigned"
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-[#1C2421]">
                      {task.assignee?.name || task.assignee?.email || 'Unassigned'}
                    </span>
                  )}
                </div>

                <DetailRow label="Created" value={createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
                <DetailRow label="Updated" value={updatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
              </div>

              {/* Discussion & Comments Section with @Mentions */}
              <TaskCommentsSection taskId={task.id} members={effectiveMembers} />
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 border-t border-[#E2DCD2] pt-5 mt-6">
              <Button variant="outline" onClick={onEdit} className="flex-1 border-[#E2DCD2]">
                Edit Task
              </Button>
              <Button variant="danger" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wider text-[#525B56]">{label}</span>
      <span className="text-xs font-semibold text-[#1C2421]">{value}</span>
    </div>
  );
}

function formatCommentTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diffInSec < 45) return 'Just now';
    const diffInMin = Math.floor(diffInSec / 60);
    if (diffInMin < 60) return `${diffInMin}m ago`;
    const diffInHours = Math.floor(diffInMin / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getAuthorInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.slice(0, 2).toUpperCase();
  return 'U';
}

/**
 * Safely renders comment text with highlighted @mention badges.
 * Splits text into React text nodes and styled badge components without unsafe HTML.
 */
function renderCommentContent(content: string) {
  const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    const displayName = match[1];
    const userId = match[2];

    parts.push(
      <span
        key={`${match.index}-${userId}`}
        className="inline-flex items-center gap-0.5 rounded-md bg-[#1F4D3A]/10 text-[#1F4D3A] font-semibold px-1.5 py-0.2 text-[11px] border border-[#1F4D3A]/20 mx-0.5 align-baseline"
        title={`Member ID: ${userId}`}
      >
        <AtSign className="h-2.5 w-2.5 inline" />
        <span>{displayName}</span>
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

interface TaskCommentsSectionProps {
  taskId: string;
  members: WorkspaceMemberOption[];
}

/**
 * TaskCommentsSection handles fetching, displaying, and composing task comments
 * with integrated searchable @mention picker.
 */
function TaskCommentsSection({ taskId, members }: TaskCommentsSectionProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mention autocomplete state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  const { data: commentsData, isLoading, isError, error, refetch } = useTaskComments(taskId);
  const createCommentMutation = useCreateTaskComment();

  const comments: TaskComment[] = commentsData?.comments || [];

  // Close mention picker when clicking outside
  useEffect(() => {
    if (!showMentionPicker) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMentionPicker]);

  // Filter members for autocomplete
  const filteredMembers = useMemo(() => {
    if (!showMentionPicker) return [];
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return members.slice(0, 6);
    return members
      .filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [showMentionPicker, mentionQuery, members]);

  // Insert mention token into textarea
  const insertMention = (member: WorkspaceMemberOption) => {
    const textarea = textareaRef.current;
    const memberName = member.name || member.email.split('@')[0];
    const mentionToken = `@[${memberName}](${member.userId}) `;

    if (!textarea) {
      setCommentText((prev) => prev + mentionToken);
      setShowMentionPicker(false);
      return;
    }

    const selStart = textarea.selectionStart;
    const textBefore = commentText.slice(0, selStart);
    const textAfter = commentText.slice(selStart);

    // Replace the trailing @query with mentionToken
    const lastAtIdx = textBefore.lastIndexOf('@');
    const newTextBefore = lastAtIdx !== -1 ? textBefore.slice(0, lastAtIdx) : textBefore;
    const updated = newTextBefore + mentionToken + textAfter;

    setCommentText(updated);
    setShowMentionPicker(false);
    setMentionQuery('');

    // Refocus and place cursor directly after mention
    setTimeout(() => {
      textarea.focus();
      const newPos = newTextBefore.length + mentionToken.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Detect @ symbol on text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const selStart = e.target.selectionStart;
    setCommentText(val);
    setSubmitError(null);

    const textBefore = val.slice(0, selStart);
    // Only match continuous query after @ without spaces to prevent picker hanging open
    const atMatch = textBefore.match(/@([a-zA-Z0-9_-]{0,20})$/);

    if (atMatch) {
      setShowMentionPicker(true);
      setMentionQuery(atMatch[1] || '');
      setMentionIndex(0);
    } else {
      setShowMentionPicker(false);
      setMentionQuery('');
    }
  };

  // Keyboard navigation for mention suggestions and Ctrl/Cmd+Enter submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.nativeEvent?.stopImmediatePropagation?.();

    // Submit with Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handlePostComment(e);
      return;
    }

    if (showMentionPicker && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredMembers[mentionIndex]) {
          e.preventDefault();
          e.stopPropagation();
          insertMention(filteredMembers[mentionIndex]);
          return;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowMentionPicker(false);
        return;
      }
    }

    // Stop keyboard event propagation so keystrokes never trigger global window listeners
    e.stopPropagation();
  };

  // Quick button to open mention picker
  const handleMentionButtonClick = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selStart = textarea.selectionStart;
    const textBefore = commentText.slice(0, selStart);
    const textAfter = commentText.slice(selStart);

    // If already preceded by @, just open picker
    if (textBefore.endsWith('@')) {
      setShowMentionPicker(true);
      setMentionQuery('');
      setMentionIndex(0);
      textarea.focus();
      return;
    }

    const needsSpace = textBefore.length > 0 && !textBefore.endsWith(' ');
    const inserted = `${needsSpace ? ' ' : ''}@`;
    const updated = textBefore + inserted + textAfter;

    setCommentText(updated);
    setShowMentionPicker(true);
    setMentionQuery('');
    setMentionIndex(0);

    setTimeout(() => {
      textarea.focus();
      const pos = textBefore.length + inserted.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handlePostComment = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent duplicate submission from rapid clicks
    if (isSubmittingRef.current || createCommentMutation.isPending) {
      return;
    }

    if (!taskId || !taskId.trim()) {
      setSubmitError('Task ID is missing');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length > 5000) {
      setSubmitError('Comment cannot exceed 5000 characters');
      return;
    }

    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      await createCommentMutation.mutateAsync({
        taskId: taskId.trim(),
        content: trimmed,
      });
      // Success clears the composer and hides mention picker
      setCommentText('');
      setShowMentionPicker(false);
      toast('Comment posted successfully', 'success');
    } catch (err: any) {
      // Failure displays error and preserves typed comment
      const msg = err?.message || 'Failed to post comment';
      setSubmitError(msg);
      toast(msg, 'error');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="space-y-3.5 pt-4 border-t border-[#E2DCD2]/70">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-[#1F4D3A]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C2421]">
            Task Comments & Updates
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#F0EEE6] px-2 py-0.5 text-[10px] font-semibold text-[#525B56] border border-[#E2DCD2]">
          {comments.length}
        </span>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center p-6 text-xs text-[#525B56] gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#1F4D3A]" />
            <span>Loading discussion...</span>
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-[#C93B3B]/20 bg-[#FFF5F5] p-3 text-center text-xs space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[#C93B3B] font-semibold">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Failed to load comments</span>
            </div>
            <p className="text-[11px] text-[#525B56]">{(error as any)?.message || 'Could not retrieve task comments.'}</p>
            <button
              onClick={() => refetch()}
              className="text-[11px] font-semibold text-[#1F4D3A] underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && comments.length === 0 && (
          <div className="rounded-xl border border-[#E2DCD2] bg-[#FAF9F5] p-5 text-center text-xs text-[#525B56] space-y-1">
            <p className="font-semibold text-[#1C2421]">No comments yet</p>
            <p className="text-[11px]">Start the task conversation or tag team members with @mention below.</p>
          </div>
        )}

        {!isLoading && !isError && comments.length > 0 && (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {comments.map((comment) => {
              const authorName = comment.author?.name || comment.author?.email || 'Team Member';
              const initials = getAuthorInitials(comment.author?.name, comment.author?.email);
              const timeAgo = formatCommentTime(comment.createdAt);
              const fullTime = new Date(comment.createdAt).toLocaleString();

              return (
                <div
                  key={comment.id}
                  className="rounded-xl border border-[#E2DCD2]/80 bg-[#FAF9F5] p-3 transition-colors hover:border-[#1F4D3A]/30 hover:bg-white shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {comment.author?.avatarUrl ? (
                        <img
                          src={comment.author.avatarUrl}
                          alt={authorName}
                          className="h-5 w-5 rounded-full object-cover border border-[#E2DCD2]"
                        />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[9px] font-bold text-[#1F4D3A]">
                          {initials}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-[#1C2421] truncate max-w-[180px]">
                        {authorName}
                      </span>
                    </div>

                    <span
                      className="text-[10px] text-[#8A948D] cursor-help flex items-center gap-0.5"
                      title={fullTime}
                    >
                      <Clock className="h-2.5 w-2.5 opacity-60" />
                      {timeAgo}
                    </span>
                  </div>

                  {/* Render content with safe mention pills */}
                  <div className="text-xs text-[#2D3330] leading-relaxed whitespace-pre-wrap break-words pl-6.5">
                    {renderCommentContent(comment.content)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comment Composer */}
      <form onSubmit={handlePostComment} className="space-y-2 pt-2 relative">
        {/* Searchable Mention Suggestion Dropdown */}
        <AnimatePresence>
          {showMentionPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-full mb-1.5 left-0 w-full z-50 rounded-xl border border-[#E2DCD2] bg-white shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#E2DCD2] bg-[#F7F5F0] px-3 py-1.5 text-[11px] text-[#525B56] font-medium">
                <span className="flex items-center gap-1">
                  <AtSign className="h-3 w-3 text-[#1F4D3A]" />
                  Mention workspace member
                </span>
                <span className="text-[10px] text-[#8A948D]">Use ↑↓ to navigate, Enter to select</span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-[#E2DCD2]/40">
                {filteredMembers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#8A948D]">
                    {members.length === 0
                      ? 'No members found in this workspace'
                      : `No members matching "${mentionQuery}"`}
                  </div>
                ) : (
                  filteredMembers.map((member, idx) => {
                    const isSelected = idx === mentionIndex;
                    const initials = getAuthorInitials(member.name, member.email);

                    return (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => insertMention(member)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#E8EFE9] text-[#1F4D3A]' : 'hover:bg-[#F7F5F0] text-[#1C2421]'
                        }`}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name || member.email}
                            className="h-5 w-5 rounded-full object-cover border border-[#E2DCD2]"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F4D3A]/10 text-[9px] font-bold text-[#1F4D3A]">
                            {initials}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">
                            {member.name || member.email.split('@')[0]}
                          </div>
                          <div className="text-[10px] text-[#8A948D] truncate">
                            {member.email}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] text-[#1F4D3A] font-semibold">Select</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment or type @ to mention a team member..."
            rows={3}
            maxLength={5000}
            className="w-full rounded-xl border border-[#E2DCD2] bg-white p-3 text-xs text-[#1C2421] placeholder-[#8A948D] focus:border-[#1F4D3A] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] transition-all resize-none"
          />
        </div>

        {submitError && (
          <p className="text-[11px] text-[#C93B3B] font-medium">{submitError}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Quick @ Mention trigger button */}
            <button
              type="button"
              onClick={handleMentionButtonClick}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] px-2 py-1 text-[11px] font-medium text-[#525B56] hover:bg-[#E8EFE9] hover:text-[#1F4D3A] transition-colors cursor-pointer"
              title="Mention a member"
            >
              <AtSign className="h-3 w-3 text-[#1F4D3A]" />
              <span>Mention</span>
            </button>

            <span className="text-[10px] text-[#8A948D]">
              {commentText.length} / 5000
            </span>
          </div>

          <Button
            type="submit"
            size="sm"
            variant="primary"
            onClick={(e) => handlePostComment(e)}
            disabled={!commentText.trim() || createCommentMutation.isPending}
            loading={createCommentMutation.isPending}
            className="h-7 px-3 text-xs gap-1.5 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
          >
            {createCommentMutation.isPending ? (
              <span>Sending...</span>
            ) : (
              <>
                <Send className="h-3 w-3" />
                <span>Send</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
