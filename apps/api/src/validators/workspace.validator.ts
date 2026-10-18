import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Workspace name is required' })
    .min(2, 'Workspace name must be at least 2 characters')
    .max(100, 'Workspace name cannot exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const InviteMemberSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']).optional(),
});

export const WorkspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const RemoveMemberParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  userId: z.string().uuid('Invalid user ID format'),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
