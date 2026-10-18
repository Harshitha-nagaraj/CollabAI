'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MemberSelector } from '@/components/member-selector';
import type { Task } from '@/types';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().optional().or(z.literal('')),
  assigneeId: z.string().optional().or(z.literal('')),
  projectId: z.string().min(1, 'Project is required'),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  defaultValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
  task?: Task | null;
  projects?: { id: string; name: string }[];
  members?: { userId: string; name: string | null; email: string; avatarUrl?: string | null }[];
  showProjectField?: boolean;
}

const statusOptions = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export function TaskForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save',
  projects = [],
  members = [],
  showProjectField = true,
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '',
      assigneeId: '',
      projectId: '',
      ...defaultValues,
    },
  });

  const selectedAssigneeId = watch('assigneeId');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
      <Input
        label="Title"
        placeholder="e.g. Implement user authentication flow"
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[#1C2421]">Description</label>
        <textarea
          rows={3}
          placeholder="Details, technical specifications, or acceptance criteria..."
          className="w-full rounded-lg border border-[#E2DCD2] bg-white px-3 py-2 text-xs text-[#1C2421] placeholder:text-[#525B56]/70 focus:border-[#1F4D3A] focus:outline-none focus:ring-1 focus:ring-[#1F4D3A] resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-[#C93B3B]">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Status"
          options={statusOptions}
          error={errors.status?.message}
          {...register('status')}
        />
        <Select
          label="Priority"
          options={priorityOptions}
          error={errors.priority?.message}
          {...register('priority')}
        />
      </div>

      <Input
        label="Due Date"
        type="datetime-local"
        error={errors.dueDate?.message}
        {...register('dueDate')}
      />

      {showProjectField && (
        <Select
          label="Project"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="Select project..."
          error={errors.projectId?.message}
          {...register('projectId')}
        />
      )}

      {/* Searchable Workspace Member Selector */}
      <div>
        <MemberSelector
          label="Assignee"
          members={members}
          value={selectedAssigneeId || null}
          onChange={(val) => setValue('assigneeId', val || '', { shouldValidate: true })}
          placeholder="Unassigned"
        />
        {errors.assigneeId && (
          <p className="mt-1 text-xs text-[#C93B3B]">{errors.assigneeId.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-[#E2DCD2]">
        <Button
          type="submit"
          loading={isLoading}
          variant="primary"
          size="sm"
          className="bg-[#1F4D3A] text-white hover:bg-[#163E32]"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
