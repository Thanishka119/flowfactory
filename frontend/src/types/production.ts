export type ProductionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ProductionItem {
  id: string;
  productionOrderId: string;
  itemId: string;
  requiredQuantity: number | string;
  createdAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock?: number | string;
    type?: string;
  };
}

export interface ConsumptionRecord {
  id: string;
  productionOrderId: string;
  itemId: string;
  quantityConsumed: number | string;
  recordedById?: string | null;
  createdAt: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
}

export interface FinishedGoodYield {
  id: string;
  productionOrderId: string;
  itemId: string;
  quantityProduced: number | string;
  createdAt: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  finishedGoodItemId: string;
  finishedGoodItem: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    type: string;
    currentStock: number | string;
  };
  plannedQuantity: number | string;
  actualQuantity: number | string;
  status: ProductionStatus;
  startDate?: string | null;
  completionDate?: string | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  requiredItems: ProductionItem[];
  consumptionRecords?: ConsumptionRecord[];
  finishedGoodsYield?: FinishedGoodYield[];
}

export interface CreateProductionOrderItem {
  itemId: string;
  requiredQuantity: number;
}

export interface CreateProductionOrderRequest {
  finishedGoodItemId: string;
  plannedQuantity: number;
  notes?: string;
  requiredItems: CreateProductionOrderItem[];
}

export interface CompleteProductionOrderRequest {
  actualQuantity?: number;
}
