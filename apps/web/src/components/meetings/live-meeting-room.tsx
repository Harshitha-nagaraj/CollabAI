'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Users,
  Save,
  CheckCircle2,
  UserCheck,
  UserMinus,
  Info,
  ShieldCheck,
  PhoneOff,
  PhoneCall,
  Crown,
  AlertTriangle,
  ArrowLeft,
  X,
} from 'lucide-react';
import { JitsiMeetingFrame } from './jitsi-meeting-frame';
import { useMeetingAccess } from '@/lib/queries/meetings';

interface Participant {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

interface CurrentUser {
  id: string;
  name?: string | null;
  email: string;
}

interface Props {
  id?: string;
  meetingId: string;
  workspaceId?: string;
  title: string;
  creatorId?: string;
  currentUser?: CurrentUser;
  roomName?: string;
  participants?: Participant[];
  initialTranscript?: string;
  initialNotes?: string;
  onSaveNotes?: (notes: string) => Promise<void>;
  isNotesSaving?: boolean;
  onJoinMeeting?: () => Promise<void>;
  onLeaveMeeting?: () => Promise<void>;
  onCloseRoom?: () => void;
  isUserJoined?: boolean;
  persistedParticipants?: Array<{ id?: string; name?: string; email?: string }>;
  onEndAndProcess: (finalTranscript: string, chatMessages: Array<{ sender: string; message: string }>, notes: string) => void;
  isProcessing?: boolean;
}

export function LiveMeetingRoom({
  id = 'live-meeting-room',
  meetingId,
  workspaceId,
  title,
  creatorId,
  currentUser,
  roomName: propRoomName,
  participants: initialParticipants = [],
  initialNotes = '',
  onSaveNotes,
  isNotesSaving = false,
  onJoinMeeting,
  onLeaveMeeting,
  onCloseRoom,
  isUserJoined = false,
  persistedParticipants = [],
  onEndAndProcess,
  isProcessing = false,
}: Props) {
  // Query authorized real-time conference metadata from backend
  const { data: accessData } = useMeetingAccess(meetingId, workspaceId || null);

  // Determine host authorization
  const isHost = Boolean(
    (currentUser?.id && creatorId && creatorId === currentUser.id) ||
    accessData?.isHost
  );
  const hostDisplayName = accessData?.hostName || 'Meeting Host';

  // Compute stable collision-resistant room name
  const effectiveRoomName = useMemo(() => {
    if (accessData?.roomName) return accessData.roomName;
    if (propRoomName) return propRoomName;
    const cleanWs = (workspaceId || 'ws').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const cleanMtg = (meetingId || 'mtg').replace(/[^a-zA-Z0-9]/g, '');
    return `collabai_${cleanWs}_${cleanMtg}`;
  }, [accessData?.roomName, propRoomName, workspaceId, meetingId]);

  // Call state: 'connected' | 'left'
  const [callState, setCallState] = useState<'connected' | 'left'>('connected');
  // Host End-Meeting Confirmation Modal state
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'people' | 'transcript'>('notes');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string; timestamp: string }>>([
    { sender: 'System', message: `Live conference room opened for "${title}". All participants enter the same room.`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sharedNotes, setSharedNotes] = useState(initialNotes || '');
  const [customTranscriptInput, setCustomTranscriptInput] = useState('');
  const [notesSaveStatus, setNotesSaveStatus] = useState<string | null>(null);
  const [livePeersCount, setLivePeersCount] = useState<number>(1);

  // Sync initial notes whenever meetingId or initialNotes change
  useEffect(() => {
    setSharedNotes(initialNotes || '');
  }, [meetingId, initialNotes]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      { sender: currentUser?.name || currentUser?.email || 'You', message: chatInput.trim(), timestamp: timeStr },
    ]);
    setChatInput('');
  };

  const handleSaveNotesClick = async () => {
    if (!onSaveNotes) return;
    setNotesSaveStatus('saving');
    try {
      await onSaveNotes(sharedNotes);
      setNotesSaveStatus('saved');
      setTimeout(() => setNotesSaveStatus(null), 3000);
    } catch {
      setNotesSaveStatus('error');
    }
  };

  // Participant leaves meeting (call stays active for others, meeting not ended)
  const handleParticipantLeave = useCallback(() => {
    setCallState('left');
    if (isUserJoined && onLeaveMeeting) {
      onLeaveMeeting().catch((err) => console.warn('Attendance leave error:', err));
    }
  }, [isUserJoined, onLeaveMeeting]);

