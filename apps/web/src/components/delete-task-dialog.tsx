'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useDeleteTask } from '@/lib/queries/tasks';
import { useToast } from '@/components/ui/toast';

interface DeleteTaskDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string | null;
  taskTitle: string;
}

export function DeleteTaskDialog({ open, onClose, taskId, taskTitle }: DeleteTaskDialogProps) {
  const { mutateAsync, isPending } = useDeleteTask();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await mutateAsync(taskId);
      toast('Task deleted successfully', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to delete task', 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete Task" maxWidth="max-w-sm">
      <p className="text-sm text-zinc-400">
        Are you sure you want to delete{' '}
        <span className="font-medium text-zinc-200">&ldquo;{taskTitle}&rdquo;</span>?
        This action cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} loading={isPending}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}
