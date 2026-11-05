/**
 * @file controllers/meeting.controller.ts
 *
 * Controllers for Meeting Management & AI Meeting Intelligence.
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { MeetingService } from '../services/meeting.service.js';
import { TranscriptionService } from '../services/transcription.service.js';

/**
 * Helper to verify workspace membership
 */
async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
  return !!membership;
}

export async function createMeeting(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, type, startTime, endTime, workspaceId, participantIds } = req.body;

    if (!title || !startTime || !endTime || !workspaceId) {
      res.status(400).json({ error: 'Title, startTime, endTime, and workspaceId are required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const meeting = await MeetingService.createMeeting({
      title,
      description,
      type,
      startTime,
      endTime,
      workspaceId,
      creatorId: userId,
      participantIds,
    });

    res.status(201).json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create meeting' });
  }
}

export async function getMeetings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const meetings = await MeetingService.getWorkspaceMeetings(workspaceId);
    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
  }
}

export async function getMeetingDetails(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { workspaceId } = req.query;

    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const meetingId = (Array.isArray(id) ? id[0] : id) || '';
    const meeting = await MeetingService.getMeetingDetails(meetingId, workspaceId);
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch meeting details' });
  }
}

export async function getMeetingAccessInfo(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { workspaceId } = req.query;

    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(user.id, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const meetingId = (Array.isArray(id) ? id[0] : id) || '';
    const access = await MeetingService.getMeetingAccess(meetingId, workspaceId, {
      id: user.id,
      name: user.name || undefined,
      email: user.email,
    });

    res.json(access);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to fetch meeting access info' });
  }
}

export async function joinMeeting(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const rawWorkspaceId = req.body?.workspaceId || (req.query?.workspaceId as string);
    const workspaceId = typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : '';
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const participant = await MeetingService.joinMeeting(meetingId, userId, workspaceId);
    res.status(200).json(participant);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to join meeting' });
  }
}

export async function leaveMeeting(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const rawWorkspaceId = req.body?.workspaceId || (req.query?.workspaceId as string);
    const workspaceId = typeof rawWorkspaceId === 'string' ? rawWorkspaceId.trim() : '';
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const result = await MeetingService.leaveMeeting(meetingId, userId, workspaceId);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to leave meeting' });
  }
}

export async function getMeetingParticipants(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { workspaceId } = req.query;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const participants = await MeetingService.getMeetingParticipants(meetingId, workspaceId);
    res.json(participants);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch meeting participants' });
  }
}

export async function updateMeetingNotes(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { workspaceId, notes } = req.body;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    if (notes === undefined) {
      res.status(400).json({ error: 'notes content is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const result = await MeetingService.updateMeetingNotes(meetingId, userId, workspaceId, notes);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update meeting notes' });
  }
}

export async function postChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { message, workspaceId } = req.body;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!message) {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    if (workspaceId) {
      const hasAccess = await isWorkspaceMember(userId, workspaceId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
        return;
      }
    }

    const chat = await MeetingService.postChatMessage(meetingId, userId, message);
    res.status(201).json(chat);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post chat message' });
  }
}

export async function processMeetingIntelligence(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { workspaceId, transcript, notes } = req.body;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      select: { id: true, creatorId: true },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Only meeting host (creator) or workspace OWNER/ADMIN can end meeting for everyone
    const isHostOrAdmin =
      meeting.creatorId === userId ||
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN';

    if (!isHostOrAdmin) {
      res.status(403).json({
        error: 'Forbidden: Only the meeting host or workspace admin can end this meeting for everyone.',
      });
      return;
    }

    // Persist final collaborative notes if provided so no notes data is lost
    if (typeof notes === 'string' && notes.trim().length > 0) {
      await MeetingService.updateMeetingNotes(meetingId, userId, workspaceId, notes);
    }

    const result = await MeetingService.processMeetingIntelligence(meetingId, workspaceId, transcript, notes);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process meeting intelligence' });
  }
}

