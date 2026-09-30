import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import {
  inviteMember,
  listMembers,
  removeMember,
  updateMembership,
} from './members.service';
import type { RoleKey } from '@/config/product';

export const memberKeys = {
  all: ['members'] as const,
  list: (orgId: string | null) => ['members', 'list', orgId] as const,
};

export function useMembers() {
  const { activeOrganizationId } = useAuth();
  return useQuery({
    queryKey: memberKeys.list(activeOrganizationId),
    enabled: Boolean(activeOrganizationId),
    queryFn: () => listMembers(activeOrganizationId!),
  });
}

export function useMemberMutations() {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: memberKeys.all });
  };

  const invite = useMutation({
    mutationFn: ({ email, role }: { email: string; role: RoleKey }) => {
      if (!activeOrganizationId)
        throw new Error('No active workspace selected.');
      return inviteMember(activeOrganizationId, email, role);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      membershipId,
      changes,
    }: {
      membershipId: string;
      changes: {
        role_key?: RoleKey;
        status?: 'active' | 'invited' | 'suspended';
        user_id?: string | null;
      };
    }) => updateMembership(membershipId, changes),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (membershipId: string) => removeMember(membershipId),
    onSuccess: invalidate,
  });

  return { invite, update, remove };
}
