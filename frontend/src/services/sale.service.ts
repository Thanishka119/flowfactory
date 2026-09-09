import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { Sale, CreateSaleRequest } from '@/types/sale';

export interface SaleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const saleService = {
  list: async (params: SaleListParams = {}): Promise<ApiResponse<Sale[]>> => {
    const response = await apiClient.get<ApiResponse<Sale[]>>('/sales', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Sale>> => {
    const response = await apiClient.get<ApiResponse<Sale>>(`/sales/${id}`);
    return response.data;
  },

  create: async (data: CreateSaleRequest): Promise<ApiResponse<Sale>> => {
    const response = await apiClient.post<ApiResponse<Sale>>('/sales', data);
    return response.data;
  },

  complete: async (id: string): Promise<ApiResponse<Sale>> => {
    const response = await apiClient.post<ApiResponse<Sale>>(`/sales/${id}/complete`);
    return response.data;
  },

  cancel: async (id: string): Promise<ApiResponse<Sale>> => {
    const response = await apiClient.post<ApiResponse<Sale>>(`/sales/${id}/cancel`);
    return response.data;
  },
};
