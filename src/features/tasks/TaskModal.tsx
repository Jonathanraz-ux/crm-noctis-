import { NoctisField } from '@/components/noctis-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label, Select, Textarea } from '@/components/ui/primitives';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from '@/config/product';
import type { Task } from '@/lib/types/database';
import { taskSchema, type TaskInput } from '@/lib/validation';
import { toErrorMessage } from '@/lib/errors';
import { useToast } from '@/providers/ToastProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useCreateTask, useUpdateTask } from './tasks.hooks';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  task?: Task | null;
}

export function TaskModal({
  open,
  onOpenChange,
  organizationId,
  task,
}: TaskModalProps) {
  const { success, error: toastError } = useToast();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const isEditing = Boolean(task);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      status: 'pending',
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ?? '',
        status: task.status,
        priority: task.priority,
        assignee_id: task.assignee_id ?? undefined,
        prospect_id: task.prospect_id ?? undefined,
        contact_id: task.contact_id ?? undefined,
        deal_id: task.deal_id ?? undefined,
      });
    } else {
      reset({
        title: '',
        description: '',
        due_date: '',
        status: 'pending',
        priority: 'medium',
      });
    }
  }, [task, reset, open]);

  const onSubmit = async (data: TaskInput) => {
    try {
      if (isEditing && task) {
        await updateMutation.mutateAsync({
          organizationId,
          id: task.id,
          input: data,
        });
        success('Task updated successfully');
      } else {
        await createMutation.mutateAsync({
          organizationId,
          input: data,
        });
        success('Task created successfully');
      }
      onOpenChange(false);
    } catch (caught) {
      toastError('Failed to save task', toErrorMessage(caught));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this task's details."
              : 'Create a new task for your team.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <NoctisField
                label="Title"
                required
                placeholder="e.g. Follow up with client"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.title?.message}
              />
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    id="task-status"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select
                    id="task-priority"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>

            <Controller
              name="due_date"
              control={control}
              render={({ field }) => (
                <NoctisField
                  type="text"
                  label="Due Date"
                  placeholder="YYYY-MM-DD"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="task-desc"
                  placeholder="Detailed description of the task..."
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
