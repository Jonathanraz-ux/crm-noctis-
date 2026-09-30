import { describe, expect, it } from 'vitest';
import { isPermissionError, toErrorMessage } from './errors';

describe('toErrorMessage', () => {
  it('maps network failures to friendly advice', () => {
    expect(toErrorMessage(new Error('Failed to fetch'))).toContain(
      'Check your connection',
    );
  });

  it('maps invalid credentials properly', () => {
    expect(toErrorMessage(new Error('Invalid login credentials'))).toContain(
      'does not match an account',
    );
  });

  it('protects against account enumeration on signup', () => {
    // Crucial anti-enumeration assertion: must not say "user exists"
    const message = toErrorMessage(new Error('User already registered'));
    expect(message).toBe(
      'Check the address and try again, or sign in if you already have an account.',
    );
    expect(message.toLowerCase()).not.toContain('already exists');
    expect(message.toLowerCase()).not.toContain('taken');
  });

  it('handles RLS permission errors', () => {
    expect(
      toErrorMessage(
        new Error(
          'new row violates row-level security policy for table prospects',
        ),
      ),
    ).toBe('You do not have permission to do that.');
  });

  it('handles object error payloads from PostgREST', () => {
    expect(
      toErrorMessage({
        message:
          'duplicate key value violates unique constraint "organizations_slug_key"',
      }),
    ).toBe('That value is already taken. Please choose a different one.');
  });

  it('falls back when error is null or undefined', () => {
    expect(toErrorMessage(null)).toBe('Something went wrong.');
    expect(toErrorMessage(undefined)).toBe('Something went wrong.');
  });
});

describe('isPermissionError', () => {
  it('detects RLS and 401/403 errors', () => {
    expect(
      isPermissionError(new Error('permission denied for table deals')),
    ).toBe(true);
    expect(isPermissionError('403 Forbidden')).toBe(true);
    expect(isPermissionError('PGRST301')).toBe(true);
    expect(isPermissionError('Syntax error')).toBe(false);
  });
});
