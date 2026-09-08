import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productionService, type ProductionListParams } from '@/services/production.service';
import type { CreateProductionOrderRequest, CompleteProductionOrderRequest } from '@/types/production';
import { inventoryKeys } from './useInventory';

export const productionKeys = {
  all: ['production'] as const,
  lists: () => [...productionKeys.all, 'list'] as const,
  list: (params: ProductionListParams) => [...productionKeys.lists(), params] as const,
  details: () => [...productionKeys.all, 'detail'] as const,
  detail: (id: string) => [...productionKeys.details(), id] as const,
};

export function useProductionList(params: ProductionListParams = {}) {
  return useQuery({
    queryKey: productionKeys.list(params),
    queryFn: async () => {
      const response = await productionService.list(params);
      return response.data ?? [];
    },
  });
}

export function useProductionOrder(id: string | undefined) {
  return useQuery({
    queryKey: productionKeys.detail(id ?? ''),
    queryFn: async () => {
      const response = await productionService.getById(id!);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductionOrderRequest) => productionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.lists() });
    },
  });
}

export function useStartProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productionService.start(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: productionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productionKeys.detail(id) });
    },
  });
}

export function useCompleteProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CompleteProductionOrderRequest }) =>
      productionService.complete(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useCancelProductionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productionService.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: productionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productionKeys.detail(id) });
    },
  });
}
