/**
 * RFC 4180 compliant CSV generation and download.
 *
 * Used by Prospects, Contacts, and Deals table export and by "Export CSV" actions.
 */

export type CsvValue = string | number | boolean | Date | null | undefined;

/**
 * Quote a single field.
 *
 * Wraps in double quotes when the value contains a delimiter, a quote, a
 * newline, or leading/trailing whitespace, and doubles any embedded quote.
 */
export function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  const needsQuotes =
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text.includes(';') ||
    text !== text.trim();
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV document.
 */
export function toCsv(
  headers: string[],
  rows: CsvValue[][],
  options: { delimiter?: string; bom?: boolean } = {},
): string {
  const delimiter = options.delimiter ?? ',';
  const lines = [
    headers.map(escapeCsvField).join(delimiter),
    ...rows.map((row) => row.map(escapeCsvField).join(delimiter)),
  ];
  return (options.bom ? '\uFEFF' : '') + lines.join('\r\n');
}

/** Trigger a browser download of a generated CSV. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Make a filename safe on Windows, macOS and Linux. */
export function safeFilename(name: string): string {
  return name
    .replace(/[^\w\-. ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80);
}

/** One exported column: a human header and how to read the value from a row. */
export type CsvColumn<T> = {
  header: string;
  value: (row: T) => CsvValue;
};

/**
 * Build and download a CSV from typed rows.
 */
export function downloadTable<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
  options: { delimiter?: string; bom?: boolean } = {},
): number {
  const headers = columns.map((column) => column.header);
  const body = rows.map((row) => columns.map((column) => column.value(row)));
  downloadCsv(safeFilename(filename), toCsv(headers, body, { bom: true, ...options }));
  return rows.length;
}

/** `created_at` → `Created At`, `email` → `Email`. */
function fieldHeader(field: string): string {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Export a list by field name, for the call sites that just want their rows as a file.
 *
 * Prefer `downloadTable` when a column needs a formatter: a raw `created_at` here
 * is an ISO string, not the human date the table shows.
 */
export function exportCsv<T extends object>(
  rows: T[],
  filename: string,
  fields: readonly (keyof T & string)[],
): number {
  const columns: CsvColumn<T>[] = fields.map((field) => ({
    header: fieldHeader(field),
    value: (row) => (row as Record<string, unknown>)[field] as CsvValue,
  }));
  return downloadTable(filename, rows, columns);
}
