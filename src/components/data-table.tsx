import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string } & Record<string, unknown>>({
  columns,
  data,
  loading = false,
  sortBy,
  sortOrder = 'desc',
  onSort,
  page = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your criteria.',
  emptyAction,
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const fromIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const toIndex = Math.min(page * pageSize, totalCount);

  return (
    <Card className="overflow-hidden border-line">
      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-foreground-muted font-medium select-none">
              {columns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'px-4 py-3 font-semibold uppercase tracking-wider text-[11px]',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable && 'cursor-pointer hover:text-foreground',
                      col.className,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'justify-end w-full',
                        col.align === 'center' && 'justify-center w-full',
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable ? (
                        <span className="text-foreground-subtle">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp size={14} className="text-primary" />
                            ) : (
                              <ChevronDown size={14} className="text-primary" />
                            )
                          ) : (
                            <ChevronDown size={14} className="opacity-0 group-hover:opacity-100" />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface text-foreground">
            {loading ? (
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 rounded-sm bg-surface-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
                  <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
                    {emptyDescription}
                  </p>
                  {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-surface-subtle',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3.5 align-middle',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : (row[col.key] as ReactNode) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && onPageChange ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 py-3 bg-surface-subtle text-xs text-foreground-muted">
          <div>
            Showing <span className="font-medium text-foreground">{fromIndex}</span> to{' '}
            <span className="font-medium text-foreground">{toIndex}</span> of{' '}
            <span className="font-medium text-foreground">{totalCount}</span> results
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="First page"
            >
              <ChevronsLeft size={14} />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2 text-xs font-medium tabular">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Last page"
            >
              <ChevronsRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
