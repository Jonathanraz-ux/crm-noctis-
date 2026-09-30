import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  getAvatarColor,
  getInitials,
} from './format';

describe('formatDate', () => {
  it('formats dates consistently', () => {
    expect(formatDate('2026-09-29T10:00:00.000Z')).toBe('Sep 29, 2026');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('invalid-date')).toBe('—');
  });
});

describe('formatCurrency', () => {
  it('formats numeric values with currency symbols and decimals', () => {
    expect(formatCurrency(50000)).toBe('$50,000.00');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
  });
});

describe('formatNumber', () => {
  it('formats integer numbers', () => {
    expect(formatNumber(1250000)).toBe('1,250,000');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('formats fractions into percentage strings', () => {
    expect(formatPercent(0.75)).toBe('75%');
    expect(formatPercent(0.1234, 1)).toBe('12.3%');
    expect(formatPercent(null)).toBe('0%');
  });
});

describe('getInitials', () => {
  it('extracts two letter initials from names', () => {
    expect(getInitials('Alice Smith')).toBe('AS');
    expect(getInitials('John')).toBe('JO');
    expect(getInitials('Marcus De La Tour')).toBe('MT');
  });

  it('extracts initials from emails', () => {
    expect(getInitials('elena.rostova@example.com')).toBe('EL');
  });

  it('handles empty inputs', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials('')).toBe('?');
  });
});

describe('getAvatarColor', () => {
  it('produces consistent tints for identical names', () => {
    const tint1 = getAvatarColor('Elena Rostova');
    const tint2 = getAvatarColor('Elena Rostova');
    expect(tint1).toBe(tint2);
  });
});
