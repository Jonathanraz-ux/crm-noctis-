import { describe, expect, it } from 'vitest';
import { escapeCsvField, safeFilename, toCsv } from './csv';

describe('escapeCsvField', () => {
  it('leaves simple alphanumeric strings unquoted', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField('12345')).toBe('12345');
    expect(escapeCsvField('Alpha_Beta-1')).toBe('Alpha_Beta-1');
  });

  it('handles null and undefined as empty strings', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('quotes fields with commas', () => {
    expect(escapeCsvField('Doe, John')).toBe('"Doe, John"');
  });

  it('quotes fields with semicolons', () => {
    expect(escapeCsvField('Item 1; Item 2')).toBe('"Item 1; Item 2"');
  });

  it('escapes and doubles internal quotes', () => {
    expect(escapeCsvField('The "Great" Deal')).toBe('"The ""Great"" Deal"');
  });

  it('quotes fields with newlines', () => {
    expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    expect(escapeCsvField('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"');
  });

  it('quotes fields with leading or trailing whitespace', () => {
    expect(escapeCsvField('  spaced  ')).toBe('"  spaced  "');
  });

  it('formats dates as ISO strings', () => {
    const d = new Date('2026-09-29T10:00:00.000Z');
    expect(escapeCsvField(d)).toBe('2026-09-29T10:00:00.000Z');
  });
});

describe('toCsv', () => {
  it('builds RFC 4180 standard CRLF documents', () => {
    const headers = ['Name', 'Company', 'Value'];
    const rows = [
      ['Alice', 'Acme', 50000],
      ['Bob, Jr.', 'Beta "Corp"', 12000],
    ];
    const csv = toCsv(headers, rows);
    expect(csv).toBe('Name,Company,Value\r\nAlice,Acme,50000\r\n"Bob, Jr.","Beta ""Corp""",12000');
  });

  it('adds UTF-8 BOM when requested', () => {
    const csv = toCsv(['Nom'], [['Élise']], { bom: true });
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });
});

describe('safeFilename', () => {
  it('strips special characters and normalizes spaces', () => {
    expect(safeFilename('Prospects Export (2026/09/29)!')).toBe('prospects-export-20260929');
    expect(safeFilename('  deals___Q3 report  ')).toBe('deals___q3-report');
  });
});
