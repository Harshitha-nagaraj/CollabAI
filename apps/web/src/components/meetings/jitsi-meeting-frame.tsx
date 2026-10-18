'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  PhoneOff,
  Cpu,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JitsiMeetingFrameProps {
  roomName: string;
  domain?: string;
  meetingTitle: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
  isPublicProvider?: boolean;
  privacyNotice?: string;
  onJoined?: () => void;
  onLeft?: () => void;
  onParticipantCountChange?: (count: number) => void;
  onHangupClick?: () => void;
}

// Global script load promise tracker to avoid duplicate script tags
let jitsiScriptPromise: Promise<void> | null = null;

function loadJitsiScript(domain: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // If already loaded on window
  if ((window as any).JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  if (jitsiScriptPromise) {
    return jitsiScriptPromise;
  }

  jitsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src*="${domain}/external_api.js"]`) as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Jitsi external API')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      jitsiScriptPromise = null;
      reject(new Error(`Failed to load conferencing script from ${domain}`));
    };
    document.body.appendChild(script);
  });

  return jitsiScriptPromise;
}

export const JitsiMeetingFrame = memo(function JitsiMeetingFrame({
  roomName,
  domain = 'meet.jit.si',
  meetingTitle,
  user,
  isPublicProvider = true,
  privacyNotice,
  onJoined,
  onLeft,
  onParticipantCountChange,
  onHangupClick,
}: JitsiMeetingFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLowBandwidthMode, setIsLowBandwidthMode] = useState(false);
  const [hasWebRTCSupport, setHasWebRTCSupport] = useState(true);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const [liveParticipantCount, setLiveParticipantCount] = useState<number>(1);

  // 1. Validate WebRTC support in browser environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasWebRTC = !!(
        window.RTCPeerConnection &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      );
      setHasWebRTCSupport(hasWebRTC);
      if (!hasWebRTC) {
        setLoadingState('error');
        setErrorMessage('Your browser does not support real-time WebRTC audio/video calls.');
      }
    }
  }, []);

  // 2. Initialize Jitsi Meet instance
  useEffect(() => {
    if (!hasWebRTCSupport || !roomName) return;

    let isDisposed = false;
    setLoadingState('loading');
    setErrorMessage(null);
    setMediaWarning(null);

    loadJitsiScript(domain)
      .then(() => {
        if (isDisposed || !containerRef.current) return;

        const JitsiAPI = (window as any).JitsiMeetExternalAPI;
        if (!JitsiAPI) {
          throw new Error('Jitsi External API failed to initialize on window object.');
        }

        // Clean up previous instance if any
        if (jitsiApiRef.current) {
          try {
            jitsiApiRef.current.dispose();
          } catch {
            // ignore
          }
          jitsiApiRef.current = null;
        }

        containerRef.current.innerHTML = '';

        // Configure low-resource, battery-friendly parameters
        const options = {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: user.name || user.email.split('@')[0],
            email: user.email,
          },
          configOverwrite: {
            // Resource-constrained performance profile
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,

            // Resolution capped to 360p / 480p ideal to prevent CPU/fan throttling
            resolution: 360,
            constraints: {
              video: {
                height: { ideal: 360, max: 480 },
                width: { ideal: 640, max: 854 },
                frameRate: { ideal: 15, max: 20 },
              },
            },

            // Limits incoming video decoders to max 4 active streams
            channelLastN: 4,
            enableLayerSuspension: true,
            disableSimulcast: false,

            // Direct P2P mode for 2-participant syncs
            p2p: {
              enabled: true,
              preferH264: true,
            },

            // Disable CPU-heavy local analyzers
            disableAudioLevels: true,
            doNotStoreRoom: true,

            // Disable heavy features (recording, transcription, live streaming)
            fileRecordingsEnabled: false,
            liveStreamingEnabled: false,
            transcription: { enabled: false },

            toolbarButtons: [
              'microphone',
              'camera',
              'desktop',
              'fullscreen',
              'hangup',
              'chat',
              'settings',
              'tileview',
              'toggle-camera',
              'videoquality',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
          },
        };

        const api = new JitsiAPI(domain, options);
        jitsiApiRef.current = api;
        setLoadingState('ready');

        // Event listeners
        api.addEventListener('videoConferenceJoined', (event: any) => {
          if (isDisposed) return;
          setLoadingState('ready');
          onJoined?.();
        });

        api.addEventListener('videoConferenceLeft', () => {
          if (isDisposed) return;
          if (jitsiApiRef.current) {
            try {
              jitsiApiRef.current.dispose();
            } catch {}
            jitsiApiRef.current = null;
          }
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          onLeft?.();
        });

        api.addEventListener('readyToClose', () => {
          if (isDisposed) return;
          if (jitsiApiRef.current) {
            try {
              jitsiApiRef.current.dispose();
            } catch {}
            jitsiApiRef.current = null;
          }
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          onLeft?.();
        });

        api.addEventListener('participantJoined', () => {
          if (isDisposed) return;
          try {
            const count = (api.getParticipantsInfo?.()?.length || 0) + 1;
            setLiveParticipantCount(count);
            onParticipantCountChange?.(count);
          } catch {
            // ignore
          }
        });

        api.addEventListener('participantLeft', () => {
          if (isDisposed) return;
          try {
            const count = Math.max(1, (api.getParticipantsInfo?.()?.length || 0) + 1);
            setLiveParticipantCount(count);
            onParticipantCountChange?.(count);
          } catch {
            // ignore
          }
        });

        api.addEventListener('cameraError', (error: any) => {
          console.warn('[Jitsi] Camera error or permission denial:', error);
          setMediaWarning('Camera access unavailable or blocked. You can still participate via audio.');
        });

        api.addEventListener('micError', (error: any) => {
          console.warn('[Jitsi] Microphone error or permission denial:', error);
          setMediaWarning('Microphone access unavailable or blocked. Please check browser permissions.');
        });
      })
      .catch((err: Error) => {
        if (isDisposed) return;
        console.error('[Jitsi] Error initializing Jitsi conference:', err);
        setLoadingState('error');
        setErrorMessage(
          err.message || 'Failed to establish connection to real-time conferencing service.'
        );
      });

    const handleBeforeUnload = () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
        jitsiApiRef.current = null;
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      isDisposed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {
          console.warn('[Jitsi] Error disposing Jitsi API:', e);
        }
        jitsiApiRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [domain, roomName, user.name, user.email, hasWebRTCSupport, onJoined, onLeft, onParticipantCountChange]);

  // Toggle Low Bandwidth Mode (Audio Only)
  const handleToggleLowBandwidth = () => {
    if (!jitsiApiRef.current) return;
    const nextMode = !isLowBandwidthMode;
    setIsLowBandwidthMode(nextMode);

    try {
      // Toggle video transmission and set receiver resolution
      jitsiApiRef.current.executeCommand('setVideoQuality', nextMode ? 180 : 360);
      if (nextMode) {
        // Mute video to maximize laptop resource preservation
        jitsiApiRef.current.executeCommand('toggleVideo');
      }
    } catch (e) {
      console.warn('Could not set video quality:', e);
    }
  };

  const handleExplicitLeave = () => {
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.executeCommand('hangup');
      } catch {}
      try {
        jitsiApiRef.current.dispose();
      } catch {}
      jitsiApiRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    onLeft?.();
    onHangupClick?.();
  };

  const handleRetry = () => {
    setLoadingState('loading');
    setErrorMessage(null);
    setMediaWarning(null);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#121815] text-white">
      {/* Top Media Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#24332D] bg-[#16201B] px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-300">Live Video Call</span>
          <span className="text-[#84948C]">•</span>
          <span className="font-mono text-[11px] text-[#A6B8B0] truncate max-w-[200px]" title={roomName}>
            Room: {roomName}
          </span>
          <span className="rounded bg-[#205743] px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            {liveParticipantCount} {liveParticipantCount === 1 ? 'Peer' : 'Peers'} Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Low Resource Indicator / Toggle */}
          <button
            type="button"
            onClick={handleToggleLowBandwidth}
            title={isLowBandwidthMode ? 'Switch to Standard Video (360p)' : 'Enable Low-Bandwidth Mode (Conserves Laptop CPU & RAM)'}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isLowBandwidthMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-[#223028] text-[#B8C8BF] hover:bg-[#2C3E34] border border-[#314539]'
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>{isLowBandwidthMode ? 'Low-Resource Mode: ON' : 'Low-Resource Mode'}</span>
          </button>

          {onHangupClick && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleExplicitLeave}
              className="h-7 text-xs gap-1 bg-[#C96B4A] hover:bg-[#B35838] text-white px-2.5"
            >
              <PhoneOff className="h-3 w-3" />
              <span>Leave</span>
            </Button>
          )}
        </div>
      </div>

      {/* Media Notice / Warnings */}
      {mediaWarning && (
        <div className="flex items-center gap-2 bg-amber-900/60 border-b border-amber-700/50 px-4 py-1.5 text-[11px] text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{mediaWarning}</span>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <div className="flex items-center justify-between bg-[#19241E] border-b border-[#24332D] px-4 py-1 text-[10px] text-[#8EA097]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
          <span>
            {isPublicProvider ? (
              <>
                <strong>Access Authorized:</strong> Meeting access verified by CollabAI workspace authorization. Media routed via {domain} (360p adaptive low-resource profile).
              </>
            ) : (
              <>
                <strong>Enterprise Isolated:</strong> Media routed through configured custom host ({domain}).
              </>
            )}
          </span>
        </div>
        {isPublicProvider && (
          <span className="text-[9px] text-[#788C83] hidden sm:inline">
            Self-hosted Jitsi domain supported via NEXT_PUBLIC_JITSI_DOMAIN
          </span>
        )}
      </div>

      {/* Main Jitsi Container & Overlay States */}
      <div className="relative flex-1 w-full min-h-[420px] bg-black">
        {/* The DOM element where Jitsi External API injects the iframe */}
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full"
          data-testid="jitsi-iframe-container"
        />

        {/* Loading Overlay */}
        {loadingState === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#121815]/90 p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mb-3" />
            <h4 className="text-sm font-bold text-white">Connecting to Real-Time Meeting Room</h4>
            <p className="mt-1 text-xs text-[#8EA097] max-w-sm">
              Loading low-resource conferencing engine for &quot;{meetingTitle}&quot;...
            </p>
            <span className="mt-3 rounded-full bg-[#1F4D3A]/40 px-3 py-1 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
              Low-Resource Preset: 360p / 15-20fps / channelLastN: 4
            </span>
          </div>
        )}

        {/* Error Overlay */}
        {loadingState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#121815] p-6 text-center">
            <div className="rounded-full bg-red-900/40 p-3 text-red-400 mb-3 border border-red-500/30">
              <AlertTriangle className="h-8 w-8 text-[#C96B4A]" />
            </div>
            <h4 className="text-sm font-bold text-white">Conferencing Connection Failed</h4>
            <p className="mt-1 text-xs text-[#B8C8BF] max-w-md">
              {errorMessage || 'Unable to connect to the WebRTC video service.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                className="text-xs border-[#314539] bg-[#1C2621] text-white hover:bg-[#25332C]"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" /> Retry Connection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
