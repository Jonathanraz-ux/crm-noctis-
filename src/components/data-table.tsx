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
    <Card className="border-line overflow-hidden">
      <div className="scrollbar-slim overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-line bg-surface-subtle text-foreground-muted border-b font-medium select-none">
              {columns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold tracking-wider uppercase',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable && 'hover:text-foreground cursor-pointer',
                      col.className,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'w-full justify-end',
                        col.align === 'center' && 'w-full justify-center',
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
                            <ChevronDown
                              size={14}
                              className="opacity-0 group-hover:opacity-100"
                            />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-line bg-surface text-foreground divide-y">
            {loading ? (
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map(
                (_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <div className="bg-surface-muted h-4 w-3/4 rounded-sm" />
                      </td>
                    ))}
                  </tr>
                ),
              )
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <p className="text-foreground text-sm font-semibold">
                    {emptyTitle}
                  </p>
                  <p className="text-foreground-muted mx-auto mt-1 max-w-sm text-xs">
                    {emptyDescription}
                  </p>
                  {emptyAction ? (
                    <div className="mt-4">{emptyAction}</div>
                  ) : null}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'hover:bg-surface-subtle transition-colors',
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
                      {col.render
                        ? col.render(row)
                        : ((row[col.key] as ReactNode) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && onPageChange ? (
        <div className="border-line bg-surface-subtle text-foreground-muted flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs sm:flex-row">
          <div>
            Showing{' '}
            <span className="text-foreground font-medium">{fromIndex}</span> to{' '}
            <span className="text-foreground font-medium">{toIndex}</span> of{' '}
            <span className="text-foreground font-medium">{totalCount}</span>{' '}
            results
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
            <span className="tabular px-2 text-xs font-medium">
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
