import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProspect,
  deleteProspect,
  getProspectById,
  listProspects,
  type ListProspectsParams,
  updateProspect,
} from './prospects.service';
import type { ProspectInput } from '@/lib/validation';

export function useProspects(params: ListProspectsParams) {
  return useQuery({
    queryKey: ['prospects', params],
    queryFn: () => listProspects(params),
    enabled: Boolean(params.organizationId),
  });
}

export function useProspect(organizationId: string | null, id: string | null) {
  return useQuery({
    queryKey: ['prospect', organizationId, id],
    queryFn: () => getProspectById(organizationId!, id!),
    enabled: Boolean(organizationId && id),
  });
}

export function useCreateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: ProspectInput;
    }) => createProspect(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      input,
    }: {
      organizationId: string;
      id: string;
      input: Partial<ProspectInput>;
    }) => updateProspect(organizationId, id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospect', id] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
    }: {
      organizationId: string;
      id: string;
    }) => deleteProspect(organizationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
    },
  });
}