  // Participant rejoins meeting
  const handleParticipantRejoin = () => {
    setCallState('connected');
    if (onJoinMeeting) {
      onJoinMeeting().catch((err) => console.warn('Attendance rejoin error:', err));
    }
  };

  // Host confirms ending meeting for everyone
  const handleConfirmEndMeeting = async () => {
    setIsEndConfirmOpen(false);

    // Auto-save notes first before AI engine runs to prevent any data loss
    if (onSaveNotes && sharedNotes.trim()) {
      try {
        await onSaveNotes(sharedNotes);
      } catch (err) {
        console.warn('Auto-save notes before ending:', err);
      }
    }

    const finalTranscript = customTranscriptInput.trim() ? customTranscriptInput.trim() : '';
    const notesToPass = sharedNotes.trim();

    onEndAndProcess(
      finalTranscript,
      chatMessages.map((c) => ({ sender: c.sender, message: c.message })),
      notesToPass
    );
  };

  // Memoized user object for Jitsi frame to prevent frame re-renders
  const jitsiUser = useMemo(() => ({
    id: currentUser?.id || 'guest',
    name: currentUser?.name || currentUser?.email || 'Workspace Member',
    email: currentUser?.email || 'member@collabai.dev',
  }), [currentUser?.id, currentUser?.name, currentUser?.email]);

  const handleConferenceJoined = useCallback(() => {
    if (!isUserJoined && onJoinMeeting) {
      onJoinMeeting().catch((err) => console.warn('Attendance auto-join:', err));
    }
  }, [isUserJoined, onJoinMeeting]);

