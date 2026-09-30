import { supabase } from '@/lib/supabase';
import type { Deal } from '@/lib/types/database';
import type { DealInput } from '@/lib/validation';

export const DEAL_SORT_COLUMNS = [
  'title',
  'value',
  'stage',
  'expected_close_date',
  'created_at',
  'updated_at',
] as const;

export type DealSortColumn = (typeof DEAL_SORT_COLUMNS)[number];

export function safeSortColumn(
  column: string | undefined | null,
): DealSortColumn {
  if (!column) return 'created_at';
  const clean = column.trim().toLowerCase();
  if (DEAL_SORT_COLUMNS.includes(clean as DealSortColumn)) {
    return clean as DealSortColumn;
  }
  return 'created_at';
}

export interface ListDealsParams {
  organizationId: string;
  stage?: string;
  prospectId?: string;
  contactId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listDeals({
  organizationId,
  stage,
  prospectId,
  contactId,
  search,
  sortBy = 'created_at',
  sortOrder = 'desc',
  page = 1,
  pageSize = 50,
}: ListDealsParams) {
  const safeSort = safeSortColumn(sortBy);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('deals')
    .select('*, prospects(name, company), contacts(name, email)', {
      count: 'exact',
    })
    .eq('organization_id', organizationId);

  if (stage && stage !== 'all') {
    query = query.eq('stage', stage as Deal['stage']);
  }

  if (prospectId) {
    query = query.eq('prospect_id', prospectId);
  }

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.ilike('title', `%${term}%`);
  }

  query = query
    .order(safeSort, { ascending: sortOrder === 'asc' })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    deals: (data ?? []) as unknown as (Deal & {
      prospects?: { name: string; company: string | null } | null;
      contacts?: { name: string; email: string | null } | null;
    })[],
    totalCount: count ?? 0,
  };
}

export async function getDealById(organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, prospects(*), contacts(*)')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDeal(organizationId: string, input: DealInput) {
  const { data, error } = await supabase
    .from('deals')
    .insert({
      organization_id: organizationId,
      title: input.title,
      value: input.value,
      stage: input.stage,
      expected_close_date: input.expected_close_date,
      prospect_id: input.prospect_id,
      contact_id: input.contact_id,
      owner_id: input.owner_id,
      tags: input.tags,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Deal;
}

export async function updateDeal(
  organizationId: string,
  id: string,
  input: Partial<DealInput>,
) {
  const { data, error } = await supabase
    .from('deals')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Deal;
}

export async function updateDealStage(
  organizationId: string,
  id: string,
  stage: Deal['stage'],
) {
  const { data, error } = await supabase
    .from('deals')
    .update({ stage })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Deal;
}

export async function deleteDeal(organizationId: string, id: string) {
  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);

  if (error) throw error;
}
