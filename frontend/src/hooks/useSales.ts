import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService, type SaleListParams } from '@/services/sale.service';
import type { CreateSaleRequest } from '@/types/sale';
import { inventoryKeys } from './useInventory';

export const saleKeys = {
  all: ['sales'] as const,
  lists: () => [...saleKeys.all, 'list'] as const,
  list: (params: SaleListParams) => [...saleKeys.lists(), params] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: string) => [...saleKeys.details(), id] as const,
};

export function useSaleList(params: SaleListParams = {}) {
  return useQuery({
    queryKey: saleKeys.list(params),
    queryFn: async () => {
      const response = await saleService.list(params);
      return response.data ?? [];
    },
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: saleKeys.detail(id ?? ''),
    queryFn: async () => {
      const response = await saleService.getById(id!);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleRequest) => saleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
    },
  });
}

export function useCompleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => saleService.complete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => saleService.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(id) });
    },
  });
}
