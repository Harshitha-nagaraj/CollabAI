'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  ShieldCheck,
  FolderGit2,
  ArrowRight,
  Info,
  Calendar,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  WorkspaceIntegration,
  useVerifyIntegration,
  VerificationResult,
} from '@/lib/queries/integrations';
import { useConnectRepository } from '@/lib/queries/github';
import Link from 'next/link';

interface Props {
  integration: WorkspaceIntegration | null;
  workspaceId: string | null;
  workspaceName?: string;
  isOpen: boolean;
  onClose: () => void;
  onRefreshList?: () => void;
}

export function IntegrationSetupModal({
  integration,
  workspaceId,
  workspaceName,
  isOpen,
  onClose,
  onRefreshList,
}: Props) {
  const { toast } = useToast();
  const verifyMutation = useVerifyIntegration();
  const connectRepoMutation = useConnectRepository();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastVerification, setLastVerification] = useState<VerificationResult | null>(null);
  const [repoInput, setRepoInput] = useState('');
  const [isLinkingRepo, setIsLinkingRepo] = useState(false);

  if (!isOpen || !integration) return null;

  const isGitHub = integration.id === 'github';
  const isGoogleCalendar = integration.id === 'google-calendar';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast(`Copied ${key} to clipboard!`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunVerification = async () => {
    if (!workspaceId) {
      toast('Please select an active workspace first.', 'error');
      return;
    }

    try {
      toast(`Verifying ${integration.name} connection...`, 'info');
      const result = await verifyMutation.mutateAsync({
        providerId: integration.id,
        workspaceId,
      });
      setLastVerification(result);

      if (result.isVerified) {
        toast(`Connection verified: ${result.message}`, 'success');
      } else if (result.status === 'SETUP_REQUIRED') {
        toast(result.message, 'info');
      } else {
        toast(result.message, 'info');
      }

      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      toast(err.message || 'Verification check failed', 'error');
    }
  };

  const handleQuickConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    const trimmed = repoInput.trim();
    if (!trimmed) {
      toast('Please enter a repository in "owner/repo" format', 'error');
      return;
    }

    const parts = trimmed.split('/');
    const owner = parts[0] || 'collabai';
    const name = parts[1] || trimmed;

    setIsLinkingRepo(true);
    try {
      await connectRepoMutation.mutateAsync({
        name,
        owner,
        fullName: `${owner}/${name}`,
        url: `https://github.com/${owner}/${name}`,
        workspaceId,
      });
      toast(`Successfully connected repository "${owner}/${name}"!`, 'success');
      setRepoInput('');
      if (onRefreshList) onRefreshList();
      handleRunVerification();
    } catch (err: any) {
      toast(err.message || 'Failed to connect repository', 'error');
    } finally {
      setIsLinkingRepo(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252D2A]/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-2xl rounded-2xl border border-[#E4DED4] bg-white p-6 shadow-2xl my-8 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E4DED4] pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F0] text-2xl border border-[#E4DED4] shadow-2xs">
                {integration.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#252D2A]">{integration.name}</h3>
                  <span className="rounded-md bg-[#F7F5F0] border border-[#E4DED4] px-2 py-0.5 text-[10px] font-semibold text-[#5F6863]">
                    {integration.category}
                  </span>
                </div>
                <p className="text-xs text-[#5F6863] mt-0.5">
                  Workspace:{' '}
                  <span className="font-semibold text-[#252D2A]">
                    {workspaceName || 'Active Workspace'}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F5F0] text-[#5F6863] hover:text-[#252D2A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1 space-y-5">
            {isGoogleCalendar ? (
              /* Google Calendar Postponed / Coming Soon View */
              <div className="space-y-4">
                {/* Paused Feature Notice Banner */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 text-amber-900">
                  <div className="mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Coming Soon • Not Configured
                      </span>
                      <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Integration Postponed
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900">
                      Google Calendar OAuth integration is currently postponed while external account setup is on hold. Connect controls, OAuth credentials, and calendar synchronization have been disabled.
                    </p>
                  </div>
                </div>

                {/* Preserved Native Meeting Features Card */}
                <div className="rounded-xl border border-[#E4DED4] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#205743]" />
                    <h4 className="text-xs font-bold text-[#252D2A] uppercase tracking-wider">
                      Preserved CollabAI Native Meeting Capabilities
                    </h4>
                  </div>
                  <p className="text-xs text-[#5F6863] leading-relaxed">
                    Meeting management does not depend on Google Calendar. All native collaboration features remain fully operational:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 pt-1 text-xs">
                    <div className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3 space-y-1">
                      <span className="font-semibold text-[#252D2A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Meeting Records & Times
                      </span>
                      <p className="text-[11px] text-[#5F6863]">
                        Schedules, durations, and timezone validation stored in PostgreSQL.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3 space-y-1">
                      <span className="font-semibold text-[#252D2A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Confirmed Attendance
                      </span>
                      <p className="text-[11px] text-[#5F6863]">
                        Join & leave attendance tracking preserved per workspace member.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3 space-y-1">
                      <span className="font-semibold text-[#252D2A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Live Meeting Room & Notes
                      </span>
                      <p className="text-[11px] text-[#5F6863]">
                        Collaborative markdown notes and agenda discussions saved persistently.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3 space-y-1">
                      <span className="font-semibold text-[#252D2A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        AI Meeting Intelligence
                      </span>
                      <p className="text-[11px] text-[#5F6863]">
                        Action item extraction, sprint planning, and decision logs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Architecture Transparency Note */}
                <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0] p-3 text-[11px] text-[#5F6863] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#205743] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#252D2A]">Transparency Note:</span>{' '}
                    Two-way Google Calendar synchronization will be enabled once external Google Cloud account verification is complete. No external sync claims are made while integration is paused.
                  </div>
                </div>
              </div>
            ) : (
              /* All Other Providers (GitHub, Slack, Zoom, Meet, Teams, Outlook) */
              <>
                {/* Real Connection Status Banner */}
                <div
                  className={`rounded-xl border p-4 flex items-start gap-3 ${
                    integration.status === 'CONNECTED'
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                      : integration.status === 'SETUP_REQUIRED'
                      ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                      : 'border-[#E4DED4] bg-[#F7F5F0] text-[#252D2A]'
                  }`}
                >
                  <div className="mt-0.5">
                    {integration.status === 'CONNECTED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : integration.status === 'SETUP_REQUIRED' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Info className="w-5 h-5 text-[#5F6863]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {integration.status === 'CONNECTED'
                          ? 'Verified & Connected'
                          : integration.status === 'SETUP_REQUIRED'
                          ? 'Setup Required (Missing Credentials)'
                          : 'Not Connected'}
                      </span>
                      <span className="text-[11px] font-mono opacity-80">
                        {isGitHub
                          ? 'Phase 1 Database Ingest'
                          : 'Phase 1 Ready'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                      {integration.summary}
                    </p>
                  </div>
                </div>

                {/* GitHub Specific Connected Repos & Direct Connect */}
                {isGitHub && (
                  <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/40 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-[#205743]" />
                        <h4 className="text-xs font-bold text-[#252D2A]">
                          Connected Repositories ({integration.connectedItems?.length || 0})
                        </h4>
                      </div>
                      <Link
                        href="/dashboard/github"
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#205743] hover:underline"
                      >
                        Open Full GitHub Hub <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {integration.connectedItems && integration.connectedItems.length > 0 ? (
                      <div className="divide-y divide-[#E4DED4] rounded-lg border border-[#E4DED4] bg-white">
                        {integration.connectedItems.map((repo) => (
                          <div key={repo.id} className="flex items-center justify-between p-3 text-xs">
                            <div>
                              <span className="font-semibold text-[#252D2A]">{repo.name}</span>
                              {repo.url && (
                                <a
                                  href={repo.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[11px] text-[#5F6863] hover:underline"
                                >
                                  {repo.url}
                                </a>
                              )}
                            </div>
                            <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#5F6863]">
                        No GitHub repositories linked to this workspace yet. Link one below to activate the integration.
                      </p>
                    )}

                    {/* Inline Quick Link Repo Form */}
                    <form onSubmit={handleQuickConnectGitHub} className="flex gap-2">
                      <input
                        type="text"
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        placeholder="e.g. collabai/api or facebook/react"
                        className="flex-1 rounded-lg border border-[#E4DED4] bg-white px-3 py-1.5 text-xs text-[#252D2A] focus:border-[#205743] focus:outline-hidden"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isLinkingRepo || !repoInput.trim()}
                        className="text-xs"
                      >
                        {isLinkingRepo ? 'Linking...' : 'Link Repository'}
                      </Button>
                    </form>
                  </div>
                )}

                {/* Server Configuration & Environment Check */}
                {!isGitHub && (
                  <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0]/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#205743]" />
                        <h4 className="text-xs font-bold text-[#252D2A]">
                          Backend Environment Variables Check
                        </h4>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          integration.serverConfigured
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {integration.serverConfigured ? 'Configured in .env' : 'Missing in .env'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {integration.setupGuide.environmentVariables.map((envVar) => (
                        <div
                          key={envVar.key}
                          className="flex items-center justify-between rounded-lg border border-[#E4DED4] bg-white p-2.5 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono font-bold text-[#205743] text-[11px]">
                                {envVar.key}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy(envVar.key, envVar.key)}
                                className="text-[#5F6863] hover:text-[#252D2A]"
                                title="Copy Variable Name"
                              >
                                {copiedKey === envVar.key ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <p className="text-[11px] text-[#5F6863] mt-0.5">{envVar.description}</p>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              envVar.isSet ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {envVar.isSet ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" /> Not Set
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beginner-Friendly Setup Instructions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#252D2A]">
                      Step-by-Step Developer Console Setup
                    </h4>
                    {integration.setupGuide.consoleUrl && (
                      <a
                        href={integration.setupGuide.consoleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#205743] hover:underline"
                      >
                        Open {integration.setupGuide.consoleName} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E4DED4] bg-white p-4 space-y-3">
                    <ol className="list-decimal pl-4 space-y-2 text-xs text-[#252D2A] leading-relaxed">
                      {integration.setupGuide.steps.map((step, idx) => (
                        <li key={idx} className="pl-1">
                          {step}
                        </li>
                      ))}
                    </ol>

                    {/* Important Redirect URI Snippet */}
                    {integration.setupGuide.redirectUri && (
                      <div className="mt-3 rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#5F6863] mb-1">
                          <span>Authorized OAuth Redirect URI:</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(integration.setupGuide.redirectUri, 'Redirect URI')
                            }
                            className="inline-flex items-center gap-1 text-[#205743] hover:underline"
                          >
                            {copiedKey === 'Redirect URI' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy URI
                              </>
                            )}
                          </button>
                        </div>
                        <code className="block font-mono text-xs text-[#252D2A] bg-white p-2 rounded border border-[#E4DED4] overflow-x-auto select-all">
                          {integration.setupGuide.redirectUri}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Diagnostic Verification Test Box */}
                <div className="rounded-xl border border-[#E4DED4] bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#252D2A]">
                        Test Server Configuration & Diagnostics
                      </h4>
                      <p className="text-[11px] text-[#5F6863]">
                        Runs live verification against CollabAI backend without mock data.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunVerification}
                      disabled={verifyMutation.isPending}
                      className="gap-1.5 text-xs border-[#E4DED4] hover:bg-[#F7F5F0]"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${verifyMutation.isPending ? 'animate-spin' : ''}`}
                      />
                      {verifyMutation.isPending ? 'Testing...' : 'Run Diagnostics'}
                    </Button>
                  </div>

                  {lastVerification && (
                    <div
                      className={`rounded-lg p-3 text-xs border ${
                        lastVerification.isVerified
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : lastVerification.status === 'SETUP_REQUIRED'
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-rose-200 bg-rose-50 text-rose-900'
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        {lastVerification.isVerified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        {lastVerification.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed">{lastVerification.message}</p>
                    </div>
                  )}
                </div>

                {/* Architecture Transparency Note */}
                <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0] p-3 text-[11px] text-[#5F6863] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#205743] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#252D2A]">Security Guarantee:</span>{' '}
                    {integration.setupGuide.phaseNote}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Controls */}
          <div className="mt-6 flex justify-between items-center border-t border-[#E4DED4] pt-4">
            <span className="text-[11px] text-[#5F6863]">
              Provider ID: <code className="font-mono text-[#252D2A]">{integration.id}</code>
            </span>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-xs border-[#E4DED4] text-[#252D2A] hover:bg-[#F7F5F0]"
            >
              {isGoogleCalendar ? 'Close Notice' : 'Close Setup Guide'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
