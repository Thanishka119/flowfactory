import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService, type PurchaseListParams } from '@/services/purchase.service';
import type { CreatePurchaseRequest, UpdatePurchaseRequest } from '@/types/purchase';
import { inventoryKeys } from './useInventory';

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (params: PurchaseListParams) => [...purchaseKeys.lists(), params] as const,
  details: () => [...purchaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseKeys.details(), id] as const,
};

export function usePurchaseList(params: PurchaseListParams = {}) {
  return useQuery({
    queryKey: purchaseKeys.list(params),
    queryFn: async () => {
      const response = await purchaseService.list(params);
      return response.data ?? [];
    },
  });
}

export function usePurchase(id: string | undefined) {
  return useQuery({
    queryKey: purchaseKeys.detail(id ?? ''),
    queryFn: async () => {
      const response = await purchaseService.getById(id!);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseRequest) => purchaseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseRequest }) =>
      purchaseService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(variables.id) });
    },
  });
}

export function useCancelPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseService.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(id) });
    },
  });
}

export function useReceivePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseService.receive(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
