/**
 * @file tests/local-whisper-transcription.test.ts
 *
 * Automated verification suite for CollabAI Phase 2A:
 * Completely local, zero-paid-API-cost meeting audio transcription.
 *
 * Tests against REAL human speech:
 * 1. Speech recognition accuracy on actual spoken English audio (16s speech sample)
 * 2. Authenticated HTTP upload flow with participant consent enforcement
 * 3. Workspace authorization & isolation
 * 4. Cleanup of temporary audio files on both success and failure
 * 5. Transcript persistence and manual editing in PostgreSQL
 * 6. Meeting Intelligence integration with audio transcripts
 * 7. Human-in-the-loop task approval requirement strictly preserved (no auto-creation)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';
import express from 'express';
import { prisma } from '../src/lib/prisma.js';
import { MeetingService } from '../src/services/meeting.service.js';
import { TranscriptionService } from '../src/services/transcription.service.js';
import { MeetingIntelligenceService } from '../src/ai/services/meeting-intelligence.service.js';
import { AUDIO_TEMP_DIR } from '../src/middleware/audio-upload.js';
import meetingRoutes from '../src/routes/meeting.routes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { generateToken } from '../src/utils/jwt.js';

// Known spoken text in the speech recording fixture
const KNOWN_SPOKEN_SENTENCES = [
  'Welcome everyone to the sprint planning session.',
  'Today we need to finalize the local Whisper audio pipeline.',
  'Sarah will review the frontend audio component by Friday, and Alex will deploy the updated transcription worker to the testing cluster.',
];

describe('Phase 2A Local Whisper Speech-to-Text Test Suite', () => {
  let testWorkspace: any;
  let unauthorizedWorkspace: any;
  let testProject: any;
  let testUser: any;
  let unauthorizedUser: any;
  let testMeeting: any;
  let userToken: string;
  let unauthorizedToken: string;

  let testServer: any;
  let apiBaseUrl: string;

  const speechFixturePath = path.resolve(__dirname, 'fixtures', 'speech_sample.wav');

  before(async () => {
    const ts = Date.now();

    // Verify speech fixture exists
    assert.ok(
      fs.existsSync(speechFixturePath),
      `Speech fixture must exist at: ${speechFixturePath}`
    );

    // Create test user and workspace
    testUser = await prisma.user.create({
      data: {
        email: `speech_host_${ts}@collabai.internal`,
        name: 'Alex Rivera',
        password: 'hashed-password-123',
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `unauthorized_${ts}@collabai.internal`,
        name: 'External Actor',
        password: 'hashed-password-123',
      },
    });

    userToken = generateToken({ userId: testUser.id });
    unauthorizedToken = generateToken({ userId: unauthorizedUser.id });

    testWorkspace = await prisma.workspace.create({
      data: {
        name: `Audio Transcription WS ${ts}`,
      },
    });

    unauthorizedWorkspace = await prisma.workspace.create({
      data: {
        name: `Isolated Workspace ${ts}`,
      },
    });

    // Add testUser to testWorkspace, but unauthorizedUser to unauthorizedWorkspace
    await prisma.membership.create({
      data: {
        userId: testUser.id,
        workspaceId: testWorkspace.id,
        role: 'OWNER',
      },
    });

    await prisma.membership.create({
      data: {
        userId: unauthorizedUser.id,
        workspaceId: unauthorizedWorkspace.id,
        role: 'MEMBER',
      },
    });

    testProject = await prisma.project.create({
      data: {
        name: 'AI Engineering Platform',
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    testMeeting = await prisma.meeting.create({
      data: {
        title: 'Sprint Planning Speech Sync',
        description: 'Review local speech model integration and latency',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        status: 'SCHEDULED',
        workspaceId: testWorkspace.id,
        creatorId: testUser.id,
      },
    });

    // Start an ephemeral test Express server for HTTP-level endpoint testing
    const app = express();
    app.use(express.json());
    app.use('/api/v1/meetings', meetingRoutes);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      testServer = app.listen(0, () => {
        const port = (testServer.address() as AddressInfo).port;
        apiBaseUrl = `http://localhost:${port}/api/v1/meetings`;
        resolve();
      });
    });
  });

  after(async () => {
    // Close test HTTP server
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }

    // Clean up test database records
    if (testMeeting?.id) {
      await prisma.meeting.deleteMany({ where: { id: testMeeting.id } });
    }
    if (testProject?.id) {
      await prisma.task.deleteMany({ where: { projectId: testProject.id } });
      await prisma.project.deleteMany({ where: { id: testProject.id } });
    }
    if (testWorkspace?.id) {
      await prisma.membership.deleteMany({ where: { workspaceId: testWorkspace.id } });
      await prisma.workspace.deleteMany({ where: { id: testWorkspace.id } });
    }
    if (unauthorizedWorkspace?.id) {
      await prisma.membership.deleteMany({ where: { workspaceId: unauthorizedWorkspace.id } });
      await prisma.workspace.deleteMany({ where: { id: unauthorizedWorkspace.id } });
    }
    if (testUser?.id) {
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
    if (unauthorizedUser?.id) {
      await prisma.user.deleteMany({ where: { id: unauthorizedUser.id } });
    }
  });

  describe('1. Real Speech Audio Transcription Accuracy (CPU, tiny model)', () => {
    it('accurately transcribes real English speech recording of 16 seconds', async () => {
      const result = await TranscriptionService.transcribeAudioFile(speechFixturePath, {
        model: 'tiny',
      });

      assert.equal(result.success, true);
      assert.equal(result.model, 'tiny');
      assert.equal(result.language, 'en');
      assert.ok(result.languageProbability && result.languageProbability > 0.9, 'Language probability should be > 0.9');
      assert.ok(result.duration && result.duration >= 14 && result.duration <= 18, `Duration was ${result.duration}`);

      // Verify returned transcript text contains key spoken concepts
      const transcript = result.transcript.toLowerCase();
      assert.ok(transcript.includes('sprint planning session'), 'Must contain "sprint planning session"');
      assert.ok(transcript.includes('whisper'), 'Must contain "whisper"');
      assert.ok(transcript.includes('pipeline'), 'Must contain "pipeline"');
      assert.ok(transcript.includes('sarah will review'), 'Must contain "sarah will review"');
      assert.ok(transcript.includes('friday'), 'Must contain "friday"');
      assert.ok(transcript.includes('alex will deploy'), 'Must contain "alex will deploy"');
      assert.ok(transcript.includes('transcription worker'), 'Must contain "transcription worker"');

      // Verify segments were populated with timestamps
      assert.ok(result.segments && result.segments.length > 0, 'Segments must not be empty');
      assert.ok(result.segments[0]!.end > result.segments[0]!.start, 'Segment end must be > start');
    });

    it('enforces duration limits on audio files', async () => {
      await assert.rejects(
        async () => {
          await TranscriptionService.transcribeAudioFile(speechFixturePath, {
            maxDurationSeconds: 5.0, // Speech fixture is ~16s
          });
        },
        (err: Error) => {
          assert.match(err.message, /exceeds maximum allowed limit/i);
          return true;
        }
      );
    });
  });

  describe('2. HTTP Upload Endpoint, Consent Confirmation & Security', () => {
    it('returns 401 Unauthorized if request has no Bearer token', async () => {
      const formData = new FormData();
      const fileBytes = fs.readFileSync(speechFixturePath);
      formData.append('audio', new Blob([fileBytes], { type: 'audio/wav' }), 'speech.wav');
      formData.append('workspaceId', testWorkspace.id);
      formData.append('consentConfirmed', 'true');

      const res = await fetch(`${apiBaseUrl}/${testMeeting.id}/transcript/audio`, {
        method: 'POST',
        body: formData,
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.error.message, /token required/i);
    });

    it('returns 400 Bad Request when participant consent is unconfirmed, and cleans up file', async () => {
      const filesBefore = fs.existsSync(AUDIO_TEMP_DIR) ? fs.readdirSync(AUDIO_TEMP_DIR).length : 0;

      const formData = new FormData();
      const fileBytes = fs.readFileSync(speechFixturePath);
      formData.append('audio', new Blob([fileBytes], { type: 'audio/wav' }), 'speech.wav');
      formData.append('workspaceId', testWorkspace.id);
      formData.append('consentConfirmed', 'false'); // NOT CONFIRMED

      const res = await fetch(`${apiBaseUrl}/${testMeeting.id}/transcript/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        body: formData,
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.error, /consent must be confirmed/i);

      // Verify no temporary files were leaked
      const filesAfter = fs.readdirSync(AUDIO_TEMP_DIR).length;
      assert.equal(filesAfter, filesBefore, 'Temp audio must be cleaned up on consent failure');
    });

    it('returns 403 Forbidden when user is not a workspace member, and cleans up file', async () => {
      const filesBefore = fs.existsSync(AUDIO_TEMP_DIR) ? fs.readdirSync(AUDIO_TEMP_DIR).length : 0;

      const formData = new FormData();
      const fileBytes = fs.readFileSync(speechFixturePath);
      formData.append('audio', new Blob([fileBytes], { type: 'audio/wav' }), 'speech.wav');
      formData.append('workspaceId', testWorkspace.id);
      formData.append('consentConfirmed', 'true');

      const res = await fetch(`${apiBaseUrl}/${testMeeting.id}/transcript/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`, // UNAUTHORIZED USER
        },
        body: formData,
      });

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.error, /Access denied/i);

      // Verify no temporary files were leaked
      const filesAfter = fs.readdirSync(AUDIO_TEMP_DIR).length;
      assert.equal(filesAfter, filesBefore, 'Temp audio must be cleaned up on auth failure');
    });

    it('successfully processes authenticated audio upload with consent, persists transcript, and cleans up temp file', async () => {
      const filesBefore = fs.existsSync(AUDIO_TEMP_DIR) ? fs.readdirSync(AUDIO_TEMP_DIR).length : 0;

      const formData = new FormData();
      const fileBytes = fs.readFileSync(speechFixturePath);
      formData.append('audio', new Blob([fileBytes], { type: 'audio/wav' }), 'real_speech.wav');
      formData.append('workspaceId', testWorkspace.id);
      formData.append('consentConfirmed', 'true');

      const res = await fetch(`${apiBaseUrl}/${testMeeting.id}/transcript/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        body: formData,
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.transcription?.transcript);
      assert.ok(json.transcription?.duration > 0);

      // Verify transcript was persisted in PostgreSQL database
      const meetingInDb = await prisma.meeting.findUnique({
        where: { id: testMeeting.id },
      });
      assert.ok(meetingInDb?.transcript);
      assert.ok(meetingInDb.transcript.includes('sprint planning'));

      // Verify temp audio file was cleaned up on disk
      const filesAfter = fs.readdirSync(AUDIO_TEMP_DIR).length;
      assert.equal(filesAfter, filesBefore, 'Temp audio must be deleted after successful transcription');
    });
  });

  describe('3. Transcript Review, Editing & Persistence in PostgreSQL', () => {
    it('allows transcript to be reviewed and edited via PUT endpoint', async () => {
      const editedTranscript =
        'Welcome everyone. Sarah will review frontend audio by Friday. Alex will deploy transcription worker.';

      const res = await fetch(`${apiBaseUrl}/${testMeeting.id}/transcript`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          workspaceId: testWorkspace.id,
          transcript: editedTranscript,
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.meeting.transcript, editedTranscript);

      const inDb = await prisma.meeting.findUnique({
        where: { id: testMeeting.id },
      });
      assert.equal(inDb?.transcript, editedTranscript);
    });
  });

  describe('4. AI Meeting Intelligence Integration & Human Task Approval', () => {
    it('passes transcript into MeetingIntelligenceService and extracts action items without creating database tasks', async () => {
      const speechTranscript =
        'Welcome everyone to sprint planning. Sarah will review the frontend audio component by Friday, and Alex will deploy the updated transcription worker to the testing cluster.';

      const intelligence = await MeetingIntelligenceService.analyzeMeeting({
        title: testMeeting.title,
        transcript: speechTranscript,
        sharedNotes: '',
        participants: [
          { id: testUser.id, name: 'Alex Rivera', email: 'alex@collabai.internal' },
          { id: 'u-sarah', name: 'Sarah', email: 'sarah@collabai.internal' },
        ],
      });

      assert.ok(intelligence.executiveSummary);
      assert.equal(intelligence.source, 'Meeting Transcript');
      assert.ok(Array.isArray(intelligence.actionItems));
      assert.ok(intelligence.actionItems.length > 0, 'Should extract action items from speech transcript');

      // Check extracted action item content
      const actionItemTitles = intelligence.actionItems.map((a) => a.title.toLowerCase()).join(' ');
      assert.ok(actionItemTitles.includes('review') || actionItemTitles.includes('deploy'));

      // STRICT CHECK: Zero tasks must be inserted into PostgreSQL automatically
      const tasksInDb = await prisma.task.findMany({
        where: { workspaceId: testWorkspace.id },
      });
      assert.equal(
        tasksInDb.length,
        0,
        'Proposed tasks must NEVER be created automatically in database without human approval'
      );
    });

    it('strictly preserves human task-approval requirement: creates tasks only when explicitly approved', async () => {
      const approvedTasks = [
        {
          title: 'Deploy updated transcription worker to testing cluster',
          description: 'Extracted from spoken speech transcript and approved by host',
          priority: 'HIGH' as const,
          assigneeId: testUser.id,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      const res = await fetch(`${apiBaseUrl}/${testMeeting.id}/approve-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          workspaceId: testWorkspace.id,
          projectId: testProject.id,
          tasks: approvedTasks,
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.tasks.length, 1);
      assert.equal(json.tasks[0].title, approvedTasks[0]!.title);

      // Verify task now exists in PostgreSQL
      const persistedTask = await prisma.task.findFirst({
        where: { projectId: testProject.id, title: approvedTasks[0]!.title },
      });
      assert.ok(persistedTask, 'Task must exist in database after human approval');
      assert.equal(persistedTask.status, 'TODO');
      assert.equal(persistedTask.assigneeId, testUser.id);
    });
  });
});
