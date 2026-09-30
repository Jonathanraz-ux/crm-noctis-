import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  deleteTask,
  listTasks,
  type ListTasksParams,
  toggleTaskStatus,
  updateTask,
} from './tasks.service';
import type { Task } from '@/lib/types/database';
import type { TaskInput } from '@/lib/validation';

export function useTasks(params: ListTasksParams) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => listTasks(params),
    enabled: Boolean(params.organizationId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: TaskInput;
    }) => createTask(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      input,
    }: {
      organizationId: string;
      id: string;
      input: Partial<TaskInput>;
    }) => updateTask(organizationId, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      currentStatus,
    }: {
      organizationId: string;
      id: string;
      currentStatus: Task['status'];
    }) => toggleTaskStatus(organizationId, id, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
    }: {
      organizationId: string;
      id: string;
    }) => deleteTask(organizationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
