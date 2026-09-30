import { supabase } from '@/lib/supabase';
import { toErrorMessage } from '@/lib/errors';
import type { Organization } from '@/lib/types/database';

/**
 * Workspace creation.
 *
 * Calls the `create_organization` RPC to atomically create the organization
 * and assign the caller as owner.
 */
export async function createOrganization(
  name: string,
  timezone: string,
): Promise<Organization> {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: name.trim(),
    p_timezone: timezone,
  });
  if (error) throw error;

  const id =
    typeof data === 'string' ? data : (data as { id?: string } | null)?.id;
  if (!id)
    throw new Error(
      'The workspace was created but no id came back. Try again.',
    );

  const { data: organization, error: readError } = await supabase
    .from('organizations')
    .select('id, name, slug, timezone, created_by, created_at, updated_at')
    .eq('id', id)
    .single();

  if (readError) {
    throw new Error(
      `The workspace was created, but it could not be read back: ${toErrorMessage(readError)}`,
    );
  }
  return organization as Organization;
}

export async function updateOrganization(
  id: string,
  changes: { name?: string; slug?: string; timezone?: string },
): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
}

export function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
