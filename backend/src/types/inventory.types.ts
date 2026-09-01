import { Prisma, TransactionType, InventoryItem, InventoryTransaction } from '@prisma/client';

export type DecimalValue = number | string | Prisma.Decimal;

export interface IncreaseStockInput {
  itemId: string;
  quantity: DecimalValue;
  type: TransactionType;
  unitCost?: DecimalValue;
  totalCost?: DecimalValue;
  referenceType?: string;
  referenceId?: string;
  performedById?: string;
  notes?: string;
  tx?: Prisma.TransactionClient;
}

export interface DecreaseStockInput {
  itemId: string;
  quantity: DecimalValue;
  type: TransactionType;
  unitCost?: DecimalValue;
  totalCost?: DecimalValue;
  referenceType?: string;
  referenceId?: string;
  performedById?: string;
  notes?: string;
  allowNegativeStock?: boolean;
  tx?: Prisma.TransactionClient;
}

export interface AdjustStockInput {
  itemId: string;
  quantityDelta?: DecimalValue;
  targetStock?: DecimalValue;
  unitCost?: DecimalValue;
  totalCost?: DecimalValue;
  referenceType?: string;
  referenceId?: string;
  performedById?: string;
  notes?: string;
  allowNegativeStock?: boolean;
  tx?: Prisma.TransactionClient;
}

export interface GetCurrentStockInput {
  itemId: string;
  tx?: Prisma.TransactionClient;
}

export interface GetStockHistoryInput {
  itemId: string;
  page?: number;
  limit?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  type?: TransactionType;
  tx?: Prisma.TransactionClient;
}

export interface InventoryMutationResult {
  item: InventoryItem;
  transaction: InventoryTransaction;
  previousStock: Prisma.Decimal;
  newStock: Prisma.Decimal;
  delta: Prisma.Decimal;
}

export interface StockReconciliationResult {
  itemId: string;
  sku: string;
  cachedStock: Prisma.Decimal;
  ledgerStock: Prisma.Decimal;
  discrepancy: Prisma.Decimal;
  isConsistent: boolean;
  totalTransactionsCount: number;
}
