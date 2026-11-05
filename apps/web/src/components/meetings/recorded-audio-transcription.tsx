'use client';

import React, { useState, useRef } from 'react';
import {
  Mic,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Loader2,
  Save,
  Trash2,
  ShieldCheck,
  Cpu,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  useUploadMeetingAudio,
  useUpdateMeetingTranscript,
} from '@/lib/queries/meetings';

interface Props {
  meetingId: string;
  workspaceId: string;
  currentTranscript: string;
  onTranscriptChange: (text: string) => void;
  onTranscriptSaved?: (text: string) => void;
  disabled?: boolean;
}

const ACCEPTED_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.aac'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function RecordedAudioTranscription({
  meetingId,
  workspaceId,
  currentTranscript,
  onTranscriptChange,
  onTranscriptSaved,
  disabled = false,
}: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('tiny');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadAudioMutation = useUploadMeetingAudio();
  const updateTranscriptMutation = useUpdateMeetingTranscript();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Unsupported format '${ext}'. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 50 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleTranscribe = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select an audio file first.');
      return;
    }

    if (!consentConfirmed) {
      setErrorMessage('You must confirm participant consent before processing meeting audio recordings.');
      return;
    }

    setErrorMessage(null);

    try {
      toast('🎙️ Starting local Whisper speech-to-text... Running locally on your CPU (zero cloud costs).', 'info');

      const result = await uploadAudioMutation.mutateAsync({
        meetingId,
        workspaceId,
        file: selectedFile,
        consentConfirmed: true,
        model: selectedModel,
      });

      const newTranscript = result.transcription?.transcript || '';
      onTranscriptChange(newTranscript);
      if (onTranscriptSaved) {
        onTranscriptSaved(newTranscript);
      }

      const durationStr = result.transcription?.duration
        ? ` (${result.transcription.duration.toFixed(1)}s audio)`
        : '';
      const langStr = result.transcription?.language ? ` • Language: ${result.transcription.language}` : '';

      toast(`✅ Audio transcription completed locally${durationStr}${langStr}!`, 'success');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const msg = err.message || 'Local audio transcription failed';
      setErrorMessage(msg);
      toast(msg, 'error');
    }
  };

  const handleSaveTranscript = async () => {
    if (!meetingId || !workspaceId) return;
    setSaveStatus('saving');
    try {
      await updateTranscriptMutation.mutateAsync({
        meetingId,
        workspaceId,
        transcript: currentTranscript,
      });
      setSaveStatus('saved');
      if (onTranscriptSaved) {
        onTranscriptSaved(currentTranscript);
      }
      toast('Transcript saved persistently to PostgreSQL!', 'success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      toast(err.message || 'Failed to save transcript', 'error');
    }
  };

  const isTranscribing = uploadAudioMutation.isPending;

  return (
    <div className="space-y-4 text-xs">
      {/* Privacy & Zero-Cost Banner */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-[#1F4D3A] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
          <Cpu className="w-3.5 h-3.5 text-emerald-700" />
          <span>Local Whisper Audio Transcription</span>
          <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
            Zero API Cost • 100% Private
          </span>
        </div>
        <p className="text-[11px] text-emerald-800 leading-relaxed">
          Upload recorded meeting audio to transcribe speech into text on your machine using local Whisper ({selectedModel}). No audio is sent to cloud AI providers.
        </p>
      </div>

      {/* Upload & Consent Box */}
      <div className="rounded-xl border border-[#E4DED4] bg-[#F7F5F0] p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#E4DED4] pb-2">
          <div className="flex items-center gap-1.5 font-bold text-[#252D2A]">
            <FileAudio className="w-4 h-4 text-[#1F4D3A]" />
            <span>Select Recorded Meeting Audio</span>
          </div>
          <span className="text-[10px] text-[#5F6863]">
            Max 50 MB • WAV, MP3, M4A, WEBM, OGG, FLAC
          </span>
        </div>

        {/* File Picker */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".wav,.mp3,.m4a,.ogg,.webm,.flac,.aac,audio/*"
            className="hidden"
            id="meeting-audio-upload-input"
            disabled={disabled || isTranscribing}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isTranscribing}
            className="h-8 gap-1.5 bg-white border-[#E4DED4] text-[#252D2A] hover:bg-[#EFEBE3] text-xs font-semibold cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#1F4D3A]" />
            {selectedFile ? 'Change File' : 'Browse Audio File'}
          </Button>

          {selectedFile ? (
            <div className="flex-1 truncate font-mono text-[11px] text-[#252D2A] bg-white px-2.5 py-1.5 rounded border border-[#E4DED4] flex items-center justify-between">
              <span className="truncate">{selectedFile.name}</span>
              <span className="text-[#5F6863] ml-2 shrink-0">
                ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-[#767676] italic">No file selected yet</span>
          )}
        </div>

        {/* Model selection */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-[#5F6863]">Whisper Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={disabled || isTranscribing}
            className="rounded border border-[#E4DED4] bg-white px-2 py-1 text-xs text-[#252D2A] focus:outline-none focus:border-[#1F4D3A]"
          >
            <option value="tiny">tiny (Fastest, ~150MB RAM, recommended for this machine)</option>
            <option value="base">base (~250MB RAM)</option>
            <option value="small">small (~500MB RAM)</option>
          </select>
        </div>

        {/* Participant Consent Checkbox (Strict privacy requirement) */}
        <div className="flex items-start gap-2 pt-1 border-t border-[#E4DED4]">
          <input
            type="checkbox"
            id="meeting-participant-consent"
            checked={consentConfirmed}
            onChange={(e) => setConsentConfirmed(e.target.checked)}
            disabled={disabled || isTranscribing}
            className="mt-0.5 h-4 w-4 rounded border-[#C4BDB2] text-[#1F4D3A] focus:ring-[#1F4D3A] cursor-pointer"
          />
          <label
            htmlFor="meeting-participant-consent"
            className="text-[11px] font-medium text-[#252D2A] leading-snug cursor-pointer select-none"
          >
            <span className="font-semibold text-emerald-900">Required Consent:</span> I confirm that all meeting participants have consented to recording and transcribing this meeting audio.
          </label>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-[11px] text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Progress indicator during transcription */}
        {isTranscribing && (
          <div className="rounded-lg bg-emerald-50/90 border border-emerald-300 p-3 space-y-1.5 animate-pulse">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Loader2 className="w-4 h-4 animate-spin text-[#1F4D3A]" />
              <span>Transcribing Audio with Local Whisper...</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Inference is running locally on CPU with int8 quantization. No network calls or cloud costs. This may take 10-40 seconds depending on file length.
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleTranscribe}
          disabled={!selectedFile || !consentConfirmed || disabled || isTranscribing}
          loading={isTranscribing}
          className="w-full bg-[#1F4D3A] hover:bg-[#163E32] text-white font-semibold text-xs py-2 gap-2"
        >
          <Mic className="w-3.5 h-3.5" />
          {isTranscribing ? 'Transcribing Recorded Audio...' : 'Start Local Speech-to-Text Transcription'}
        </Button>
      </div>

      {/* Transcript Review & Manual Editing */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#1F4D3A] uppercase tracking-wider text-[11px]">
              Meeting Transcript Review & Edit
            </span>
            {currentTranscript && (
              <span className="rounded bg-[#E4DED4] px-1.5 py-0.5 font-mono text-[9px] text-[#5F6863]">
                {currentTranscript.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {currentTranscript && (
              <button
                type="button"
                onClick={() => onTranscriptChange('')}
                disabled={disabled || isTranscribing}
                className="text-[10px] text-[#C93B3B] hover:underline flex items-center gap-0.5 cursor-pointer mr-2"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleSaveTranscript}
              disabled={disabled || isTranscribing || !currentTranscript.trim()}
              loading={updateTranscriptMutation.isPending}
              className="h-7 text-[11px] gap-1 bg-[#1F4D3A] text-white hover:bg-[#163E32]"
            >
              <Save className="w-3 h-3" />
              Save Transcript
            </Button>
          </div>
        </div>

        {saveStatus === 'saved' && (
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Transcript saved persistently to PostgreSQL!
          </p>
        )}
        {saveStatus === 'error' && (
          <p className="text-[11px] text-[#C96B4A] font-semibold">
            Failed to save transcript. Please try again.
          </p>
        )}

        <textarea
          value={currentTranscript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Meeting transcript will appear here after local audio processing. You can also paste, review, and edit transcript text before AI processing."
          disabled={disabled || isTranscribing}
          className="w-full min-h-[170px] rounded-lg border border-[#E4DED4] bg-[#F7F5F0] p-3 text-xs text-[#252D2A] focus:outline-none focus:border-[#1F4D3A] focus:bg-white font-mono leading-relaxed"
        />

        <p className="text-[10px] text-[#767676] flex items-center gap-1">
          <Info className="w-3 h-3" />
          Review and edit the transcript as needed. When you click &quot;End Meeting & Run AI Engine&quot;, this transcript will be passed into the meeting intelligence engine.
        </p>
      </div>
    </div>
  );
}
