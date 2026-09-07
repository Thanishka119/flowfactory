import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type {
  Purchase,
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
} from '@/types/purchase';

export interface PurchaseListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
}

export const purchaseService = {
  list: async (params: PurchaseListParams = {}): Promise<ApiResponse<Purchase[]>> => {
    const response = await apiClient.get<ApiResponse<Purchase[]>>('/purchases', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Purchase>> => {
    const response = await apiClient.get<ApiResponse<Purchase>>(`/purchases/${id}`);
    return response.data;
  },

  create: async (data: CreatePurchaseRequest): Promise<ApiResponse<Purchase>> => {
    const response = await apiClient.post<ApiResponse<Purchase>>('/purchases', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePurchaseRequest): Promise<ApiResponse<Purchase>> => {
    const response = await apiClient.patch<ApiResponse<Purchase>>(`/purchases/${id}`, data);
    return response.data;
  },

  cancel: async (id: string): Promise<ApiResponse<Purchase>> => {
    const response = await apiClient.post<ApiResponse<Purchase>>(`/purchases/${id}/cancel`);
    return response.data;
  },

  receive: async (id: string): Promise<ApiResponse<Purchase>> => {
    const response = await apiClient.post<ApiResponse<Purchase>>(`/purchases/${id}/receive`);
    return response.data;
  },
};
