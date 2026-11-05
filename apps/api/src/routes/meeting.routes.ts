/**
 * @file routes/meeting.routes.ts
 *
 * Routes for Meeting Management & AI Meeting Intelligence.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createMeeting,
  getMeetings,
  getMeetingDetails,
  getMeetingAccessInfo,
  joinMeeting,
  leaveMeeting,
  getMeetingParticipants,
  updateMeetingNotes,
  postChatMessage,
  processMeetingIntelligence,
  approveTasks,
  uploadMeetingAudio,
  updateMeetingTranscript,
  getMeetingFollowThrough,
  sendMeetingFollowUpReminders,
} from '../controllers/meeting.controller.js';
import { audioUploadMiddleware } from '../middleware/audio-upload.js';

const router = Router();

router.use(requireAuth);

router.post('/', createMeeting);
router.get('/', getMeetings);
router.get('/:id', getMeetingDetails);
router.get('/:id/access', getMeetingAccessInfo);
router.get('/:id/follow-through', getMeetingFollowThrough);
router.post('/:id/follow-up-reminders', sendMeetingFollowUpReminders);
router.post('/:id/join', joinMeeting);
router.post('/:id/leave', leaveMeeting);
router.get('/:id/participants', getMeetingParticipants);
router.put('/:id/notes', updateMeetingNotes);
router.post('/:id/transcript/audio', audioUploadMiddleware.single('audio'), uploadMeetingAudio);
router.put('/:id/transcript', updateMeetingTranscript);
router.post('/:id/chat', postChatMessage);
router.post('/:id/process', processMeetingIntelligence);
router.post('/:id/approve-tasks', approveTasks);

export default router;
