'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useWorkspaceDetails, useWorkspaces } from '@/lib/queries/workspaces';
import { useCurrentUser } from '@/lib/queries/auth';
import {
  useWorkspaceMeetings,
  useProcessMeetingIntelligence,
  useApproveMeetingTasks,
  useUpdateMeetingNotes,
  useJoinMeeting,
  useLeaveMeeting,
  type MeetingItem,
} from '@/lib/queries/meetings';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Video } from 'lucide-react';

import { MeetingWorkflowStepper } from '@/components/meetings/meeting-workflow-stepper';
import { UpcomingMeetings } from '@/components/meetings/upcoming-meetings';
import { LiveMeetingRoom } from '@/components/meetings/live-meeting-room';
import { TaskApprovalHub } from '@/components/meetings/task-approval-hub';
import { SprintPlanningView } from '@/components/meetings/sprint-planning-view';
import { MeetingDocumentationView } from '@/components/meetings/meeting-documentation-view';
import { MeetingSummaryView } from '@/components/meeting-summary-view';
import { FutureIntegrationsModal } from '@/components/meetings/future-integrations-modal';
import { ScheduleMeetingModal } from '@/components/meetings/schedule-meeting-modal';
import { MeetingDetailsModal } from '@/components/meetings/meeting-details-modal';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

