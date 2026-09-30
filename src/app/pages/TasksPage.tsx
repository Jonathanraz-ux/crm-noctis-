import { useState, useCallback } from 'react';
import { Download, Plus, Search, CheckCircle2, Circle } from 'lucide-react';

import { DataTable, type Column } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/primitives';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTasks, useDeleteTask, useToggleTaskStatus } from '@/features/tasks/tasks.hooks';
import { TaskModal } from '@/features/tasks/TaskModal';
import type { Task } from '@/lib/types/database';
import { formatDate } from '@/lib/format';
import { exportCsv } from '@/lib/csv';
import { toErrorMessage } from '@/lib/errors';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskStatus,
  type TaskPriority,
} from '@/config/product';

export function TasksPage() {
  const { activeOrganizationId } = useAuth();
  const orgId = activeOrganizationId ?? '';
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const { data, isLoading } = useTasks({
    organizationId: orgId,
    search,
    status: statusFilter,
    priority: priorityFilter,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteTask();
  const toggleMutation = useToggleTaskStatus();

  const handleSort = useCallback((key: string) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return key;
    });
    setPage(1);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ organizationId: orgId, id: deleteTarget.id });
      success('Task deleted');
    } catch (caught) {
      toastError('Delete failed', toErrorMessage(caught));
    }
    setDeleteTarget(null);
  };

  const handleToggle = async (task: Task) => {
    try {
      await toggleMutation.mutateAsync({
        organizationId: orgId,
        id: task.id,
        currentStatus: task.status,
      });
      success(task.status === 'completed' ? 'Task marked pending' : 'Task completed');
    } catch (caught) {
      toastError('Update failed', toErrorMessage(caught));
    }
  };

  const handleExport = () => {
    if (!data?.tasks?.length) return;
    exportCsv(data.tasks, `tasks-${new Date().toISOString().slice(0, 10)}.csv`, [
      'title',
      'description',
      'status',
      'priority',
      'due_date',
      'created_at',
    ]);
  };

  const columns: Column<Task>[] = [
    {
      key: 'status_toggle',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(row);
          }}
          className="text-foreground-muted hover:text-primary transition-colors cursor-pointer"
          title={row.status === 'completed' ? 'Mark pending' : 'Mark completed'}
        >
          {row.status === 'completed' ? (
            <CheckCircle2 className="size-5 text-emerald-500" />
          ) : (
            <Circle className="size-5" />
          )}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className={`font-medium ${row.status === 'completed' ? 'line-through text-foreground-muted' : 'text-foreground'}`}>
            {row.title}
          </span>
          {row.description && (
            <span className="text-xs text-foreground-muted truncate max-w-xs">{row.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <TaskStatusBadge status={row.status as TaskStatus} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (row) => <TaskPriorityBadge priority={row.priority as TaskPriority} />,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (row) => {
        if (!row.due_date) return <span className="text-foreground-muted">-</span>;
        const isOverdue =
          row.status !== 'completed' && new Date(row.due_date).getTime() < Date.now();
        return (
          <span className={isOverdue ? 'text-rose-500 font-medium' : 'text-foreground-muted'}>
            {formatDate(row.due_date)}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => <span className="text-foreground-muted">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setEditingTask(row);
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-500 hover:text-rose-600"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Tasks" description="Track follow-ups, calls, and actions across your team.">
        <Button leftIcon={<Download className="size-4" />} variant="secondary" onClick={handleExport}>
          Export
        </Button>
        <Button
          leftIcon={<Plus className="size-4" />}
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
        >
          New Task
        </Button>
      </PageHeader>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-border text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-foreground-muted whitespace-nowrap">Status:</Label>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="all">All Statuses</option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-foreground-muted whitespace-nowrap">Priority:</Label>
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="all">All Priorities</option>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.tasks ?? []}
        loading={isLoading}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onRowClick={(row) => {
          setEditingTask(row);
          setModalOpen(true);
        }}
      />

      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={orgId}
        task={editingTask}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
