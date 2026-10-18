import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  workspaceId: z.string().uuid('Invalid workspace ID'),
  projectId: z.string().uuid().optional().nullable(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().optional(),
});

export const createDocument = async (req: Request, res: Response) => {
  try {
    const validatedData = createDocumentSchema.parse(req.body);
    const userId = req.user!.id; // Note: req.user has id, not userId

    // Verify workspace membership
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: validatedData.workspaceId } },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const document = await prisma.document.create({
      data: {
        title: validatedData.title,
        content: validatedData.content || '',
        workspaceId: validatedData.workspaceId,
        projectId: validatedData.projectId || null,
        creatorId: userId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      }
    });

    return res.status(201).json({ success: true, document });
  } catch (error) {
    logger.error('Error creating document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create document' });
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const userId = req.user!.id;

    if (!workspaceId || typeof workspaceId !== 'string') {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    const documents = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      }
    });

    return res.status(200).json({ success: true, documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        workspace: { select: { id: true } },
        creator: { select: { id: true, name: true, email: true } },
      }
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: document.workspaceId } },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    return res.status(200).json({ success: true, document });
  } catch (error) {
    logger.error('Error fetching document:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch document' });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const validatedData = updateDocumentSchema.parse(req.body);
    const userId = req.user!.id;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: document.workspaceId } },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    }

    // Prepare update payload ignoring undefined
    const updateData: any = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.content !== undefined) updateData.content = validatedData.content;

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
      }
    });

    return res.status(200).json({ success: true, document: updated });
  } catch (error) {
    logger.error('Error updating document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to update document' });
  }
};