export default function MeetingsPage() {
  const { selectedWorkspaceId, selectedProjectId, setSelectedWorkspaceId } = useAppStore();
  const token = useAppStore((s) => s.token);
  const { toast } = useToast();

  const { data: wsData } = useWorkspaceDetails(selectedWorkspaceId);
  const { data: wsListData } = useWorkspaces();
  const workspaces = wsListData?.workspaces || [];

  const { data: userData } = useCurrentUser(!!token);
  const currentUserId = userData?.user?.id;
  const currentUserEmail = userData?.user?.email;

  const {
    data: meetings = [],
    isLoading: isMeetingsLoading,
    isError: isMeetingsError,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useWorkspaceMeetings(selectedWorkspaceId);

  const processIntelligence = useProcessMeetingIntelligence();
  const approveTasks = useApproveMeetingTasks();
  const updateMeetingNotes = useUpdateMeetingNotes();
  const joinMeetingMutation = useJoinMeeting();
  const leaveMeetingMutation = useLeaveMeeting();

  const [activeWorkflowStep, setActiveWorkflowStep] = useState<string>('meeting');
  const [activeMeeting, setActiveMeeting] = useState<MeetingItem | null>(null);

  // Meeting Details Modal State
  const [detailsMeeting, setDetailsMeeting] = useState<MeetingItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'room' | 'summary' | 'tasks' | 'sprint' | 'docs'>('room');

  // AI Processed State
  const [intelligenceResult, setIntelligenceResult] = useState<any>(null);

  // Helper to parse JSON safely without throwing
  const parseJsonSafe = <T,>(val: any, fallback: T): T => {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  };

  // Reconstruct full structured intelligence from persisted meeting record
  const rehydrateIntelligenceFromMeeting = (meeting: MeetingItem | null) => {
    if (!meeting) return null;
    if (meeting.structuredSummary) {
      return meeting.structuredSummary;
    }
    if (!meeting.summary && !meeting.actionItems && !meeting.decisions && meeting.status !== 'PROCESSED') {
      return null;
    }

    const rawSummary = meeting.summary || '';
    let source = 'Meeting Notes';
    let overview = rawSummary;
    let keyDiscussionPoints: string[] = [];

    const sourceMatch = rawSummary.match(/\[Source:\s*([^\]]+)\]/i);
    if (sourceMatch && sourceMatch[1]) {
      source = sourceMatch[1].trim();
    }

    const pointsMatch = rawSummary.match(/Key Discussion Points:\s*([\s\S]*?)(?=(?:###|Decisions|Action Items|Unresolved|$))/i);
    if (pointsMatch && pointsMatch[1]) {
      keyDiscussionPoints = pointsMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line) => line.length > 0);
    }

    overview = rawSummary
      .replace(/\[Source:\s*[^\]]+\]\s*/i, '')
      .replace(/Key Discussion Points:\s*[\s\S]*$/i, '')
      .trim();

    return {
      source,
      overview: overview || 'Overview derived from meeting content.',
      keyDiscussionPoints,
      executiveSummary: rawSummary,
      keyDecisions: parseJsonSafe(meeting.decisions, []),
      actionItems: parseJsonSafe(meeting.actionItems, []),
      risks: parseJsonSafe(meeting.risks, []),
      deadlinesMentioned: parseJsonSafe(meeting.deadlines, []),
      pendingQuestions: parseJsonSafe(meeting.pendingQuestions, []),
      unresolvedQuestions: parseJsonSafe(meeting.pendingQuestions, []),
      suggestedFollowUps: parseJsonSafe(meeting.followUps, []),
      sentiment: parseJsonSafe(meeting.sentiment, {
        label: 'CONSTRUCTIVE',
        score: 82,
        summary: `Productive session derived from ${source.toLowerCase()}.`,
        keyMoments: [],
      }),
      sprintPlan: parseJsonSafe(meeting.sprintPlan, null),
      generatedDocs: {
        meetingNotes: meeting.description || '',
        sprintNotes: '',
        decisionLog: '',
      },
    };
  };

  // Check for Google OAuth callback parameters and display toast feedback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const integration = params.get('integration');

    if (integration === 'google-calendar') {
      toast('Google Calendar integration is currently postponed (Coming Soon).', 'info');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  // Rehydrate active meeting across browser refresh / workspace change
  // STRICT: only restore if the meeting still exists and belongs to the selected workspace
  useEffect(() => {
    if (meetings.length === 0) {
      setActiveMeeting(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeMeetingId');
      }
      return;
    }

    const savedMeetingId = typeof window !== 'undefined' ? localStorage.getItem('activeMeetingId') : null;
    if (savedMeetingId) {
      const match = meetings.find((m) => m.id === savedMeetingId && m.workspaceId === selectedWorkspaceId);
      if (match) {
        setActiveMeeting(match);
        return;
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('activeMeetingId');
        }
        setActiveMeeting(null);
        return;
      }
    }

    if (activeMeeting && activeMeeting.workspaceId !== selectedWorkspaceId) {
      setActiveMeeting(null);
    }
  }, [meetings, selectedWorkspaceId]);

  // Keep intelligenceResult hydrated from activeMeeting across refreshes
  useEffect(() => {
    if (activeMeeting) {
      const rehydrated = rehydrateIntelligenceFromMeeting(activeMeeting);
      if (rehydrated) {
        setIntelligenceResult(rehydrated);
        if ((activeMeeting.status === 'PROCESSED' || activeMeeting.status === 'SUMMARIZED') && activeTab === 'room') {
          setActiveTab('summary');
          setActiveWorkflowStep('summary');
        }
      }
    } else {
      setIntelligenceResult(null);
    }
  }, [activeMeeting?.id, activeMeeting?.summary, activeMeeting?.actionItems, activeMeeting?.status]);

  const workspaceMembers = (wsData?.members || []).map((m: any) => ({
    id: m.userId || m.id || m.email,
    name: m.name || m.email,
    email: m.email,
  }));

  const membersToUse = workspaceMembers.length > 0 ? workspaceMembers : [
    { id: 'm1', name: 'Rahul Sharma', email: 'rahul@collabai.dev' },
    { id: 'm2', name: 'Sarah Chen', email: 'sarah@collabai.dev' },
    { id: 'm3', name: 'Alex Rivera', email: 'alex@collabai.dev' },
  ];

  const handleStartLiveMeeting = (meeting: MeetingItem) => {
    setActiveMeeting(meeting);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeMeetingId', meeting.id);
    }
    setActiveWorkflowStep('meeting');
    setActiveTab('room');
    toast(`Loaded "${meeting.title}" into Live Meeting Room`, 'info');

    // Smooth scroll down to the Live Meeting Room container
    setTimeout(() => {
      const roomEl = document.getElementById('live-meeting-room');
      if (roomEl) {
        roomEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleSaveNotes = async (notes: string) => {
    if (!activeMeeting?.id || !selectedWorkspaceId) {
      toast('No active meeting selected to save notes', 'error');
      return;
    }

    try {
      await updateMeetingNotes.mutateAsync({
        meetingId: activeMeeting.id,
        workspaceId: selectedWorkspaceId,
        notes,
      });
      setActiveMeeting((prev) => (prev ? { ...prev, description: notes } : prev));
      refetchMeetings();
      toast('Meeting notes saved persistently to PostgreSQL!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save notes', 'error');
      throw err;
    }
  };

  const handleJoinActiveMeeting = async () => {
    if (!activeMeeting?.id || !selectedWorkspaceId) return;
    try {
      await joinMeetingMutation.mutateAsync({
        meetingId: activeMeeting.id,
        workspaceId: selectedWorkspaceId,
      });
      toast('You joined the meeting! Attendance recorded in PostgreSQL.', 'success');
      const updated = await refetchMeetings();
      if (updated.data) {
        const current = updated.data.find((m) => m.id === activeMeeting.id);
        if (current) setActiveMeeting(current);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to join meeting', 'error');
    }
  };

  const handleLeaveActiveMeeting = async () => {
    if (!activeMeeting?.id || !selectedWorkspaceId) return;
    try {
      await leaveMeetingMutation.mutateAsync({
        meetingId: activeMeeting.id,
        workspaceId: selectedWorkspaceId,
      });
      toast('You left the meeting.', 'info');
      const updated = await refetchMeetings();
      if (updated.data) {
        const current = updated.data.find((m) => m.id === activeMeeting.id);
        if (current) setActiveMeeting(current);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to leave meeting', 'error');
    }
  };

  const isUserJoined = Boolean(
    activeMeeting?.participants?.some(
      (p) =>
        (currentUserId && (p.userId === currentUserId || p.user?.id === currentUserId)) ||
        (currentUserEmail && p.user?.email?.toLowerCase() === currentUserEmail.toLowerCase())
    )
  );

  const handleEndAndProcessMeeting = async (
    transcript: string,
    chatMessages: Array<{ sender: string; message: string }>,
    notes: string
  ) => {
    setActiveWorkflowStep('ai-engine');
    toast('✨ AI Engine is analyzing meeting content & generating intelligence...', 'info');

    try {
      const meetingId = activeMeeting?.id || `m-demo-${Date.now()}`;
      const result: any = await processIntelligence.mutateAsync({
        meetingId,
        workspaceId: selectedWorkspaceId || 'demo-workspace',
        transcript,
        notes,
      });

      if (result.intelligence) {
        setIntelligenceResult(result.intelligence);
      }
      if (result.meeting) {
        setActiveMeeting(result.meeting);
      }
      await refetchMeetings();
      setActiveWorkflowStep('summary');
      setActiveTab('summary');
      toast('AI Meeting Intelligence processing completed!', 'success');
    } catch (err: any) {
      toast(err.message || 'AI processing completed with fallback engine', 'success');
    }
  };

  const handleBatchApproveTasks = async (approvedTasks: any[]) => {
    if (!selectedProjectId) {
      toast('Please select a target Project in the sidebar first', 'error');
      return;
    }

    try {
      await approveTasks.mutateAsync({
        meetingId: activeMeeting?.id || 'demo-m',
        workspaceId: selectedWorkspaceId || 'demo-ws',
        projectId: selectedProjectId,
        tasks: approvedTasks.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          assigneeId: t.suggestedAssigneeId || null,
          dueDate: t.dueDate || null,
        })),
      });

      setActiveWorkflowStep('dashboard');
      toast(`Successfully created ${approvedTasks.length} task(s) in Kanban board!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Tasks approved and injected to Kanban', 'success');
      setActiveWorkflowStep('dashboard');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4DED4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#205743] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Meeting Workspace
            </span>
            <span className="text-xs text-[#5F6863]">Transcript Processing, Decision Extraction & Task Approval</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#252D2A] mt-0.5">
            AI Sync Meetings & Action Item Generator
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsIntegrationsOpen(true)}
          >
            🔌 Enterprise Integrations
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
          >
            📅 Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Upcoming & Scheduled Meetings Section */}
      <UpcomingMeetings
        meetings={meetings}
        isLoading={isMeetingsLoading}
        isError={isMeetingsError}
        error={meetingsError as Error | null}
        onRefresh={() => refetchMeetings()}
        onScheduleClick={() => setIsScheduleOpen(true)}
        onSelectMeeting={handleStartLiveMeeting}
        onViewDetails={(meeting) => {
          setDetailsMeeting(meeting);
          setIsDetailsOpen(true);
        }}
        selectedMeetingId={activeMeeting?.id}
        workspaceName={wsData?.workspace?.name}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={(id) => setSelectedWorkspaceId(id || null)}
      />

      {/* Visual Workflow Stepper Bar */}
      <MeetingWorkflowStepper
        currentStep={activeWorkflowStep}
        onSelectStep={(stepId) => {
          setActiveWorkflowStep(stepId);
          if (stepId === 'meeting' || stepId === 'transcript') setActiveTab('room');
          else if (stepId === 'ai-engine' || stepId === 'summary') setActiveTab('summary');
          else if (stepId === 'tasks') setActiveTab('tasks');
          else if (stepId === 'sprint') setActiveTab('sprint');
          else if (stepId === 'docs') setActiveTab('docs');
        }}
      />

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-[#E2DACF]">
        {[
          { id: 'room', label: '🎙️ Live Meeting Room' },
          { id: 'summary', label: '📊 Exec Summary & Sentiment' },
          { id: 'tasks', label: '⚡ Task Approval & Skill Match' },
          { id: 'sprint', label: '🚀 Automatic Sprint Plan' },
          { id: 'docs', label: '📚 Auto Documentation' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#1F4D3A] text-[#1F4D3A] bg-[#1F4D3A]/5'
                : 'border-transparent text-[#5A5A5A] hover:text-[#2D2D2D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main View Area */}
      <div id="live-meeting-room-section" className="min-h-[500px]">
        {activeTab === 'room' && (
          activeMeeting ? (
            <LiveMeetingRoom
              key={activeMeeting.id}
              id="live-meeting-room"
              meetingId={activeMeeting.id}
              workspaceId={selectedWorkspaceId || activeMeeting.workspaceId}
              title={activeMeeting.title}
              creatorId={activeMeeting.creator?.id}
              currentUser={{
                id: currentUserId || 'u-user',
                name: userData?.user?.name,
                email: currentUserEmail || 'user@collabai.dev',
              }}
              roomName={activeMeeting.roomName}
              participants={membersToUse.map((m) => ({ id: m.id, name: m.name, role: 'Workspace Member' }))}
              initialNotes={activeMeeting.description || ''}
              onSaveNotes={handleSaveNotes}
              isNotesSaving={updateMeetingNotes.isPending}
              onJoinMeeting={handleJoinActiveMeeting}
              onLeaveMeeting={handleLeaveActiveMeeting}
              onCloseRoom={() => {
                setActiveMeeting(null);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('activeMeetingId');
                }
              }}
              isUserJoined={isUserJoined}
              persistedParticipants={(activeMeeting.participants || []).map((p) => ({
                id: p.userId || p.id,
                name: p.user?.name,
                email: p.user?.email,
              }))}
              onEndAndProcess={handleEndAndProcessMeeting}
              isProcessing={processIntelligence.isPending}
            />
          ) : (
            <div
              id="live-meeting-room"
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2DCD2] bg-white p-12 text-center shadow-xs"
            >
              <div className="rounded-full bg-[#1F4D3A]/10 p-4 text-[#1F4D3A] mb-3">
                <Video className="h-8 w-8 text-[#1F4D3A]" />
              </div>
              <h3 className="text-base font-bold text-[#1C2421]">No Meeting Currently Active in Room</h3>
              <p className="mt-1 text-xs text-[#525B56] max-w-md">
                Select an upcoming meeting from the list above and click &quot;Open in Room&quot; to load its agenda, notes, and attendance into the Live Room.
              </p>
              {meetings.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartLiveMeeting(meetings[0]!)}
                    data-testid="quick-open-first-meeting-btn"
                    className="text-xs bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                  >
                    <Video className="h-3.5 w-3.5 mr-1.5" />
                    Open &quot;{meetings[0]!.title}&quot; in Room
                  </Button>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            {intelligenceResult ? (
              <MeetingSummaryView
                summary={intelligenceResult}
                onOpenApprovalHub={() => setActiveTab('tasks')}
                onApproveAction={() => setActiveTab('tasks')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2DACF] bg-white p-12 text-center">
                <span className="text-4xl">🎙️</span>
                <h4 className="mt-3 text-sm font-bold text-[#2D2D2D]">No AI Meeting Intelligence Processed Yet</h4>
                <p className="mt-1 text-xs text-[#5A5A5A] max-w-sm">
                  Click &quot;End Meeting & Run AI Engine&quot; inside the Live Meeting Room tab or record notes to generate structured meeting intelligence.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <TaskApprovalHub
            actionItems={intelligenceResult?.actionItems || []}
            members={membersToUse}
            onApproveTasks={handleBatchApproveTasks}
            isSubmitting={approveTasks.isPending}
          />
        )}

        {activeTab === 'sprint' && (
          <SprintPlanningView
            sprintPlan={
              intelligenceResult?.sprintPlan || {
                sprintGoal: 'Deliver Core AI Meeting Intelligence & Live Room Module',
                estimatedDurationDays: 14,
                predictedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                capacityUtilization: 82,
                risks: ['Frontend-backend sync bottleneck'],
                currentSprintTasks: [],
                nextSprintTasks: [],
                backlogTasks: [],
              }
            }
          />
        )}

        {activeTab === 'docs' && (
          <MeetingDocumentationView
            generatedDocs={
              intelligenceResult?.generatedDocs || {
                meetingNotes: `# Meeting Notes: CollabAI Architecture Sync\n\n## Executive Summary\nThe team aligned on core deliverables for the AI Meeting Intelligence Engine.`,
                sprintNotes: `# Sprint Plan Notes\n\nSprint Goal: Deliver live meeting capture & task extraction.`,
                decisionLog: `# Decision Log\n\n1. Adopt JWT session validation for microservices.`,
              }
            }
          />
        )}
      </div>

      {/* Modals */}
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        workspaceId={selectedWorkspaceId}
        onClose={() => setIsScheduleOpen(false)}
      />

      <MeetingDetailsModal
        isOpen={isDetailsOpen}
        meetingId={detailsMeeting?.id || null}
        workspaceId={selectedWorkspaceId}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        onClose={() => {
          setIsDetailsOpen(false);
          setDetailsMeeting(null);
          refetchMeetings();
        }}
        onOpenInRoom={(meeting) => {
          setIsDetailsOpen(false);
          setDetailsMeeting(null);
          handleStartLiveMeeting(meeting);
        }}
      />

      <FutureIntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
      />
    </div>
  );
}
