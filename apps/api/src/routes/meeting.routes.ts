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
} from '../controllers/meeting.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', createMeeting);
router.get('/', getMeetings);
router.get('/:id', getMeetingDetails);
router.get('/:id/access', getMeetingAccessInfo);
router.post('/:id/join', joinMeeting);
router.post('/:id/leave', leaveMeeting);
router.get('/:id/participants', getMeetingParticipants);
router.put('/:id/notes', updateMeetingNotes);
router.post('/:id/chat', postChatMessage);
router.post('/:id/process', processMeetingIntelligence);
router.post('/:id/approve-tasks', approveTasks);

export default router;
