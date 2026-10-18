'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { WorkspaceMembersManagement } from '@/components/workspace-members-management';
import { Settings, Bot, GitBranch, AlertCircle, Save } from 'lucide-react';

export default function SettingsPage() {
  const { selectedWorkspaceId } = useAppStore();
  const { toast } = useToast();

  const [aiAutoAssign, setAiAutoAssign] = useState(true);
  const [delayAlertThreshold, setDelayAlertThreshold] = useState('75');
  const [githubSync, setGithubSync] = useState(true);

  const handleSaveSettings = () => {
    toast('Workspace & AI Settings saved successfully!', 'success');
  };

  return (
    <div className="mx-auto max-w-5xl py-4 space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2DCD2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#1F4D3A] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Workspace Configuration
            </span>
            <span className="text-xs text-[#525B56]">Member Access, AI Automation & Integrations</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2421] mt-1">
            Workspace & Team Settings
          </h1>
        </div>
      </div>

      {/* Workspace Check */}
      {!selectedWorkspaceId ? (
        <div className="rounded-xl border border-[#E2DCD2] bg-white p-8 text-center space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-[#C89B3C]" />
          <h3 className="text-sm font-bold text-[#1C2421]">No Workspace Selected</h3>
          <p className="text-xs text-[#525B56]">Please select a workspace from the sidebar selector to manage member access and settings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspace Members Management Section */}
          <WorkspaceMembersManagement workspaceId={selectedWorkspaceId} />

          {/* AI & Automation Settings */}
          <div className="rounded-2xl border border-[#E2DCD2] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2DCD2] pb-3">
              <Bot className="h-4 w-4 text-[#1F4D3A]" />
              <h3 className="text-sm font-bold text-[#1C2421]">AI Intelligence & Workload Settings</h3>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-[#E2DCD2]/60">
              <div>
                <p className="font-semibold text-[#1C2421]">Automatic Task Workload Balancing</p>
                <p className="text-[#525B56]">Use AI to re-balance task assignments when engineers exceed 100% capacity.</p>
              </div>
              <input
                type="checkbox"
                checked={aiAutoAssign}
                onChange={(e) => setAiAutoAssign(e.target.checked)}
                className="h-4 w-4 accent-[#1F4D3A] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs py-2">
              <div>
                <p className="font-semibold text-[#1C2421]">Delay Prediction Alert Confidence Threshold</p>
                <p className="text-[#525B56]">Trigger workspace warnings when AI delay probability exceeds threshold.</p>
              </div>
              <select
                value={delayAlertThreshold}
                onChange={(e) => setDelayAlertThreshold(e.target.value)}
                className="rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold text-[#1C2421] focus:border-[#1F4D3A] focus:outline-none"
              >
                <option value="50">50% Confidence</option>
                <option value="75">75% Confidence (Default)</option>
                <option value="90">90% Strict Confidence</option>
              </select>
            </div>
          </div>

          {/* GitHub & VCS Integration Settings */}
          <div className="rounded-2xl border border-[#E2DCD2] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2DCD2] pb-3">
              <GitBranch className="h-4 w-4 text-[#1F4D3A]" />
              <h3 className="text-sm font-bold text-[#1C2421]">GitHub Sync & Webhook Integrations</h3>
            </div>

            <div className="flex items-center justify-between text-xs py-2">
              <div>
                <p className="font-semibold text-[#1C2421]">Automated PR Commit Linking</p>
                <p className="text-[#525B56]">Automatically link PR merges to open backlog tasks and update completion status.</p>
              </div>
              <input
                type="checkbox"
                checked={githubSync}
                onChange={(e) => setGithubSync(e.target.checked)}
                className="h-4 w-4 accent-[#1F4D3A] cursor-pointer"
              />
            </div>
          </div>

          {/* Save Controls */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveSettings}
              className="bg-[#1F4D3A] text-xs font-semibold text-white hover:bg-[#163E32] gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

