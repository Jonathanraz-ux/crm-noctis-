import { defaults } from '@/config/product';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

/** Format a date string or timestamp. */
export function formatDate(
  input: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? parseISO(input) : new Date(input);
  if (!isValid(date)) return '—';

  return new Intl.DateTimeFormat(
    defaults.locale,
    options ?? {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(date);
}

/** Format relative time (e.g. "3 days ago"). */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? parseISO(input) : new Date(input);
  if (!isValid(date)) return '—';

  return formatDistanceToNow(date, { addSuffix: true });
}

/** Format currency amounts (e.g. "$50,000.00"). */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = defaults.currency,
  locale: string = defaults.locale,
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a number with thousands separators. */
export function formatNumber(
  value: number | null | undefined,
  locale: string = defaults.locale,
): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat(locale).format(value);
}

/** Format a decimal percentage (e.g. 0.45 -> "45%"). */
export function formatPercent(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Extract 1-2 letter initials from a full name or email. */
export function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?';
  const cleaned = nameOrEmail.trim();
  if (!cleaned) return '?';

  if (cleaned.includes('@')) {
    const userPart = cleaned.split('@')[0];
    return userPart.slice(0, 2).toUpperCase();
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic pastel tint for avatars. */
const TINTS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TINTS.length;
  return TINTS[index];
}
