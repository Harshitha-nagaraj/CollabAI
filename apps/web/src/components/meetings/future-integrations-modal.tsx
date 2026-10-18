'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Plug,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useIntegrationsStatus, WorkspaceIntegration } from '@/lib/queries/integrations';
import { useWorkspaceDetails } from '@/lib/queries/workspaces';
import { IntegrationSetupModal } from './integration-setup-modal';

interface Props {
  isOpen: boolean;
  workspaceId?: string | null;
  onClose: () => void;
}

type CategoryFilter = 'ALL' | 'Video Conferencing' | 'Calendar' | 'Communication' | 'Development';

export function FutureIntegrationsModal({ isOpen, workspaceId: propWorkspaceId, onClose }: Props) {
  const { selectedWorkspaceId } = useAppStore();
  const effectiveWorkspaceId = propWorkspaceId || selectedWorkspaceId;

  const { data: workspaceData } = useWorkspaceDetails(effectiveWorkspaceId);
  const {
    data: integrations,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useIntegrationsStatus(effectiveWorkspaceId);

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<WorkspaceIntegration | null>(null);

  const categories: CategoryFilter[] = [
    'ALL',
    'Video Conferencing',
    'Calendar',
    'Communication',
    'Development',
  ];

  const filteredIntegrations = useMemo(() => {
    if (!integrations) return [];
    return integrations.filter((item) => {
      const matchesCategory =
        activeCategory === 'ALL' || item.category === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [integrations, activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252D2A]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="w-full max-w-4xl rounded-2xl border border-[#E4DED4] bg-white p-6 shadow-2xl my-8 overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4DED4] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#205743] text-white shadow-2xs">
                  <Plug className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#252D2A]">
                      Enterprise Integrations Hub
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#205743]/10 border border-[#205743]/20 px-2 py-0.5 text-[10px] font-bold text-[#205743]">
                      <ShieldCheck className="w-3 h-3" /> Live Status
                    </span>
                  </div>
                  <p className="text-xs text-[#5F6863] mt-0.5">
                    Workspace:{' '}
                    <span className="font-semibold text-[#252D2A]">
                      {workspaceData?.workspace?.name || 'Current Workspace'}
                    </span>{' '}
                    • Real-time backend verification with developer console guides
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-8 gap-1.5 text-xs border-[#E4DED4] text-[#252D2A] hover:bg-[#F7F5F0]"
                  title="Refresh verified connection statuses"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#5F6863] ${isFetching ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </Button>

                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F5F0] text-[#5F6863] hover:text-[#252D2A] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls Bar: Search & Category Tabs */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      activeCategory === cat
                        ? 'bg-[#205743] text-white shadow-2xs'
                        : 'bg-[#F7F5F0] text-[#5F6863] hover:text-[#252D2A] hover:bg-[#E4DED4]/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#5F6863]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter integrations..."
                  className="w-full rounded-lg border border-[#E4DED4] bg-[#F7F5F0]/50 pl-8 pr-3 py-1.5 text-xs text-[#252D2A] placeholder-[#5F6863] focus:border-[#205743] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="mt-4 max-h-[460px] overflow-y-auto pr-1">
              {isLoading ? (
                // Loading Skeleton State
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/60 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#E4DED4]/60" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-1/3 rounded bg-[#E4DED4]" />
                          <div className="h-2 w-1/4 rounded bg-[#E4DED4]/70" />
                        </div>
                        <div className="h-4 w-16 rounded bg-[#E4DED4]/60" />
                      </div>
                      <div className="h-2 w-3/4 rounded bg-[#E4DED4]/50" />
                      <div className="h-8 rounded bg-[#E4DED4]/40" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                // Error State
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
                  <h4 className="mt-2 text-sm font-bold text-rose-900">
                    Failed to Load Integrations Status
                  </h4>
                  <p className="mt-1 text-xs text-rose-700">
                    {error instanceof Error ? error.message : 'Backend connection error'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="mt-4 text-xs border-rose-300 text-rose-900 hover:bg-rose-100"
                  >
                    Retry Verification
                  </Button>
                </div>
              ) : filteredIntegrations.length === 0 ? (
                // Empty search results
                <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/40 p-8 text-center">
                  <SlidersHorizontal className="mx-auto h-7 w-7 text-[#5F6863]" />
                  <h4 className="mt-2 text-xs font-bold text-[#252D2A]">
                    No Integrations Found
                  </h4>
                  <p className="mt-1 text-xs text-[#5F6863]">
                    No enterprise connectors matched your filter or search query.
                  </p>
                  <button
                    onClick={() => {
                      setActiveCategory('ALL');
                      setSearchQuery('');
                    }}
                    className="mt-3 text-xs font-semibold text-[#205743] hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                // Integrations Grid
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredIntegrations.map((item) => {
                    const isConnected = item.status === 'CONNECTED' && item.isVerified;
                    const isSetupRequired = item.status === 'SETUP_REQUIRED';

                    return (
                      <div
                        key={item.id}
                        className="group flex flex-col justify-between rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/30 p-4 transition-all hover:border-[#205743]/50 hover:bg-white hover:shadow-sm"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl shadow-2xs border border-[#E4DED4]">
                                {item.icon}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#252D2A]">
                                  {item.name}
                                </h4>
                                <span className="text-[10px] text-[#5F6863]">
                                  {item.category}
                                </span>
                              </div>
                            </div>

                            {/* Accurate Status Pill */}
                            {item.id === 'google-calendar' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Coming Soon
                              </span>
                            ) : isConnected ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Connected
                              </span>
                            ) : isSetupRequired ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Setup Required
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                Not Connected
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="mt-2 text-[11px] text-[#5F6863] leading-relaxed line-clamp-2">
                            {item.desc}
                          </p>

                          {/* Detail summary line */}
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#252D2A]/80 font-medium">
                            {item.id === 'google-calendar' ? (
                              <span className="text-[#5F6863]">
                                Not configured • Coming Soon
                              </span>
                            ) : isConnected && item.id === 'github' ? (
                              <span className="text-emerald-700 font-semibold">
                                ✓ {item.connectedItems?.length || 0} repository linked
                              </span>
                            ) : !isConnected ? (
                              <span className="text-[#5F6863]">
                                {item.serverConfigured
                                  ? 'Credentials on server'
                                  : 'Setup required'}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Card Action Controls */}
                        <div className="mt-4 pt-3 border-t border-[#E4DED4]/60 flex items-center justify-between">
                          <span className="text-[10px] text-[#5F6863]">
                            {item.id === 'github'
                              ? 'Database Ingest'
                              : item.id === 'google-calendar'
                              ? 'OAuth 2.0 (Postponed)'
                              : 'OAuth 2.0'}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIntegration(item)}
                            className={`h-7 px-2.5 text-xs gap-1 font-semibold ${
                              item.id === 'google-calendar'
                                ? 'border-[#E4DED4] text-[#5F6863] hover:text-[#252D2A] hover:bg-[#F7F5F0]'
                                : isConnected
                                ? 'border-[#E4DED4] text-[#205743] hover:bg-[#F7F5F0]'
                                : 'bg-[#205743] hover:bg-[#163E32] text-white'
                            }`}
                          >
                            <span>
                              {item.id === 'google-calendar'
                                ? 'Coming Soon'
                                : isConnected
                                ? 'Manage'
                                : item.id === 'github'
                                ? 'Connect'
                                : 'Setup Guide'}
                            </span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#E4DED4] pt-4">
              <div className="text-[11px] text-[#5F6863] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#205743]" />
                <span>
                  No placeholder statuses: Only verified connections show &ldquo;Connected&rdquo;.
                </span>
              </div>

              <Button
                variant="outline"
                onClick={onClose}
                className="text-xs border-[#E4DED4] text-[#252D2A] hover:bg-[#F7F5F0]"
              >
                Close Hub
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Setup Guide & Verification Modal */}
      <IntegrationSetupModal
        integration={selectedIntegration}
        workspaceId={effectiveWorkspaceId}
        workspaceName={workspaceData?.workspace?.name}
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        onRefreshList={() => refetch()}
      />
    </>
  );
}
