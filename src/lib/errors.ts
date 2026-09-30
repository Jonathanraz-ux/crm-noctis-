/**
 * Turn anything thrown by Supabase / React Query into a sentence a human can act on.
 */
const FRIENDLY: Array<[RegExp, string]> = [
  [
    /Failed to fetch|NetworkError|Load failed/i,
    'Could not reach the server. Check your connection and try again.',
  ],
  [/Invalid login credentials/i, 'That email and password combination does not match an account.'],
  [
    /Email not confirmed/i,
    'This email address still needs to be confirmed. Check your inbox for the link.',
  ],
  // Deliberately does not say the address is taken. Prevents account enumeration.
  [
    /User already registered/i,
    'Check the address and try again, or sign in if you already have an account.',
  ],
  [/Password should be at least/i, 'Choose a password of at least 6 characters.'],
  [/new row violates row-level security policy/i, 'You do not have permission to do that.'],
  [
    /duplicate key value violates unique constraint/i,
    'That value is already taken. Please choose a different one.',
  ],
  [/violates foreign key constraint/i, 'This item is still referenced by other records.'],
  [/violates check constraint/i, 'One of the values submitted is not allowed.'],
  [/JWT|token/i, 'Your session has expired. Sign in again to continue.'],
];

export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    return matchFriendly(error);
  }

  if (error instanceof Error && error.message) {
    return matchFriendly(error.message);
  }

  if (typeof error === 'object') {
    const candidate = error as { message?: unknown; error_description?: unknown; code?: unknown };
    if (typeof candidate.error_description === 'string' && candidate.error_description) {
      return matchFriendly(candidate.error_description);
    }
    if (typeof candidate.message === 'string' && candidate.message) {
      return matchFriendly(candidate.message);
    }
    if (typeof candidate.code === 'string' && candidate.code) {
      return candidate.code;
    }
  }

  return fallback;
}

function matchFriendly(message: string): string {
  const cleaned = message.replace(/^(error|failed|Error):\s*/i, '').trim();
  for (const [pattern, friendly] of FRIENDLY) {
    if (pattern.test(cleaned)) return friendly;
  }
  return cleaned || 'Something went wrong.';
}

export function isPermissionError(error: unknown): boolean {
  const text =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error ?? '');
  return /row-level security|not authorized|permission denied|401|403|PGRST301/i.test(text ?? '');
}
