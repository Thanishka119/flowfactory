export type InventoryItemType = 'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD' | 'OTHER';
export type TransactionType = 'PURCHASE' | 'CONSUMPTION' | 'PRODUCTION' | 'SALE' | 'ADJUSTMENT';
export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  type: InventoryItemType;
  unit: string;
  currentStock: string; // Decimal as string from API
  minStock: string;
  reorderLevel: string;
  supplierId: string | null;
  supplier: {
    id: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  expiryDate: string | null;
  isActive: boolean;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: TransactionType;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  balanceAfter: string;
  referenceType: string | null;
  referenceId: string | null;
  performedById: string | null;
  performedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateInventoryItemRequest {
  sku: string;
  name: string;
  description?: string;
  category: string;
  type: InventoryItemType;
  unit: string;
  minStock?: number;
  reorderLevel?: number;
  supplierId?: string;
  expiryDate?: string;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  minStock?: number;
  reorderLevel?: number;
  supplierId?: string | null;
  expiryDate?: string | null;
}

export interface AdjustStockRequest {
  quantityDelta: number;
  notes: string;
}

export interface StockAdjustmentResult {
  item: InventoryItem;
  transaction: InventoryTransaction;
  previousStock: string;
  newStock: string;
  delta: string;
}