  return (
    <div id={id} className="relative flex h-[calc(100vh-140px)] w-full flex-col overflow-hidden rounded-xl border border-[#E4DED4] bg-white shadow-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E4DED4] bg-[#F7F5F0] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${callState === 'connected' ? 'animate-ping bg-[#1F4D3A]' : 'bg-amber-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${callState === 'connected' ? 'bg-[#1F4D3A]' : 'bg-amber-500'}`}></span>
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#252D2A] tracking-tight capitalize" data-testid="live-room-title">
                {title}
              </h2>
              {meetingId && (
                <span
                  className="font-mono text-[10px] text-[#525B56] bg-[#E2DCD2]/70 px-2 py-0.5 rounded border border-[#E2DCD2]"
                  data-testid="live-room-meeting-id"
                  title={`Meeting ID: ${meetingId}`}
                >
                  ID: {meetingId.slice(0, 8)}...
                </span>
              )}
              {isHost && (
                <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> Host
                </span>
              )}
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                callState === 'connected'
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                  : 'bg-amber-100 border border-amber-300 text-amber-800'
              }`}>
                {callState === 'connected' ? 'Real-Time Video Call' : 'You Left Call (Meeting Active)'}
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#5F6863] flex items-center gap-2 mt-0.5">
              <span>LIVE MEETING ROOM</span> •{' '}
              <strong className="text-[#1F4D3A]">{persistedParticipants.length} Confirmed Attendee(s)</strong> •{' '}
              <span>{livePeersCount} Active Media Peer(s)</span> •{' '}
              <span className="text-[#5F6863] italic">Host: {hostDisplayName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Leave Meeting Button (Available to all participants) */}
          {callState === 'connected' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleParticipantLeave}
              className="h-8 border-[#C96B4A]/40 text-[#C96B4A] hover:bg-[#C96B4A]/10 text-xs font-semibold"
              title="Leave this call while keeping meeting running for others"
              data-testid="leave-meeting-btn"
            >
              <PhoneOff className="w-3.5 h-3.5 mr-1" /> Leave Meeting
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleParticipantRejoin}
              className="h-8 border-[#1F4D3A]/40 text-[#1F4D3A] hover:bg-[#1F4D3A]/10 text-xs font-semibold"
              data-testid="rejoin-meeting-btn"
            >
              <PhoneCall className="w-3.5 h-3.5 mr-1" /> Rejoin Call
            </Button>
          )}

          {/* End Meeting Button: Only Authorized Meeting Host / Creator */}
          {isHost ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsEndConfirmOpen(true)}
              loading={isProcessing}
              className="h-8 bg-[#C93B3B] hover:bg-[#A82B2B] text-white text-xs shadow-xs font-semibold"
              data-testid="end-meeting-host-btn"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> End Meeting for Everyone
            </Button>
          ) : (
            <div className="hidden md:flex items-center text-[11px] text-[#5F6863] bg-[#EAE6DF]/60 px-2.5 py-1 rounded-md border border-[#E4DED4]">
              <span>Only host ({hostDisplayName}) can end meeting</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Video Stage / Left State, Right = Persistent Drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Real-time Jitsi Stage OR Left Post-Call State */}
        <div className="flex flex-1 flex-col p-3 bg-[#EAE6DF]/40">
          {callState === 'connected' ? (
            <JitsiMeetingFrame
              roomName={effectiveRoomName}
              domain={accessData?.domain || process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'}
              meetingTitle={title}
              user={jitsiUser}
              isPublicProvider={accessData?.isPublicProvider ?? true}
              privacyNotice={accessData?.privacyNotice}
              onJoined={handleConferenceJoined}
              onLeft={handleParticipantLeave}
              onParticipantCountChange={(count) => setLivePeersCount(count)}
              onHangupClick={handleParticipantLeave}
            />
          ) : (
            /* Left Post-Call State: When current participant has left the call */
            <div
              className="flex flex-1 flex-col items-center justify-center rounded-xl border border-[#E2DCD2] bg-white p-8 text-center shadow-xs"
              data-testid="participant-left-card"
            >
              <div className="rounded-full bg-amber-50 p-4 text-amber-700 mb-3 border border-amber-200">
                <PhoneOff className="h-8 w-8 text-[#C96B4A]" />
              </div>
              <h3 className="text-base font-bold text-[#1C2421]">You Have Left the Meeting</h3>
              <p className="mt-1 text-xs text-[#525B56] max-w-md">
                You exited the video conference and your camera/microphone resources have been released. Other participants remain in room <code className="bg-[#EFEBE3] px-1 py-0.5 rounded font-mono">{effectiveRoomName}</code>.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleParticipantRejoin}
                  className="text-xs bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                >
                  <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
                  Rejoin Conference Room
                </Button>
                {onCloseRoom && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCloseRoom}
                    className="text-xs border-[#E4DED4]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    Back to Upcoming Meetings
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Drawer: Collaborative Notes / Attendance / Chat / AI Input */}
        <div className="flex w-96 flex-col border-l border-[#E4DED4] bg-white">
          {/* Drawer Tabs */}
          <div className="flex border-b border-[#E4DED4] bg-[#F7F5F0] px-2 pt-2">
            {[
              { id: 'notes', label: 'Notes', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { id: 'people', label: 'Attendees', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'transcript', label: 'AI Input', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#1F4D3A] text-[#1F4D3A]'
                    : 'border-transparent text-[#5F6863] hover:text-[#252D2A]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Drawer Content */}
          <div className="flex flex-1 flex-col overflow-y-auto p-4 scrollbar-thin">
            {/* TAB 1: COLLABORATIVE NOTES (PERSISTENT TO POSTGRESQL) */}
            {activeTab === 'notes' && (
              <div className="flex flex-1 flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider">
                    Collaborative Notes
                  </span>
                  {onSaveNotes && (
                    <Button
                      size="sm"
                      onClick={handleSaveNotesClick}
                      loading={isNotesSaving}
                      className="h-7 text-[11px] gap-1 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
                    >
                      <Save className="w-3 h-3" />
                      Save to Database
                    </Button>
                  )}
                </div>

                {notesSaveStatus === 'saved' && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Notes saved to PostgreSQL!
                  </p>
                )}
                {notesSaveStatus === 'error' && (
                  <p className="text-[11px] text-[#C96B4A] font-semibold">
                    Failed to save notes. Please try again.
                  </p>
                )}

                <textarea
                  value={sharedNotes}
                  onChange={(e) => setSharedNotes(e.target.value)}
                  placeholder="Type meeting decisions, agenda, discussion points... (Notes are saved without interrupting video)"
                  className="flex-1 min-h-[320px] w-full rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3 text-xs text-[#252D2A] focus:outline-none focus:border-[#1F4D3A] focus:bg-white font-mono leading-relaxed"
                />
                <p className="text-[10px] text-[#767676]">
                  Typing notes does not interrupt or reload the real-time video conference. Notes are stored in PostgreSQL.
                </p>
              </div>
            )}

            {/* TAB 2: CHAT MESSAGES */}
            {activeTab === 'chat' && (
              <div className="flex flex-1 flex-col justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="rounded-lg bg-[#F7F5F0] border border-[#E4DED4] p-2.5 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[#5F6863]">
                        <span>{msg.sender}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="mt-1 text-[#252D2A]">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Type in-call message..."
                    className="flex-1 rounded-lg border border-[#E4DED4] bg-[#F7F5F0] px-3 py-2 text-xs text-[#252D2A] placeholder-[#8C9590] focus:outline-none focus:border-[#1F4D3A] focus:bg-white"
                  />
                  <Button size="sm" onClick={handleSendChat} className="bg-[#1F4D3A] hover:bg-[#163E32] text-xs text-white">
                    Send
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: ATTENDEES */}
            {activeTab === 'people' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-[#E4DED4] pb-1 mb-2">
                    <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider">
                      Confirmed Attendees ({persistedParticipants.length})
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      PostgreSQL
                    </span>
                  </div>

                  {persistedParticipants.length > 0 ? (
                    <div className="space-y-1.5">
                      {persistedParticipants.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center justify-between rounded-lg border border-[#E2DCD2] bg-[#F7F5F0] p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-[#1F4D3A]" />
                            <span className="font-semibold text-[#1C2421]">{p.name || p.email}</span>
                          </div>
                          <span className="text-[10px] text-[#525B56]">{p.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#525B56] italic py-1">
                      No persistent attendance recorded yet. Joining the video call automatically registers your attendance.
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-[#F7F5F0] p-3 text-[11px] text-[#525B56] border border-[#E2DCD2]">
                  <h5 className="font-bold text-[#1F4D3A] mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1F4D3A]" />
                    <span>Workspace Authorization</span>
                  </h5>
                  <p>
                    All participants entering room <code className="bg-[#E4DED4] px-1 rounded">{effectiveRoomName}</code> are authenticated members of this workspace.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: TRANSCRIPT & AI SUMMARY INPUT */}
            {activeTab === 'transcript' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E4DED4] pb-2">
                  <span className="text-xs font-bold text-[#1F4D3A] uppercase tracking-wider">Meeting Intelligence Input</span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Low-Resource Mode
                  </span>
                </div>

                <div className="rounded-lg bg-[#F7F5F0] p-2.5 text-[11px] text-[#525B56] flex items-start gap-2 border border-[#E2DCD2]">
                  <Info className="w-4 h-4 text-[#1F4D3A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#1F4D3A]">Continuous In-Browser Transcription Paused</p>
                    <p className="mt-0.5 leading-relaxed text-[#5F6863]">
                      To prevent CPU throttling and battery drain on your laptop, continuous in-browser speech-to-text models are kept disabled during the call.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#252D2A]">
                    Optional: Paste Meeting Transcript or Bullet Points
                  </label>
                  <textarea
                    value={customTranscriptInput}
                    onChange={(e) => setCustomTranscriptInput(e.target.value)}
                    placeholder="If you have an external transcript or meeting notes, paste them here. Otherwise, the AI engine uses your shared notes and chat log."
                    className="w-full min-h-[160px] rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-2.5 text-xs text-[#252D2A] focus:outline-none focus:border-[#1F4D3A] focus:bg-white font-mono leading-relaxed"
                  />
                </div>

                {isHost ? (
                  <Button
                    size="sm"
                    onClick={() => setIsEndConfirmOpen(true)}
                    loading={isProcessing}
                    className="w-full bg-[#1F4D3A] text-white hover:bg-[#163E32] text-xs font-semibold py-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> End Meeting & Run AI Engine
                  </Button>
                ) : (
                  <p className="text-[11px] text-center text-[#5F6863] italic py-2">
                    Only the meeting host ({hostDisplayName}) can run the AI Engine and end the meeting for all attendees.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG: End Meeting for Everyone */}
      <AnimatePresence>
        {isEndConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl border border-[#E2DCD2] bg-white p-6 shadow-xl"
              data-testid="end-meeting-confirm-dialog"
            >
              <button
                onClick={() => setIsEndConfirmOpen(false)}
                className="absolute top-4 right-4 text-[#767676] hover:text-[#1C2421] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-red-100 p-2.5 text-[#C93B3B]">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1C2421]">End Meeting for Everyone?</h3>
                  <p className="text-xs text-[#525B56]">Confirmation required by Host ({currentUser?.name || currentUser?.email})</p>
                </div>
              </div>

              <div className="rounded-lg bg-[#F7F5F0] p-3 text-xs text-[#525B56] space-y-1.5 mb-5 border border-[#E2DCD2]">
                <p className="font-semibold text-[#1C2421]">Ending this meeting will:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Disconnect all active participants from the conference room.</li>
                  <li>Save the current collaborative notes to PostgreSQL.</li>
                  <li>Run the AI Meeting Intelligence pipeline to extract tasks and decisions.</li>
                  <li>Update the scheduled meeting status to <strong className="text-[#1F4D3A]">Completed</strong>.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEndConfirmOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmEndMeeting}
                  loading={isProcessing}
                  className="text-xs bg-[#C93B3B] hover:bg-[#A82B2B] text-white font-semibold"
                  data-testid="confirm-end-meeting-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Yes, End Meeting & Run AI
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
