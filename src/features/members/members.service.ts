import { supabase } from '@/lib/supabase';
import type { MemberRow } from '@/lib/types/database';
import type { RoleKey } from '@/config/product';

/**
 * Member administration.
 *
 * 1. Reads go through `v_members` so pending invitations without a user_id
 *    are visible alongside active members.
 * 2. Authenticated user ID is inferred from the JWT by PostgreSQL RLS.
 */
export async function listMembers(organizationId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('v_members')
    .select(
      'id, organization_id, user_id, email, role_key, status, invited_by, created_at, full_name, avatar_url, has_account',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Invite member by email. Stored as 'invited' until claimed on sign-up. */
export async function inviteMember(
  organizationId: string,
  email: string,
  role: RoleKey,
): Promise<void> {
  const { error } = await supabase.from('memberships').insert({
    organization_id: organizationId,
    email: email.trim().toLowerCase(),
    role_key: role,
    status: 'invited',
  });
  if (error) throw error;
}

/** Change member role or status. */
export async function updateMembership(
  membershipId: string,
  changes: {
    role_key?: RoleKey;
    status?: 'active' | 'invited' | 'suspended';
    user_id?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('memberships').update(changes).eq('id', membershipId);
  if (error) throw error;
}

/** Remove membership from organization. */
export async function removeMember(membershipId: string): Promise<void> {
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId);
  if (error) throw error;
}
