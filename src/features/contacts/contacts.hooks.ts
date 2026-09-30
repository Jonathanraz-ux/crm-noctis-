import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContact,
  deleteContact,
  getContactById,
  listContacts,
  type ListContactsParams,
  updateContact,
} from './contacts.service';
import type { ContactInput } from '@/lib/validation';

export function useContacts(params: ListContactsParams) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => listContacts(params),
    enabled: Boolean(params.organizationId),
  });
}

export function useContact(organizationId: string | null, id: string | null) {
  return useQuery({
    queryKey: ['contact', organizationId, id],
    queryFn: () => getContactById(organizationId!, id!),
    enabled: Boolean(organizationId && id),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: ContactInput;
    }) => createContact(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      input,
    }: {
      organizationId: string;
      id: string;
      input: Partial<ContactInput>;
    }) => updateContact(organizationId, id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
    }: {
      organizationId: string;
      id: string;
    }) => deleteContact(organizationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
    },
  });
}
