import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Permission, Role } from '@/lib/types/database';

export type RoleCatalog = {
  roles: Role[];
  permissions: Permission[];
  /** role key -> permission codes */
  byRole: Record<string, string[]>;
};

export const roleKeys = {
  catalog: ['roles', 'catalog'] as const,
};

/**
 * The full role × permission matrix.
 * Read-only and cached, matching RLS policies.
 */
export function useRoleCatalog() {
  return useQuery({
    queryKey: roleKeys.catalog,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RoleCatalog> => {
      const [
        { data: roles, error: rolesError },
        { data: links, error: linksError },
        { data: permissions, error: permissionsError },
      ] = await Promise.all([
        supabase.from('roles').select('id, key, name, description, rank, is_system'),
        supabase.from('role_permissions').select('role_id, permission_code'),
        supabase.from('permissions').select('code, label, category, description'),
      ]);

      if (rolesError) throw rolesError;
      if (linksError) throw linksError;
      if (permissionsError) throw permissionsError;

      const byId = new Map<string, string[]>();
      for (const link of links ?? []) {
        const list = byId.get(link.role_id);
        if (list) list.push(link.permission_code);
        else byId.set(link.role_id, [link.permission_code]);
      }

      const byRole: Record<string, string[]> = {};
      for (const role of roles ?? []) {
        byRole[role.key] = byId.get(role.id) ?? [];
      }

      return {
        roles: (roles ?? []) as Role[],
        permissions: (permissions ?? []) as Permission[],
        byRole,
      };
    },
  });
}
