import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/lib/types/database';

export const AUDIT_PAGE_SIZE = 50;

export const auditKeys = {
  all: ['audit'] as const,
  list: (organizationId: string | null, page: number, entity: string) =>
    ['audit', 'list', organizationId, page, entity] as const,
  entities: (organizationId: string | null) =>
    ['audit', 'entities', organizationId] as const,
};

export function useAuditLog(page: number, entity: string) {
  const { activeOrganizationId } = useAuth();

  return useQuery({
    queryKey: auditKeys.list(activeOrganizationId, page, entity),
    enabled: Boolean(activeOrganizationId),
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<{ rows: AuditLog[]; total: number }> => {
      let query = supabase
        .from('audit_logs')
        .select(
          'id, organization_id, actor_id, actor_email, action, entity, entity_id, metadata, created_at',
          {
            count: 'exact',
          },
        )
        .eq('organization_id', activeOrganizationId!);

      if (entity !== 'all') {
        query = query.eq('entity', entity);
      }

      const from = (page - 1) * AUDIT_PAGE_SIZE;
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, from + AUDIT_PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as AuditLog[], total: count ?? 0 };
    },
  });
}

export function useAuditEntities() {
  const { activeOrganizationId } = useAuth();
  return useQuery({
    queryKey: auditKeys.entities(activeOrganizationId),
    enabled: Boolean(activeOrganizationId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('entity')
        .eq('organization_id', activeOrganizationId!)
        .limit(1000);
      if (error) throw error;
      return [...new Set((data ?? []).map((row) => row.entity))].sort();
    },
  });
}
