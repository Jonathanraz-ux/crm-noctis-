import { describe, expect, it } from 'vitest';
import { safeSortColumn } from './pipeline.service';

describe('safeSortColumn (Deals)', () => {
  it('allows valid sort columns', () => {
    expect(safeSortColumn('title')).toBe('title');
    expect(safeSortColumn('value')).toBe('value');
    expect(safeSortColumn('stage')).toBe('stage');
    expect(safeSortColumn('expected_close_date')).toBe('expected_close_date');
    expect(safeSortColumn('created_at')).toBe('created_at');
    expect(safeSortColumn('updated_at')).toBe('updated_at');
  });

  it('rejects SQL injection attempts and falls back to created_at', () => {
    expect(safeSortColumn('stage; DELETE FROM deals;--')).toBe('created_at');
    expect(safeSortColumn("title' OR 'a'='a")).toBe('created_at');
    expect(safeSortColumn('1 UNION SELECT null, null')).toBe('created_at');
  });
});
