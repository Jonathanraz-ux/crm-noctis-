import { describe, expect, it } from 'vitest';
import { safeSortColumn } from './tasks.service';

describe('safeSortColumn (Tasks)', () => {
  it('allows valid sort columns', () => {
    expect(safeSortColumn('title')).toBe('title');
    expect(safeSortColumn('due_date')).toBe('due_date');
    expect(safeSortColumn('status')).toBe('status');
    expect(safeSortColumn('priority')).toBe('priority');
    expect(safeSortColumn('created_at')).toBe('created_at');
    expect(safeSortColumn('updated_at')).toBe('updated_at');
  });

  it('rejects invalid columns or SQL injection attempts and falls back to created_at', () => {
    expect(safeSortColumn('due_date; DROP TABLE tasks;--')).toBe('created_at');
    expect(safeSortColumn("title' OR '1'='1")).toBe('created_at');
    expect(safeSortColumn('random_junk')).toBe('created_at');
    expect(safeSortColumn(null)).toBe('created_at');
    expect(safeSortColumn(undefined)).toBe('created_at');
  });
});
