import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface DashboardMetrics {
  totalItems: number;
  rawMaterialsCount: number;
  componentsCount: number;
  finishedGoodsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingPurchasesCount: number;
  pendingInvoicesCount: number;
  activeProductionCount: number;
  completedSalesCount: number;
}

export interface DashboardSummaryData {
  metrics: DashboardMetrics;
  lowStockItems: Array<{
    id: string;
    sku: string;
    name: string;
    currentStock: number | string;
    reorderLevel: number | string;
    unit: string;
    isOut: boolean;
  }>;
  recentTransactions: any[];
  recentPurchases: any[];
  recentProduction: any[];
  recentSales: any[];
}

export interface ReportFilterParams {
  type?: 'inventory' | 'transactions' | 'purchases' | 'production' | 'sales';
  startDate?: string;
  endDate?: string;
  itemType?: string;
  transactionType?: string;
  productionStatus?: string;
  saleStatus?: string;
}

export const dashboardService = {
  getSummary: async (): Promise<ApiResponse<DashboardSummaryData>> => {
    const response = await apiClient.get<ApiResponse<DashboardSummaryData>>('/dashboard/summary');
    return response.data;
  },

  getReportData: async (params: ReportFilterParams = {}): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/dashboard/reports', { params });
    return response.data;
  },
};
