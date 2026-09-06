import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type {
  InventoryItem,
  InventoryTransaction,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  AdjustStockRequest,
  StockAdjustmentResult,
} from '@/types/inventory';

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  category?: string;
  isActive?: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export const inventoryService = {
  list: async (params: InventoryListParams = {}): Promise<ApiResponse<InventoryItem[]>> => {
    const response = await apiClient.get<ApiResponse<InventoryItem[]>>('/inventory', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);
    return response.data;
  },

  create: async (data: CreateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.post<ApiResponse<InventoryItem>>('/inventory', data);
    return response.data;
  },

  update: async (id: string, data: UpdateInventoryItemRequest): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.patch<ApiResponse<InventoryItem>>(`/inventory/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/deactivate`);
    return response.data;
  },

  getTransactions: async (id: string, params: TransactionListParams = {}): Promise<ApiResponse<InventoryTransaction[]>> => {
    const response = await apiClient.get<ApiResponse<InventoryTransaction[]>>(`/inventory/${id}/transactions`, { params });
    return response.data;
  },

  adjustStock: async (id: string, data: AdjustStockRequest): Promise<ApiResponse<StockAdjustmentResult>> => {
    const response = await apiClient.post<ApiResponse<StockAdjustmentResult>>(`/inventory/${id}/adjust`, data);
    return response.data;
  },
};
