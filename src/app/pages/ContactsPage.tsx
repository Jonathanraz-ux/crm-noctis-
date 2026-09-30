import { useState, useCallback } from 'react';
import { Download, Plus, Search } from 'lucide-react';

import { DataTable, type Column } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useContacts, useDeleteContact } from '@/features/contacts/contacts.hooks';
import { ContactModal } from '@/features/contacts/ContactModal';
import type { Contact } from '@/lib/types/database';
import { formatDate } from '@/lib/format';
import { exportCsv } from '@/lib/csv';
import { toErrorMessage } from '@/lib/errors';

export function ContactsPage() {
  const { activeOrganizationId } = useAuth();
  const orgId = activeOrganizationId ?? '';
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const { data, isLoading } = useContacts({
    organizationId: orgId,
    search,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteContact();

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
      success('Contact deleted');
    } catch (caught) {
      toastError('Delete failed', toErrorMessage(caught));
    }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    if (!data?.contacts?.length) return;
    exportCsv(data.contacts, `contacts-${new Date().toISOString().slice(0, 10)}.csv`, [
      'name',
      'email',
      'phone',
      'company',
      'job_title',
      'created_at',
    ]);
  };

  const columns: Column<Contact>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'company', header: 'Company', sortable: true },
    { key: 'job_title', header: 'Title', sortable: true },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => <span className="text-foreground-muted">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Contacts" description="Manage your customer and partner contacts.">
        <Button leftIcon={<Download className="size-4" />} variant="secondary" onClick={handleExport}>
          Export
        </Button>
        <Button
          leftIcon={<Plus className="size-4" />}
          onClick={() => {
            setEditingContact(null);
            setModalOpen(true);
          }}
        >
          Add Contact
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="max-w-sm">
        <NoctisField
          type="search"
          placeholder="Search contacts..."
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
          leadingElement={<Search className="size-4 text-foreground-subtle" />}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.contacts ?? []}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={setPage}
        emptyTitle="No contacts yet"
        emptyDescription="Add your first contact to build your network."
        emptyAction={
          <Button
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() => {
              setEditingContact(null);
              setModalOpen(true);
            }}
          >
            Add Contact
          </Button>
        }
        onRowClick={(row) => {
          setEditingContact(row);
          setModalOpen(true);
        }}
      />

      <ContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={orgId}
        contact={editingContact}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete contact"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
