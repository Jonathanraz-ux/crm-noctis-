import { useState, useCallback } from 'react';
import { Download, Plus, Search } from 'lucide-react';

import { DataTable, type Column } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import {
  ProspectStatusBadge,
  ProspectSourceBadge,
} from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { Label, Select } from '@/components/ui/primitives';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import {
  useProspects,
  useDeleteProspect,
} from '@/features/prospects/prospects.hooks';
import { ProspectModal } from '@/features/prospects/ProspectModal';
import type { Prospect } from '@/lib/types/database';
import { formatDate } from '@/lib/format';
import { exportCsv } from '@/lib/csv';
import { toErrorMessage } from '@/lib/errors';
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCES,
  PROSPECT_SOURCE_LABELS,
  type ProspectStatus,
  type ProspectSource,
} from '@/config/product';

export function ProspectsPage() {
  const { activeOrganizationId } = useAuth();
  const orgId = activeOrganizationId ?? '';
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Prospect | null>(null);

  const { data, isLoading } = useProspects({
    organizationId: orgId,
    search,
    status: statusFilter,
    source: sourceFilter,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteProspect();

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
      await deleteMutation.mutateAsync({
        organizationId: orgId,
        id: deleteTarget.id,
      });
      success('Prospect deleted');
    } catch (caught) {
      toastError('Delete failed', toErrorMessage(caught));
    }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    if (!data?.prospects?.length) return;
    exportCsv(
      data.prospects,
      `prospects-${new Date().toISOString().slice(0, 10)}.csv`,
      ['name', 'company', 'email', 'phone', 'status', 'source', 'created_at'],
    );
  };

  const columns: Column<Prospect>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'company', header: 'Company', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <ProspectStatusBadge status={row.status as ProspectStatus} />
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row) => (
        <ProspectSourceBadge source={row.source as ProspectSource} />
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-foreground-muted">
          {formatDate(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Prospects"
        description="Manage your sales leads and prospective accounts."
      >
        <Button
          leftIcon={<Download className="size-4" />}
          variant="secondary"
          onClick={handleExport}
        >
          Export
        </Button>
        <Button
          leftIcon={<Plus className="size-4" />}
          onClick={() => {
            setEditingProspect(null);
            setModalOpen(true);
          }}
        >
          Add Prospect
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="max-w-sm flex-1">
          <NoctisField
            type="search"
            placeholder="Search prospects..."
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            clearable
            onClear={() => {
              setSearch('');
              setPage(1);
            }}
            leadingElement={
              <Search className="text-foreground-subtle size-4" />
            }
          />
        </div>
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label
              htmlFor="status-filter"
              className="text-[10px] tracking-wider uppercase"
            >
              Status
            </Label>
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROSPECT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="source-filter"
              className="text-[10px] tracking-wider uppercase"
            >
              Source
            </Label>
            <Select
              id="source-filter"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All sources</option>
              {PROSPECT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {PROSPECT_SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.prospects ?? []}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={setPage}
        emptyTitle="No prospects yet"
        emptyDescription="Add your first prospect to start tracking leads."
        emptyAction={
          <Button
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() => {
              setEditingProspect(null);
              setModalOpen(true);
            }}
          >
            Add Prospect
          </Button>
        }
        onRowClick={(row) => {
          setEditingProspect(row);
          setModalOpen(true);
        }}
      />

      <ProspectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={orgId}
        prospect={editingProspect}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete prospect"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
