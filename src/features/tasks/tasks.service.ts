import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types/database';
import type { TaskInput } from '@/lib/validation';

export const TASK_SORT_COLUMNS = [
  'title',
  'due_date',
  'status',
  'priority',
  'created_at',
  'updated_at',
] as const;

export type TaskSortColumn = (typeof TASK_SORT_COLUMNS)[number];

export function safeSortColumn(column: string | undefined | null): TaskSortColumn {
  if (!column) return 'created_at';
  const clean = column.trim().toLowerCase();
  if (TASK_SORT_COLUMNS.includes(clean as TaskSortColumn)) {
    return clean as TaskSortColumn;
  }
  return 'created_at';
}

export interface ListTasksParams {
  organizationId: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  prospectId?: string;
  dealId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listTasks({
  organizationId,
  status,
  priority,
  assigneeId,
  prospectId,
  dealId,
  search,
  sortBy = 'created_at',
  sortOrder = 'desc',
  page = 1,
  pageSize = 50,
}: ListTasksParams) {
  const safeSort = safeSortColumn(sortBy);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tasks')
    .select('*, prospects(name, company), deals(title)', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (status && status !== 'all') {
    query = query.eq('status', status as Task['status']);
  }

  if (priority && priority !== 'all') {
    query = query.eq('priority', priority as Task['priority']);
  }

  if (assigneeId) {
    query = query.eq('assignee_id', assigneeId);
  }

  if (prospectId) {
    query = query.eq('prospect_id', prospectId);
  }

  if (dealId) {
    query = query.eq('deal_id', dealId);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.ilike('title', `%${term}%`);
  }

  query = query.order(safeSort, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    tasks: (data ?? []) as (Task & {
      prospects?: { name: string; company: string | null } | null;
      deals?: { title: string } | null;
    })[],
    totalCount: count ?? 0,
  };
}

export async function createTask(organizationId: string, input: TaskInput) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: organizationId,
      title: input.title,
      description: input.description,
      due_date: input.due_date,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assignee_id,
      prospect_id: input.prospect_id,
      contact_id: input.contact_id,
      deal_id: input.deal_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(
  organizationId: string,
  id: string,
  input: Partial<TaskInput>,
) {
  const { data, error } = await supabase
    .from('tasks')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function toggleTaskStatus(
  organizationId: string,
  id: string,
  currentStatus: Task['status'],
) {
  const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: nextStatus })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(organizationId: string, id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);

  if (error) throw error;
}
