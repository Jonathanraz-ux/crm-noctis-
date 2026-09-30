import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDeal,
  deleteDeal,
  getDealById,
  listDeals,
  type ListDealsParams,
  updateDeal,
  updateDealStage,
} from './pipeline.service';
import type { Deal } from '@/lib/types/database';
import type { DealInput } from '@/lib/validation';

export function useDeals(params: ListDealsParams) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => listDeals(params),
    enabled: Boolean(params.organizationId),
  });
}

export function useDeal(organizationId: string | null, id: string | null) {
  return useQuery({
    queryKey: ['deal', organizationId, id],
    queryFn: () => getDealById(organizationId!, id!),
    enabled: Boolean(organizationId && id),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: DealInput;
    }) => createDeal(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-month'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      input,
    }: {
      organizationId: string;
      id: string;
      input: Partial<DealInput>;
    }) => updateDeal(organizationId, id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-month'] });
    },
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      stage,
    }: {
      organizationId: string;
      id: string;
      stage: Deal['stage'];
    }) => updateDealStage(organizationId, id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-month'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      id,
    }: {
      organizationId: string;
      id: string;
    }) => deleteDeal(organizationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-month'] });
    },
  });
}
