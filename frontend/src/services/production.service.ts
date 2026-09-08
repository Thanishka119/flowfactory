import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  CompleteProductionOrderRequest,
} from '@/types/production';

export interface ProductionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  finishedGoodItemId?: string;
}

export const productionService = {
  list: async (params: ProductionListParams = {}): Promise<ApiResponse<ProductionOrder[]>> => {
    const response = await apiClient.get<ApiResponse<ProductionOrder[]>>('/production', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    const response = await apiClient.get<ApiResponse<ProductionOrder>>(`/production/${id}`);
    return response.data;
  },

  create: async (data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> => {
    const response = await apiClient.post<ApiResponse<ProductionOrder>>('/production', data);
    return response.data;
  },

  start: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    const response = await apiClient.post<ApiResponse<ProductionOrder>>(`/production/${id}/start`);
    return response.data;
  },

  complete: async (id: string, data?: CompleteProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> => {
    const response = await apiClient.post<ApiResponse<ProductionOrder>>(`/production/${id}/complete`, data || {});
    return response.data;
  },

  cancel: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    const response = await apiClient.post<ApiResponse<ProductionOrder>>(`/production/${id}/cancel`);
    return response.data;
  },
};
