import { AppError } from '../middleware/errorHandler.js';

export class ItemNotFoundError extends AppError {
  constructor(itemId: string) {
    super(`Inventory item with ID '${itemId}' not found`, 404, 'ITEM_NOT_FOUND', { itemId });
  }
}

export class InactiveItemError extends AppError {
  constructor(itemId: string, sku?: string) {
    super(
      `Inventory item '${sku || itemId}' is inactive and cannot perform stock operations`,
      400,
      'INACTIVE_ITEM',
      { itemId, sku }
    );
  }
}

export class InvalidQuantityError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'INVALID_QUANTITY', details);
  }
}

export class InsufficientStockError extends AppError {
  constructor(
    itemId: string,
    currentStock: string | number,
    requestedQuantity: string | number,
    resultingStock: string | number
  ) {
    super(
      `Insufficient stock for item '${itemId}'. Available: ${currentStock}, Requested reduction: ${requestedQuantity}, Resulting: ${resultingStock}`,
      400,
      'INSUFFICIENT_STOCK',
      {
        itemId,
        currentStock: String(currentStock),
        requestedQuantity: String(requestedQuantity),
        resultingStock: String(resultingStock),
      }
    );
  }
}

export class InvalidTransactionTypeError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'INVALID_TRANSACTION_TYPE', details);
  }
}

export class InventoryTransactionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 500, 'INVENTORY_TRANSACTION_FAILED', details);
  }
}
