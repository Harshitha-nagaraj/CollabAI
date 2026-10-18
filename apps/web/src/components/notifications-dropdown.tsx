'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useUserNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type NotificationItem,
} from '@/lib/queries/notifications';
import { useAppStore } from '@/lib/store';
import {
  Bell,
  CheckCircle2,
  CheckSquare,
  Clock,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  Info,
  AtSign,
} from 'lucide-react';

/**
 * Formats relative time for notification timestamps.
 */
function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSec < 60) return 'Just now';
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

/**
 * Returns icon and styling based on notification type.
 */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return {
        icon: CheckSquare,
        bg: 'bg-[#E8EFE9] text-[#1F4D3A] border border-[#1F4D3A]/25',
      };
    case 'TASK_STATUS_CHANGED':
      return {
        icon: ArrowUpDown,
        bg: 'bg-[#FAF3E0] text-[#9E731D] border border-[#C89B3C]/30',
      };
    case 'TASK_COMPLETED':
      return {
        icon: CheckCircle2,
        bg: 'bg-[#1F4D3A] text-white',
      };
    case 'MEETING_SUMMARY_READY':
      return {
        icon: Sparkles,
        bg: 'bg-[#F2EDFB] text-[#6E48AA] border border-[#6E48AA]/25',
      };
    case 'TASK_MENTION':
      return {
        icon: AtSign,
        bg: 'bg-[#F2EDFB] text-[#6E48AA] border border-[#6E48AA]/25',
      };
    default:
      return {
        icon: Info,
        bg: 'bg-[#F0EEE6] text-[#525B56] border border-[#E2DCD2]',
      };
  }
}

export function NotificationsDropdown() {
  const router = useRouter();
  const { selectedWorkspaceId } = useAppStore();
  const { data: notifications = [] as NotificationItem[] } = useUserNotifications(selectedWorkspaceId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [isOpen, setIsOpen] = useState(false);

  const notificationList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationList.filter((n) => !n.isRead).length;

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead && selectedWorkspaceId) {
      markRead.mutate({ notificationId: item.id, workspaceId: selectedWorkspaceId });
    }

    if (item.link) {
      setIsOpen(false);
      router.push(item.link as any);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedWorkspaceId || unreadCount === 0) return;
    markAllRead.mutate({ workspaceId: selectedWorkspaceId });
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2DCD2] bg-white text-[#1C2421] transition-all hover:border-[#1F4D3A] hover:bg-[#F7F5F0] cursor-pointer shadow-xs"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="h-4 w-4 text-[#525B56]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#C96B4A] text-[9px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on click outside */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 z-50 rounded-2xl border border-[#E2DCD2] bg-white shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E2DCD2] p-3.5 bg-[#F7F5F0]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#1C2421]">Notifications & Alerts</h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[#C96B4A]/15 px-2 py-0.5 text-[10px] font-bold text-[#C96B4A] border border-[#C96B4A]/25">
                      {unreadCount} New
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markAllRead.isPending}
                    className="text-[11px] font-semibold text-[#1F4D3A] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-88 overflow-y-auto p-2 divide-y divide-[#E2DCD2]/40">
                {notificationList.length === 0 ? (
                  <div className="p-8 text-center text-xs font-medium text-[#8A948D] space-y-2">
                    <Clock className="mx-auto h-6 w-6 text-[#8A948D]/60" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notificationList.map((item) => {
                    const iconConfig = getNotificationIcon(item.type);
                    const IconComp = iconConfig.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`group flex cursor-pointer items-start gap-3 p-2.5 transition-all rounded-xl ${
                          !item.isRead
                            ? 'bg-[#E8EFE9]/40 hover:bg-[#E8EFE9]/70'
                            : 'hover:bg-[#F7F5F0]'
                        }`}
                      >
                        {/* Icon Badge */}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-2xs ${iconConfig.bg}`}
                        >
                          <IconComp className="h-3.5 w-3.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-bold text-[#1C2421] truncate">
                              {item.title}
                            </h5>
                            {!item.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#1F4D3A] shrink-0" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#525B56] leading-snug line-clamp-2">
                            {item.message}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-[#8A948D]">
                            <span>{formatTimeAgo(item.createdAt)}</span>
                            {item.link && (
                              <span className="flex items-center gap-0.5 text-[#1F4D3A] opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>View</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
