import { Prisma, TransactionType, InventoryItem, InventoryTransaction } from '@prisma/client';
import { prisma } from '../config/db.js';
import {
  ItemNotFoundError,
  InactiveItemError,
  InvalidQuantityError,
  InsufficientStockError,
} from '../errors/inventory.errors.js';
import {
  IncreaseStockInput,
  DecreaseStockInput,
  AdjustStockInput,
  GetStockHistoryInput,
  InventoryMutationResult,
  StockReconciliationResult,
  DecimalValue,
} from '../types/inventory.types.js';
import { ApiPaginationMeta } from '../types/index.js';

/**
 * Parses and validates that a value is a valid strictly positive decimal (> 0).
 */
function toPositiveDecimal(val: DecimalValue, fieldName = 'quantity'): Prisma.Decimal {
  let decimal: Prisma.Decimal;
  try {
    decimal = val instanceof Prisma.Decimal ? val : new Prisma.Decimal(val);
  } catch {
    throw new InvalidQuantityError(`Invalid decimal value provided for ${fieldName}: ${val}`);
  }

  if (decimal.isNaN() || !decimal.isFinite() || decimal.lessThanOrEqualTo(0)) {
    throw new InvalidQuantityError(
      `${fieldName} must be a valid positive number greater than 0. Received: ${val}`
    );
  }
  return decimal;
}

/**
 * Parses and validates that a value is a valid finite decimal.
 */
function toDecimal(val: DecimalValue, fieldName = 'value'): Prisma.Decimal {
  let decimal: Prisma.Decimal;
  try {
    decimal = val instanceof Prisma.Decimal ? val : new Prisma.Decimal(val);
  } catch {
    throw new InvalidQuantityError(`Invalid decimal value provided for ${fieldName}: ${val}`);
  }

  if (decimal.isNaN() || !decimal.isFinite()) {
    throw new InvalidQuantityError(`Invalid number provided for ${fieldName}: ${val}`);
  }
  return decimal;
}

/**
 * Helper to execute operations either within an existing outer transaction
 * or by opening a new Prisma transaction.
 */
