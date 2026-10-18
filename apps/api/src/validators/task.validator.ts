import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';

export const CreateTaskSchema = z.object({
  title: z
    .string({ required_error: 'Task title is required' })
    .min(1, 'Task title cannot be empty')
    .max(200, 'Task title cannot exceed 200 characters'),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .nullable(),
  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO datetime' })
    .transform((val) => new Date(val))
    .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: 'Due date cannot be in the past',
    })
    .optional()
    .nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  projectId: z.string({ required_error: 'Project ID is required' }).uuid('Invalid project ID format'),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ projectId: true });

export const ListTasksQuerySchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format').optional(),
  projectId: z.string().uuid('Invalid project ID format').optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional().or(z.literal('UNASSIGNED')),
  unassigned: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional(),
  sortBy: z.enum(['dueDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const CreateTaskCommentSchema = z.object({
  content: z
    .string({ required_error: 'Comment content is required' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters'),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;
