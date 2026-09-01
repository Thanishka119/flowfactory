import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from '../src/services/inventory.service.js';
import { prisma } from '../src/config/db.js';
import {
  ItemNotFoundError,
  InactiveItemError,
  InvalidQuantityError,
  InsufficientStockError,
} from '../src/errors/inventory.errors.js';
import { Prisma, TransactionType } from '@prisma/client';

describe('InventoryService (Centralized Inventory Ledger)', () => {
  let inventoryService: InventoryService;

  // Mock item for tests
  const mockItem = {
    id: '11111111-1111-1111-1111-111111111111',
    sku: 'RM-STEEL-001',
    name: 'High-Grade Steel Sheet 2mm',
    description: 'Cold rolled steel sheets',
    category: 'Raw Materials',
    type: 'RAW_MATERIAL' as const,
    unit: 'SHEET',
    currentStock: new Prisma.Decimal('100.0000'),
    minStock: new Prisma.Decimal('20.0000'),
    reorderLevel: new Prisma.Decimal('50.0000'),
    supplierId: 'supplier-1',
    expiryDate: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockInactiveItem = {
    ...mockItem,
    id: '22222222-2222-2222-2222-222222222222',
    sku: 'RM-DISCONTINUED-001',
    isActive: false,
  };

  // Mock transaction client
  let mockTxClient: {
    inventoryItem: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    inventoryTransaction: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    inventoryService = new InventoryService();

    mockTxClient = {
      inventoryItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      inventoryTransaction: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    // Default $transaction mock execution
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return callback(mockTxClient);
    });
  });

  // --------------------------------------------------------------------------
  // 1. POSITIVE STOCK INCREASE
  // --------------------------------------------------------------------------
  describe('increaseStock', () => {
    it('should successfully increase stock and record a positive signed ledger transaction', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'tx-001',
          createdAt: new Date(),
          ...data,
        })
      );

      const result = await inventoryService.increaseStock({
        itemId: mockItem.id,
        quantity: '50.0000',
        type: TransactionType.PURCHASE,
        unitCost: '12.50',
        referenceType: 'PURCHASE_ORDER',
        referenceId: 'PO-9901',
        notes: 'Received bulk shipment',
      });

      // Assertions on calculation
      expect(result.previousStock.toString()).toBe('100');
      expect(result.newStock.toString()).toBe('150');
      expect(result.delta.toString()).toBe('50');

      // Assert DB item updated
      expect(mockTxClient.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { currentStock: new Prisma.Decimal('150.0000') },
      });

      // Assert ledger entry created with signed positive quantity
      expect(mockTxClient.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemId: mockItem.id,
          type: TransactionType.PURCHASE,
          quantity: new Prisma.Decimal('50.0000'),
          unitCost: new Prisma.Decimal('12.50'),
          totalCost: new Prisma.Decimal('625'),
          balanceAfter: new Prisma.Decimal('150.0000'),
          referenceType: 'PURCHASE_ORDER',
          referenceId: 'PO-9901',
        }),
      });
    });

    it('should support PRODUCTION stock increases', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-002', ...data })
      );

      const result = await inventoryService.increaseStock({
        itemId: mockItem.id,
        quantity: 25,
        type: TransactionType.PRODUCTION,
        referenceType: 'PRODUCTION_ORDER',
        referenceId: 'MO-1002',
      });

      expect(result.newStock.toString()).toBe('125');
      expect(result.delta.toString()).toBe('25');
    });
  });

  // --------------------------------------------------------------------------
  // 2. STOCK DECREASE
  // --------------------------------------------------------------------------
  describe('decreaseStock', () => {
    it('should successfully decrease stock and record a negative signed ledger transaction', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-003', ...data })
      );

      const result = await inventoryService.decreaseStock({
        itemId: mockItem.id,
        quantity: '30.0000',
        type: TransactionType.CONSUMPTION,
        referenceType: 'PRODUCTION_ORDER',
        referenceId: 'PO-8812',
      });

      expect(result.previousStock.toString()).toBe('100');
      expect(result.newStock.toString()).toBe('70');
      expect(result.delta.toString()).toBe('-30');

      // Assert DB item updated
      expect(mockTxClient.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { currentStock: new Prisma.Decimal('70.0000') },
      });

      // Assert ledger entry created with negative signed quantity
      expect(mockTxClient.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemId: mockItem.id,
          type: TransactionType.CONSUMPTION,
          quantity: new Prisma.Decimal('-30.0000'),
          balanceAfter: new Prisma.Decimal('70.0000'),
          referenceType: 'PRODUCTION_ORDER',
          referenceId: 'PO-8812',
        }),
      });
    });

    it('should support SALE stock decrease', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-004', ...data })
      );

      const result = await inventoryService.decreaseStock({
        itemId: mockItem.id,
        quantity: 10,
        type: TransactionType.SALE,
        referenceType: 'SALE_ORDER',
        referenceId: 'SO-5001',
      });

      expect(result.newStock.toString()).toBe('90');
      expect(result.delta.toString()).toBe('-10');
    });
  });

  // --------------------------------------------------------------------------
  // 3. INSUFFICIENT STOCK REJECTION
  // --------------------------------------------------------------------------
  describe('insufficient stock rejection', () => {
    it('should throw InsufficientStockError when requested decrease exceeds current stock', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem); // currentStock: 100

      await expect(
        inventoryService.decreaseStock({
          itemId: mockItem.id,
          quantity: '150.0000',
          type: TransactionType.CONSUMPTION,
        })
      ).rejects.toThrow(InsufficientStockError);

      // Verify no DB mutations occurred
      expect(mockTxClient.inventoryItem.update).not.toHaveBeenCalled();
      expect(mockTxClient.inventoryTransaction.create).not.toHaveBeenCalled();
    });

    it('should allow negative stock only when allowNegativeStock flag is explicitly true', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-005', ...data })
      );

      const result = await inventoryService.decreaseStock({
        itemId: mockItem.id,
        quantity: '150.0000',
        type: TransactionType.CONSUMPTION,
        allowNegativeStock: true,
      });

      expect(result.newStock.toString()).toBe('-50');
      expect(result.delta.toString()).toBe('-150');
    });
  });

  // --------------------------------------------------------------------------
  // 4. INVALID QUANTITIES REJECTION
  // --------------------------------------------------------------------------
  describe('invalid quantities rejection', () => {
    it('should reject zero quantity for increaseStock', async () => {
      await expect(
        inventoryService.increaseStock({
          itemId: mockItem.id,
          quantity: 0,
          type: TransactionType.PURCHASE,
        })
      ).rejects.toThrow(InvalidQuantityError);
    });

    it('should reject negative quantity for increaseStock', async () => {
      await expect(
        inventoryService.increaseStock({
          itemId: mockItem.id,
          quantity: -25,
          type: TransactionType.PURCHASE,
        })
      ).rejects.toThrow(InvalidQuantityError);
    });

    it('should reject non-numeric / NaN quantity strings', async () => {
      await expect(
        inventoryService.decreaseStock({
          itemId: mockItem.id,
          quantity: 'invalid-number',
          type: TransactionType.CONSUMPTION,
        })
      ).rejects.toThrow(InvalidQuantityError);
    });
  });

  // --------------------------------------------------------------------------
  // 5. INACTIVE / NON-EXISTENT ITEM HANDLING
  // --------------------------------------------------------------------------
  describe('item existence and active status', () => {
    it('should throw ItemNotFoundError if item is not found', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(
        inventoryService.increaseStock({
          itemId: 'non-existent-id',
          quantity: 10,
          type: TransactionType.PURCHASE,
        })
      ).rejects.toThrow(ItemNotFoundError);
    });

    it('should throw InactiveItemError if item isActive is false', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockInactiveItem);

      await expect(
        inventoryService.increaseStock({
          itemId: mockInactiveItem.id,
          quantity: 10,
          type: TransactionType.PURCHASE,
        })
      ).rejects.toThrow(InactiveItemError);
    });
  });

  // --------------------------------------------------------------------------
  // 6 & 8. STOCK ADJUSTMENT (DELTA & TARGET STOCK)
  // --------------------------------------------------------------------------
  describe('adjustStock', () => {
    it('should adjust stock upwards via positive quantityDelta', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem); // 100
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-006', ...data })
      );

      const result = await inventoryService.adjustStock({
        itemId: mockItem.id,
        quantityDelta: 15,
        notes: 'Found extra items during cycle count',
      });

      expect(result.previousStock.toString()).toBe('100');
      expect(result.newStock.toString()).toBe('115');
      expect(result.delta.toString()).toBe('15');

      expect(mockTxClient.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: TransactionType.ADJUSTMENT,
          quantity: new Prisma.Decimal('15'),
          balanceAfter: new Prisma.Decimal('115'),
        }),
      });
    });

    it('should adjust stock downwards via negative quantityDelta', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem); // 100
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-007', ...data })
      );

      const result = await inventoryService.adjustStock({
        itemId: mockItem.id,
        quantityDelta: -20,
        notes: 'Damaged goods write-off',
      });

      expect(result.previousStock.toString()).toBe('100');
      expect(result.newStock.toString()).toBe('80');
      expect(result.delta.toString()).toBe('-20');
    });

    it('should adjust stock directly using targetStock', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem); // 100
      mockTxClient.inventoryItem.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...mockItem, currentStock: data.currentStock })
      );
      mockTxClient.inventoryTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tx-008', ...data })
      );

      const result = await inventoryService.adjustStock({
        itemId: mockItem.id,
        targetStock: 45,
        notes: 'Physical audit correction',
      });

      expect(result.previousStock.toString()).toBe('100');
      expect(result.newStock.toString()).toBe('45');
      expect(result.delta.toString()).toBe('-55');
    });

    it('should reject adjustment if delta is zero', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);

      await expect(
        inventoryService.adjustStock({
          itemId: mockItem.id,
          quantityDelta: 0,
        })
      ).rejects.toThrow(InvalidQuantityError);
    });

    it('should reject adjustment if neither quantityDelta nor targetStock is provided', async () => {
      await expect(
        inventoryService.adjustStock({
          itemId: mockItem.id,
        })
      ).rejects.toThrow(InvalidQuantityError);
    });
  });

  // --------------------------------------------------------------------------
  // 7. GET CURRENT STOCK & BALANCE RECONCILIATION
  // --------------------------------------------------------------------------
  describe('getCurrentStock and reconcileStock', () => {
    it('should return current stock for an item', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);

      const result = await inventoryService.getCurrentStock(mockItem.id, mockTxClient as any);

      expect(result.item.id).toBe(mockItem.id);
      expect(result.currentStock.toString()).toBe('100');
    });

    it('should reconcile cached stock against sum of ledger transactions', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryTransaction.findMany.mockResolvedValue([
        { quantity: new Prisma.Decimal('120.0000') },
        { quantity: new Prisma.Decimal('-20.0000') },
      ]);

      const recon = await inventoryService.reconcileStock(mockItem.id, mockTxClient as any);

      expect(recon.cachedStock.toString()).toBe('100');
      expect(recon.ledgerStock.toString()).toBe('100');
      expect(recon.isConsistent).toBe(true);
      expect(recon.discrepancy.toString()).toBe('0');
      expect(recon.totalTransactionsCount).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 9. TRANSACTION HISTORY RETRIEVAL
  // --------------------------------------------------------------------------
  describe('getTransactionHistory', () => {
    it('should return paginated transaction history with metadata', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue({ id: mockItem.id });
      mockTxClient.inventoryTransaction.count.mockResolvedValue(25);
      mockTxClient.inventoryTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          itemId: mockItem.id,
          type: TransactionType.PURCHASE,
          quantity: new Prisma.Decimal('50'),
          balanceAfter: new Prisma.Decimal('100'),
          createdAt: new Date(),
        },
      ]);

      const history = await inventoryService.getTransactionHistory({
        itemId: mockItem.id,
        page: 2,
        limit: 10,
        tx: mockTxClient as any,
      });

      expect(history.transactions.length).toBe(1);
      expect(history.meta.page).toBe(2);
      expect(history.meta.limit).toBe(10);
      expect(history.meta.total).toBe(25);
      expect(history.meta.totalPages).toBe(3);

      expect(mockTxClient.inventoryTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 10. ATOMIC TRANSACTION CLIENT PROPAGATION (tx)
  // --------------------------------------------------------------------------
  describe('Transaction client propagation', () => {
    it('should directly use outer transaction client (tx) when provided', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockResolvedValue({ ...mockItem, currentStock: new Prisma.Decimal('110') });
      mockTxClient.inventoryTransaction.create.mockResolvedValue({ id: 'tx-10' });

      await inventoryService.increaseStock({
        itemId: mockItem.id,
        quantity: 10,
        type: TransactionType.PURCHASE,
        tx: mockTxClient as any, // outer tx passed
      });

      // Should NOT call prisma.$transaction because outer tx was provided
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mockTxClient.inventoryItem.update).toHaveBeenCalled();
      expect(mockTxClient.inventoryTransaction.create).toHaveBeenCalled();
    });

    it('should open new prisma.$transaction when tx is omitted', async () => {
      mockTxClient.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockTxClient.inventoryItem.update.mockResolvedValue({ ...mockItem, currentStock: new Prisma.Decimal('110') });
      mockTxClient.inventoryTransaction.create.mockResolvedValue({ id: 'tx-11' });

      await inventoryService.increaseStock({
        itemId: mockItem.id,
        quantity: 10,
        type: TransactionType.PURCHASE,
        // tx omitted
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
