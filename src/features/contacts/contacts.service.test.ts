import { describe, expect, it } from 'vitest';
import { safeSortColumn } from './contacts.service';

describe('safeSortColumn (Contacts)', () => {
  it('allows valid sort columns', () => {
    expect(safeSortColumn('name')).toBe('name');
    expect(safeSortColumn('email')).toBe('email');
    expect(safeSortColumn('phone')).toBe('phone');
    expect(safeSortColumn('job_title')).toBe('job_title');
    expect(safeSortColumn('company')).toBe('company');
    expect(safeSortColumn('created_at')).toBe('created_at');
    expect(safeSortColumn('updated_at')).toBe('updated_at');
  });

  it('rejects SQL injection attempts and falls back to created_at', () => {
    expect(safeSortColumn('email; DROP TABLE contacts;--')).toBe('created_at');
    expect(safeSortColumn("name' OR '1'='1")).toBe('created_at');
    expect(safeSortColumn('SELECT pg_sleep(1)')).toBe('created_at');
  });
});
