import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type {
  Invoice,
  CreateInvoiceRequest,
  VerifyInvoiceRequest,
  CreateItemFromInvoiceRequest,
} from '@/types/invoice';

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  purchaseId?: string;
}

export const invoiceService = {
  list: async (params: InvoiceListParams = {}): Promise<ApiResponse<Invoice[]>> => {
    const response = await apiClient.get<ApiResponse<Invoice[]>>('/invoices', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return response.data;
  },

  create: async (data: CreateInvoiceRequest): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post<ApiResponse<Invoice>>('/invoices', data);
    return response.data;
  },

  verify: async (id: string, data: VerifyInvoiceRequest): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/verify`, data);
    return response.data;
  },

  process: async (id: string): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/process`);
    return response.data;
  },

  createItem: async (invoiceId: string, data: CreateItemFromInvoiceRequest): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/invoices/${invoiceId}/create-item`, data);
    return response.data;
  },
};
