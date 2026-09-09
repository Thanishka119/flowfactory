import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface SimulateProductionItem {
  itemId: string;
  requiredQuantity: number;
}

export interface SimulateProductionRequest {
  finishedGoodItemId: string;
  plannedQuantity: number;
  requiredItems: SimulateProductionItem[];
}

export interface SimulateSaleItem {
  itemId: string;
  quantity: number;
}

export interface SimulateSaleRequest {
  items: SimulateSaleItem[];
}

export interface ProductionSimulationResult {
  simulationType: 'PRODUCTION';
  finishedGood: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    plannedYield: number;
    projectedStock: number;
  };
  hasShortage: boolean;
  materials: Array<{
    itemId: string;
    sku: string;
    name: string;
    unit: string;
    type: string;
    currentStock: number;
    requiredQuantity: number;
    projectedBalance: number;
    isShortage: boolean;
    shortageQuantity: number;
    reorderLevel: number;
    supplier?: {
      id: string;
      name: string;
      leadTimeDays: number;
    } | null;
  }>;
}

export interface SaleSimulationResult {
  simulationType: 'SALE';
  hasShortage: boolean;
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    requestedQuantity: number;
    projectedBalance: number;
    isShortage: boolean;
    shortageQuantity: number;
  }>;
}

export interface InventoryIntelligenceResult {
  lowStockAlerts: Array<{
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    reorderLevel: number;
    severity: string;
    supplier: string;
    leadTimeDays: number;
  }>;
  expiryAlerts: Array<{
    id: string;
    sku: string;
    name: string;
    currentStock: number;
    expiryDate: string;
    isExpired: boolean;
  }>;
  recommendations: Array<{
    type: string;
    sku: string;
    name: string;
    recommendedOrderQuantity: number;
    unit: string;
    supplierName: string;
    reason: string;
  }>;
}

export const simulatorService = {
  simulateProduction: async (
    data: SimulateProductionRequest
  ): Promise<ApiResponse<ProductionSimulationResult>> => {
    const response = await apiClient.post<ApiResponse<ProductionSimulationResult>>(
      '/simulator/production',
      data
    );
    return response.data;
  },

  simulateSale: async (data: SimulateSaleRequest): Promise<ApiResponse<SaleSimulationResult>> => {
    const response = await apiClient.post<ApiResponse<SaleSimulationResult>>(
      '/simulator/sale',
      data
    );
    return response.data;
  },

  getIntelligence: async (): Promise<ApiResponse<InventoryIntelligenceResult>> => {
    const response = await apiClient.get<ApiResponse<InventoryIntelligenceResult>>(
      '/simulator/intelligence'
    );
    return response.data;
  },
};
