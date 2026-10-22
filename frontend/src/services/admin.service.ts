import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export const adminService = {
  // Feature 1: Shortage Rescue Planner
  getShortagePlans: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/admin/shortage-rescue/plans');
    return response.data;
  },

  getSalesOrderShortages: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/admin/shortage-rescue/sales-shortages');
    return response.data;
  },

  getApprovedAlternates: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/admin/shortage-rescue/alternates');
    return response.data;
  },

  addApprovedAlternate: async (data: { originalItemId: string; alternateItemId: string; notes?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/admin/shortage-rescue/alternates', data);
    return response.data;
  },

  approveRescuePlan: async (data: {
    orderId: string;
    action: 'SUBSTITUTE' | 'PARTIAL_RUN' | 'RESCHEDULE';
    alternateItemId?: string;
    substituteQty?: number;
    partialQty?: number;
    newStartDate?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/admin/shortage-rescue/approve', data);
    return response.data;
  },

  // Feature 2: Expiry Burn-down Planner
  getExpiryAnalysis: async (days: number = 60): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/admin/expiry-planner/analysis', {
      params: { days },
    });
    return response.data;
  },

  approveBurnDownAction: async (data: {
    itemId: string;
    action: 'EXPEDITE_CONSUMPTION' | 'QUARANTINE_EXPIRED';
    targetOrderId?: string;
    quantity?: number;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/admin/expiry-planner/approve', data);
    return response.data;
  },

  // Feature 3: Returned Product Recovery & Resale
  getReturns: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/admin/recovery-resale/returns');
    return response.data;
  },

  createReturn: async (data: {
    itemId: string;
    saleId?: string | null;
    quantity: number;
    reason: string;
    condition: 'NEW_LIKE' | 'OPEN_BOX' | 'DAMAGED' | 'DEFECTIVE' | 'INCOMPLETE';
    estimatedBasePrice?: number;
    batchReference?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/admin/recovery-resale/returns', data);
    return response.data;
  },

  inspectReturn: async (
    id: string,
    data: {
      inspectionStatus: 'INSPECTED_PASSED' | 'INSPECTED_REPAIR_NEEDED' | 'INSPECTED_FAILED';
      inspectionNotes: string;
      overrideRoute?: string;
      resalePrice?: number;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/admin/recovery-resale/returns/${id}/inspect`, data);
    return response.data;
  },

  approveRecoveryRoute: async (
    id: string,
    data: {
      action: 'APPROVE_OPEN_BOX' | 'APPROVE_COMPONENT_RECOVERY' | 'SCRAP_RECYCLE' | 'ROUTE_REPAIR';
      targetComponentId?: string;
      salvagedQuantity?: number;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/admin/recovery-resale/returns/${id}/approve`, data);
    return response.data;
  },
};
