import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Select } from '@/components/ui/primitives';
import { useAuth } from '@/providers/AuthProvider';
import {
  AUDIT_PAGE_SIZE,
  useAuditEntities,
  useAuditLog,
} from '@/features/audit/audit.hooks';
import { formatDate } from '@/lib/format';
import { toErrorMessage } from '@/lib/errors';

export function AuditPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useAuditLog(page, entity);
  const { data: entities } = useAuditEntities();

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((row) =>
      [row.actor_email, row.action, row.entity, row.entity_id]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(term)),
    );
  }, [data?.rows, search]);

  if (!can('audit.read')) {
    return (
      <div className="animate-fade-in space-y-4">
        <PageHeader
          title="Audit Log"
          description="Your role does not include permission to read the audit log."
        />
      </div>
    );
  }

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Audit Log"
        description="Append-only record of domain activity written by database triggers."
      />

      {error ? (
        <p
          role="alert"
          className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm"
        >
          {toErrorMessage(error, 'The audit log could not be loaded.')}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-foreground-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter current page by actor, action or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-surface border-border placeholder:text-foreground-muted focus:ring-primary h-9 w-full rounded-md border pr-3 pl-9 text-sm focus:ring-1 focus:outline-none"
          />
        </div>

        <Select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          className="h-9 text-xs sm:w-44"
        >
          <option value="all">All entities</option>
          {(entities ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-foreground-muted p-6 text-center text-sm">
            Loading audit entries...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-foreground-muted p-8 text-center text-sm">
            No audit records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-line bg-surface-subtle text-foreground-muted border-b text-xs font-semibold uppercase">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface-subtle/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          row.action === 'INSERT'
                            ? 'success'
                            : row.action === 'UPDATE'
                              ? 'default'
                              : 'danger'
                        }
                      >
                        {row.action}
                      </Badge>
                    </td>
                    <td className="text-foreground px-4 py-3 font-mono text-xs">
                      {row.entity}
                    </td>
                    <td className="text-foreground max-w-xs truncate px-4 py-3 text-xs">
                      {row.actor_email ?? 'System / Anonymous'}
                    </td>
                    <td className="text-foreground-muted max-w-xs truncate px-4 py-3 font-mono text-xs">
                      {row.entity_id ?? '—'}
                    </td>
                    <td className="text-foreground-muted px-4 py-3 text-xs">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > AUDIT_PAGE_SIZE && (
          <div className="border-line text-foreground-muted flex items-center justify-between border-t px-4 py-3 text-xs">
            <span>
              Page {page} of {lastPage} ({total} entries)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
