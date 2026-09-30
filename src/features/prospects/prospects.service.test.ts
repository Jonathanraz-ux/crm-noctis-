import { describe, expect, it } from 'vitest';
import { safeSortColumn } from './prospects.service';

describe('safeSortColumn (Prospects)', () => {
  it('allows valid sort columns', () => {
    expect(safeSortColumn('name')).toBe('name');
    expect(safeSortColumn('company')).toBe('company');
    expect(safeSortColumn('email')).toBe('email');
    expect(safeSortColumn('status')).toBe('status');
    expect(safeSortColumn('source')).toBe('source');
    expect(safeSortColumn('created_at')).toBe('created_at');
    expect(safeSortColumn('updated_at')).toBe('updated_at');
  });

  it('normalizes uppercase strings', () => {
    expect(safeSortColumn('NAME')).toBe('name');
    expect(safeSortColumn('  Status  ')).toBe('status');
  });

  it('falls back to created_at for missing values', () => {
    expect(safeSortColumn(null)).toBe('created_at');
    expect(safeSortColumn(undefined)).toBe('created_at');
    expect(safeSortColumn('')).toBe('created_at');
  });

  it('REJECTS SQL injection attempts and falls back to created_at', () => {
    expect(safeSortColumn('name; DROP TABLE prospects;--')).toBe('created_at');
    expect(safeSortColumn("name' OR 1=1--")).toBe('created_at');
    expect(safeSortColumn('id, password')).toBe('created_at');
    expect(safeSortColumn('(SELECT 1)')).toBe('created_at');
    expect(safeSortColumn('1; SELECT pg_sleep(5);--')).toBe('created_at');
  });
});
