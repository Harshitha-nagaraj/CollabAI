'use client';

import { Modal } from '@/components/ui/modal';
import { TaskForm, type TaskFormValues } from '@/components/task-form';
import { useUpdateTask } from '@/lib/queries/tasks';
import { useToast } from '@/components/ui/toast';
import type { Task } from '@/types';

interface EditTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  projects?: { id: string; name: string }[];
  members?: { userId: string; name: string | null; email: string }[];
}

export function EditTaskModal({ open, onClose, task, projects = [], members = [] }: EditTaskModalProps) {
  const { mutateAsync, isPending } = useUpdateTask(task?.id || '');
  const { toast } = useToast();

  if (!task) return null;

  const handleSubmit = async (values: TaskFormValues) => {
    try {
      await mutateAsync({
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate || null,
        assigneeId: values.assigneeId || null,
      });
      toast('Task updated successfully', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to update task', 'error');
    }
  };

  const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '';

  return (
    <Modal open={open} onClose={onClose} title="Edit Task">
      <TaskForm
        defaultValues={{
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate,
          assigneeId: task.assigneeId || '',
          projectId: task.projectId,
        }}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel="Update Task"
        projects={projects}
        members={members}
        showProjectField={false}
      />
    </Modal>
  );
}
