import { supabase } from '@/lib/supabase';
import type { Contact } from '@/lib/types/database';
import type { ContactInput } from '@/lib/validation';

export const CONTACT_SORT_COLUMNS = [
  'name',
  'email',
  'phone',
  'job_title',
  'company',
  'created_at',
  'updated_at',
] as const;

export type ContactSortColumn = (typeof CONTACT_SORT_COLUMNS)[number];

export function safeSortColumn(column: string | undefined | null): ContactSortColumn {
  if (!column) return 'created_at';
  const clean = column.trim().toLowerCase();
  if (CONTACT_SORT_COLUMNS.includes(clean as ContactSortColumn)) {
    return clean as ContactSortColumn;
  }
  return 'created_at';
}

export interface ListContactsParams {
  organizationId: string;
  prospectId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listContacts({
  organizationId,
  prospectId,
  search,
  sortBy = 'created_at',
  sortOrder = 'desc',
  page = 1,
  pageSize = 10,
}: ListContactsParams) {
  const safeSort = safeSortColumn(sortBy);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('contacts')
    .select('*, prospects(name, company)', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (prospectId) {
    query = query.eq('prospect_id', prospectId);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%,job_title.ilike.%${term}%`);
  }

  query = query.order(safeSort, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    contacts: ((data ?? []) as unknown) as (Contact & { prospects?: { name: string; company: string | null } | null })[],
    totalCount: count ?? 0,
  };
}

export async function getContactById(organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, prospects(*)')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createContact(organizationId: string, input: ContactInput) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      job_title: input.job_title,
      company: input.company,
      prospect_id: input.prospect_id,
      tags: input.tags,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(
  organizationId: string,
  id: string,
  input: Partial<ContactInput>,
) {
  const { data, error } = await supabase
    .from('contacts')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function deleteContact(organizationId: string, id: string) {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);

  if (error) throw error;
}
