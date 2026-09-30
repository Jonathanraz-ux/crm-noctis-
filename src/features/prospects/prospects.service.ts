import { supabase } from '@/lib/supabase';
import type { Prospect } from '@/lib/types/database';
import type { ProspectInput } from '@/lib/validation';

export const PROSPECT_SORT_COLUMNS = [
  'name',
  'company',
  'email',
  'status',
  'source',
  'created_at',
  'updated_at',
] as const;

export type ProspectSortColumn = (typeof PROSPECT_SORT_COLUMNS)[number];

/**
 * Validates and safely resolves a sort column against an explicit allowlist.
 * Guarantees that user-controlled sort strings cannot be turned into SQL injection.
 */
export function safeSortColumn(
  column: string | undefined | null,
): ProspectSortColumn {
  if (!column) return 'created_at';
  const clean = column.trim().toLowerCase();
  if (PROSPECT_SORT_COLUMNS.includes(clean as ProspectSortColumn)) {
    return clean as ProspectSortColumn;
  }
  return 'created_at';
}

export interface ListProspectsParams {
  organizationId: string;
  search?: string;
  status?: string;
  source?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listProspects({
  organizationId,
  search,
  status,
  source,
  sortBy = 'created_at',
  sortOrder = 'desc',
  page = 1,
  pageSize = 10,
}: ListProspectsParams) {
  const safeSort = safeSortColumn(sortBy);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('prospects')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (status && status !== 'all') {
    query = query.eq('status', status as Prospect['status']);
  }

  if (source && source !== 'all') {
    query = query.eq('source', source as Prospect['source']);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(
      `name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  query = query
    .order(safeSort, { ascending: sortOrder === 'asc' })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    prospects: (data ?? []) as Prospect[],
    totalCount: count ?? 0,
  };
}

export async function getProspectById(organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Prospect;
}

export async function createProspect(
  organizationId: string,
  input: ProspectInput,
) {
  const { data, error } = await supabase
    .from('prospects')
    .insert({
      organization_id: organizationId,
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      source: input.source,
      status: input.status,
      tags: input.tags,
      notes: input.notes,
      owner_id: input.owner_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Prospect;
}

export async function updateProspect(
  organizationId: string,
  id: string,
  input: Partial<ProspectInput>,
) {
  const { data, error } = await supabase
    .from('prospects')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Prospect;
}

export async function deleteProspect(organizationId: string, id: string) {
  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);

  if (error) throw error;
}
