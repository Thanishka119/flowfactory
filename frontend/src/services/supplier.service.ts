import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '@/types/supplier';

export interface SupplierListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
}

export const supplierService = {
  list: async (params: SupplierListParams = {}): Promise<ApiResponse<Supplier[]>> => {
    const response = await apiClient.get<ApiResponse<Supplier[]>>('/suppliers', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Supplier>> => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: CreateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSupplierRequest): Promise<ApiResponse<Supplier>> => {
    const response = await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<Supplier>> => {
    const response = await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}/deactivate`);
    return response.data;
  },

  activate: async (id: string): Promise<ApiResponse<Supplier>> => {
    const response = await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}/activate`);
    return response.data;
  },
};