async function executeWithClient<T>(
  tx: Prisma.TransactionClient | undefined,
  operation: (client: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (tx) {
    return operation(tx);
  }
  return prisma.$transaction(async (txClient) => {
    return operation(txClient);
  });
}

/**
 * Centralized Inventory Service Core
 *
 * Rules:
 * 1. InventoryTransaction is the single source of truth.
 * 2. InventoryItem.currentStock is the atomically cached balance.
 * 3. Quantities in InventoryTransaction are signed:
 *    - Positive for increases (PURCHASE, PRODUCTION)
 *    - Negative for decreases (CONSUMPTION, SALE)
 *    - Signed for adjustments (ADJUSTMENT)
 * 4. Negative stock is rejected by default.
 * 5. All mutations support an optional `tx?: Prisma.TransactionClient`.
 */
export class InventoryService {
  /**
   * Increases inventory stock atomically and appends a positive signed ledger transaction.
   */
  async increaseStock(input: IncreaseStockInput): Promise<InventoryMutationResult> {
    const quantity = toPositiveDecimal(input.quantity, 'Increase quantity');

    return executeWithClient(input.tx, async (client) => {
      const item = await client.inventoryItem.findUnique({
        where: { id: input.itemId },
      });

      if (!item) {
        throw new ItemNotFoundError(input.itemId);
      }

      if (!item.isActive) {
        throw new InactiveItemError(item.id, item.sku);
      }

      const previousStock = new Prisma.Decimal(item.currentStock);
      const signedDelta = quantity; // Positive for stock increase
      const newStock = previousStock.plus(signedDelta);

      const unitCost = input.unitCost !== undefined ? toDecimal(input.unitCost, 'unitCost') : null;
      const totalCost =
        input.totalCost !== undefined
          ? toDecimal(input.totalCost, 'totalCost')
          : unitCost
            ? unitCost.times(quantity)
            : null;

      const [updatedItem, transaction] = await Promise.all([
        client.inventoryItem.update({
          where: { id: item.id },
          data: { currentStock: newStock },
        }),
        client.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: input.type,
            quantity: signedDelta,
            unitCost,
            totalCost,
            balanceAfter: newStock,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            performedById: input.performedById ?? null,
            notes: input.notes ?? null,
          },
        }),
      ]);

      return {
        item: updatedItem,
        transaction,
        previousStock,
        newStock,
        delta: signedDelta,
      };
    });
  }

  /**
   * Decreases inventory stock atomically and appends a negative signed ledger transaction.
   * Throws InsufficientStockError if resulting stock would be negative (unless allowNegativeStock is true).
   */
  async decreaseStock(input: DecreaseStockInput): Promise<InventoryMutationResult> {
    const quantity = toPositiveDecimal(input.quantity, 'Decrease quantity');

    return executeWithClient(input.tx, async (client) => {
      const item = await client.inventoryItem.findUnique({
        where: { id: input.itemId },
      });

      if (!item) {
        throw new ItemNotFoundError(input.itemId);
      }

      if (!item.isActive) {
        throw new InactiveItemError(item.id, item.sku);
      }

      const previousStock = new Prisma.Decimal(item.currentStock);
      const newStock = previousStock.minus(quantity);

      if (newStock.lessThan(0) && !input.allowNegativeStock) {
        throw new InsufficientStockError(
          item.sku || item.id,
          previousStock.toString(),
          quantity.toString(),
          newStock.toString()
        );
      }

      const signedDelta = quantity.negated(); // Negative for stock decrease

      const unitCost = input.unitCost !== undefined ? toDecimal(input.unitCost, 'unitCost') : null;
      const totalCost =
        input.totalCost !== undefined
          ? toDecimal(input.totalCost, 'totalCost')
          : unitCost
            ? unitCost.times(quantity)
            : null;

      const [updatedItem, transaction] = await Promise.all([
        client.inventoryItem.update({
          where: { id: item.id },
          data: { currentStock: newStock },
        }),
        client.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: input.type,
            quantity: signedDelta,
            unitCost,
            totalCost,
            balanceAfter: newStock,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            performedById: input.performedById ?? null,
            notes: input.notes ?? null,
          },
        }),
      ]);

      return {
        item: updatedItem,
        transaction,
        previousStock,
        newStock,
        delta: signedDelta,
      };
    });
  }

  /**
   * Adjusts stock level via signed delta or target balance and creates an ADJUSTMENT transaction.
   */
  async adjustStock(input: AdjustStockInput): Promise<InventoryMutationResult> {
    if (input.quantityDelta === undefined && input.targetStock === undefined) {
      throw new InvalidQuantityError('Either quantityDelta or targetStock must be provided for stock adjustment.');
    }

    return executeWithClient(input.tx, async (client) => {
      const item = await client.inventoryItem.findUnique({
        where: { id: input.itemId },
      });

      if (!item) {
        throw new ItemNotFoundError(input.itemId);
      }

      if (!item.isActive) {
        throw new InactiveItemError(item.id, item.sku);
      }

      const previousStock = new Prisma.Decimal(item.currentStock);
      let signedDelta: Prisma.Decimal;
      let newStock: Prisma.Decimal;

      if (input.targetStock !== undefined) {
        const target = toDecimal(input.targetStock, 'targetStock');
        if (target.lessThan(0) && !input.allowNegativeStock) {
          throw new InsufficientStockError(
            item.sku || item.id,
            previousStock.toString(),
            previousStock.minus(target).toString(),
            target.toString()
          );
        }
        newStock = target;
        signedDelta = target.minus(previousStock);
      } else {
        const delta = toDecimal(input.quantityDelta!, 'quantityDelta');
        if (delta.isZero()) {
          throw new InvalidQuantityError('Adjustment quantityDelta cannot be zero.');
        }
        signedDelta = delta;
        newStock = previousStock.plus(signedDelta);

        if (newStock.lessThan(0) && !input.allowNegativeStock) {
          throw new InsufficientStockError(
            item.sku || item.id,
            previousStock.toString(),
            delta.negated().toString(),
            newStock.toString()
          );
        }
      }

      const unitCost = input.unitCost !== undefined ? toDecimal(input.unitCost, 'unitCost') : null;
      const totalCost = input.totalCost !== undefined ? toDecimal(input.totalCost, 'totalCost') : null;

      const [updatedItem, transaction] = await Promise.all([
        client.inventoryItem.update({
          where: { id: item.id },
          data: { currentStock: newStock },
        }),
        client.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: TransactionType.ADJUSTMENT,
            quantity: signedDelta,
            unitCost,
            totalCost,
            balanceAfter: newStock,
            referenceType: input.referenceType ?? 'STOCK_ADJUSTMENT',
            referenceId: input.referenceId ?? null,
            performedById: input.performedById ?? null,
            notes: input.notes ?? 'Manual stock adjustment',
          },
        }),
      ]);

      return {
        item: updatedItem,
        transaction,
        previousStock,
        newStock,
        delta: signedDelta,
      };
    });
  }

  /**
   * Retrieves the current stock balance and metadata for an inventory item.
   */
  async getCurrentStock(
    itemId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ item: InventoryItem; currentStock: Prisma.Decimal }> {
    return executeWithClient(tx, async (client) => {
      const item = await client.inventoryItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      return {
        item,
        currentStock: new Prisma.Decimal(item.currentStock),
      };
    });
  }

  /**
   * Retrieves paginated transaction history for a specific inventory item.
   */
  async getTransactionHistory(
    input: GetStockHistoryInput
  ): Promise<{ transactions: InventoryTransaction[]; meta: ApiPaginationMeta }> {
    const { itemId, page = 1, limit = 20, startDate, endDate, type, tx } = input;

    const validPage = Math.max(1, Math.floor(page));
    const validLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const skip = (validPage - 1) * validLimit;

    return executeWithClient(tx, async (client) => {
      const item = await client.inventoryItem.findUnique({
        where: { id: itemId },
        select: { id: true },
      });

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const where: Prisma.InventoryTransactionWhereInput = {
        itemId,
        ...(type ? { type } : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      };

      const [total, transactions] = await Promise.all([
        client.inventoryTransaction.count({ where }),
        client.inventoryTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: validLimit,
          include: {
            performedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / validLimit) || 1;

      return {
        transactions,
        meta: {
          page: validPage,
          limit: validLimit,
          total,
          totalPages,
        },
      };
    });
  }

  /**
   * Reconciles the cached InventoryItem.currentStock with the sum of all signed
   * InventoryTransaction records in the ledger for verification and audit purposes.
   */
  async reconcileStock(
    itemId: string,
    tx?: Prisma.TransactionClient
  ): Promise<StockReconciliationResult> {
    return executeWithClient(tx, async (client) => {
      const item = await client.inventoryItem.findUnique({
        where: { id: itemId },
        select: { id: true, sku: true, currentStock: true },
      });

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const transactions = await client.inventoryTransaction.findMany({
        where: { itemId },
        select: { quantity: true },
      });

      let ledgerStock = new Prisma.Decimal(0);
      for (const t of transactions) {
        ledgerStock = ledgerStock.plus(t.quantity);
      }

      const cachedStock = new Prisma.Decimal(item.currentStock);
      const discrepancy = cachedStock.minus(ledgerStock);
      const isConsistent = discrepancy.isZero();

      return {
        itemId: item.id,
        sku: item.sku,
        cachedStock,
        ledgerStock,
        discrepancy,
        isConsistent,
        totalTransactionsCount: transactions.length,
      };
    });
  }
}

export const inventoryService = new InventoryService();