export async function approveTasks(req: Request, res: Response): Promise<void> {
  try {
    const creatorId = req.user!.id;
    const { id } = req.params;
    const { workspaceId, projectId, tasks } = req.body;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId || !projectId || !Array.isArray(tasks)) {
      res.status(400).json({ error: 'workspaceId, projectId, and tasks array are required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(creatorId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const createdTasks = await MeetingService.approveTasks({
      meetingId,
      workspaceId,
      projectId,
      creatorId,
      tasks,
    });

    res.json({ message: 'Tasks approved and created successfully', tasks: createdTasks });
  } catch (error: any) {
    const statusCode = error.statusCode || (error.name === 'ForbiddenError' ? 403 : 500);
    res.status(statusCode).json({ error: error.message || 'Failed to approve tasks' });
  }
}

export async function uploadMeetingAudio(req: Request, res: Response): Promise<void> {
  const file = req.file;
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const workspaceId = req.body.workspaceId || req.query.workspaceId;
    const consentConfirmed =
      req.body.consentConfirmed === true ||
      req.body.consentConfirmed === 'true' ||
      req.body.consentConfirmed === '1';
    const model = req.body.model;
    const language = req.body.language;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!file) {
      res.status(400).json({ error: 'Audio file is required.' });
      return;
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      TranscriptionService.cleanupTempFile(file.path);
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    if (!consentConfirmed) {
      TranscriptionService.cleanupTempFile(file.path);
      res.status(400).json({
        error: 'Participant consent must be confirmed before processing meeting audio recordings.',
      });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      TranscriptionService.cleanupTempFile(file.path);
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const result = await MeetingService.transcribeMeetingAudio({
      meetingId,
      workspaceId,
      userId,
      filePath: file.path,
      consentConfirmed,
      model,
      language,
    });

    res.status(200).json({
      message: 'Meeting audio transcribed successfully',
      ...result,
    });
  } catch (error: any) {
    if (file?.path) {
      TranscriptionService.cleanupTempFile(file.path);
    }
    const statusCode =
      error.statusCode ||
      (error.name === 'ForbiddenError'
        ? 403
        : error.name === 'NotFoundError'
        ? 404
        : error.name === 'BadRequestError'
        ? 400
        : 500);
    res.status(statusCode).json({ error: error.message || 'Failed to transcribe meeting audio' });
  }
}

export async function updateMeetingTranscript(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { workspaceId, transcript } = req.body;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    if (transcript === undefined) {
      res.status(400).json({ error: 'transcript is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const result = await MeetingService.updateMeetingTranscript({
      meetingId,
      workspaceId,
      userId,
      transcript,
    });

    res.status(200).json({
      message: 'Meeting transcript updated successfully',
      ...result,
    });
  } catch (error: any) {
    const statusCode =
      error.statusCode ||
      (error.name === 'ForbiddenError'
        ? 403
        : error.name === 'NotFoundError'
        ? 404
        : error.name === 'BadRequestError'
        ? 400
        : 500);
    res.status(statusCode).json({ error: error.message || 'Failed to update meeting transcript' });
  }
}

export async function getMeetingFollowThrough(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const workspaceId = (req.query.workspaceId as string) || (req.body?.workspaceId as string);
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const followThrough = await MeetingService.getMeetingFollowThrough(meetingId, workspaceId);
    res.json(followThrough);
  } catch (error: any) {
    const statusCode = error.statusCode || (error.name === 'NotFoundError' ? 404 : 500);
    res.status(statusCode).json({ error: error.message || 'Failed to fetch meeting follow-through' });
  }
}

export async function sendMeetingFollowUpReminders(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { workspaceId } = req.body;
    const meetingId = (Array.isArray(id) ? id[0] : id) || '';

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required in request body.' });
      return;
    }

    const hasAccess = await isWorkspaceMember(userId, workspaceId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
      return;
    }

    const result = await MeetingService.sendFollowUpReminders(meetingId, workspaceId, userId);
    res.json(result);
  } catch (error: any) {
    const statusCode =
      error.statusCode ||
      (error.name === 'ForbiddenError'
        ? 403
        : error.name === 'NotFoundError'
        ? 404
        : 500);
    res.status(statusCode).json({ error: error.message || 'Failed to send follow-up reminders' });
  }
}
