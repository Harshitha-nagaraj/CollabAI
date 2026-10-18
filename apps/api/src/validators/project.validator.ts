import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name cannot exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(10, 'Project key cannot exceed 10 characters')
    .optional()
    .nullable(),
  status: z
    .enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .optional(),
  workspaceId: z
    .string({ required_error: 'Workspace ID is required' })
    .uuid('Invalid workspace ID format'),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true });

export const ListProjectsQuerySchema = z.object({
  workspaceId: z
    .string({ required_error: 'Workspace ID is required' })
    .uuid('Invalid workspace ID format'),
  search: z.string().optional(),
  status: z
    .enum(['ALL', 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'ACTIVE'])
    .optional(),
});

export const ProjectIdParamSchema = z.object({
  id: z.string().uuid('Invalid project ID format'),
});

export const ListProjectActivityQuerySchema = z.object({
  cursor: z.string().uuid('Invalid cursor format').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;
export type ListProjectActivityQuery = z.infer<typeof ListProjectActivityQuerySchema>;
