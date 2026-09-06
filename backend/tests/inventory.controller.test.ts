import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma, InventoryItemType, TransactionType } from '@prisma/client';

const { mockPrisma, mockAdjustStock, mockGetTransactionHistory } = vi.hoisted(() => ({
  mockPrisma: {
    inventoryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  mockAdjustStock: vi.fn(),
  mockGetTransactionHistory: vi.fn(),
}));

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));

vi.mock('../src/services/inventory.service.js', () => ({
  inventoryService: {
    adjustStock: mockAdjustStock,
    getTransactionHistory: mockGetTransactionHistory,
  },
}));

import {
  listInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
  getTransactionHistory,
  adjustStock,
} from '../src/controllers/inventory.controller.js';

// Helper to create mock request
function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    query: {},
    params: {},
    body: {},
    user: { userId: 'user-1', roleId: 'role-1', email: 'test@test.com' },
    ...overrides,
  } as any;
}

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockNext = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Inventory Controller', () => {
  describe('listInventoryItems', () => {
    it('returns paginated inventory list with stock status', async () => {
      const items = [
        {
          id: '1', sku: 'RM-001', name: 'Steel', category: 'Raw Materials',
          type: InventoryItemType.RAW_MATERIAL, unit: 'SHEET',
          currentStock: new Prisma.Decimal('100'), minStock: new Prisma.Decimal('20'),
          reorderLevel: new Prisma.Decimal('50'), isActive: true,
          supplierId: null, supplier: null, description: null, expiryDate: null,
          createdAt: new Date(), updatedAt: new Date(),
        },
        {
          id: '2', sku: 'RM-002', name: 'Wood', category: 'Raw Materials',
          type: InventoryItemType.RAW_MATERIAL, unit: 'PIECE',
          currentStock: new Prisma.Decimal('0'), minStock: new Prisma.Decimal('30'),
          reorderLevel: new Prisma.Decimal('60'), isActive: true,
          supplierId: null, supplier: null, description: null, expiryDate: null,
          createdAt: new Date(), updatedAt: new Date(),
        },
      ];

      mockPrisma.inventoryItem.count.mockResolvedValue(2);
      mockPrisma.inventoryItem.findMany.mockResolvedValue(items);

      const req = mockRequest({ query: { page: '1', limit: '20' } });
      const res = mockResponse();

      await listInventoryItems(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ sku: 'RM-001', stockStatus: 'NORMAL' }),
            expect.objectContaining({ sku: 'RM-002', stockStatus: 'OUT_OF_STOCK' }),
          ]),
          meta: expect.objectContaining({ page: 1, limit: 20, total: 2, totalPages: 1 }),
        }),
      );
    });

    it('applies search filter', async () => {
      mockPrisma.inventoryItem.count.mockResolvedValue(0);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      const req = mockRequest({ query: { search: 'steel' } });
      const res = mockResponse();

      await listInventoryItems(req, res, mockNext);

      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ sku: { contains: 'steel', mode: 'insensitive' } }),
              expect.objectContaining({ name: { contains: 'steel', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getInventoryItem', () => {
    it('returns item with stock status', async () => {
      const item = {
        id: '1', sku: 'RM-001', name: 'Steel', category: 'Raw Materials',
        type: InventoryItemType.RAW_MATERIAL, unit: 'SHEET',
        currentStock: new Prisma.Decimal('30'), minStock: new Prisma.Decimal('20'),
        reorderLevel: new Prisma.Decimal('50'), isActive: true,
        supplierId: null, supplier: null, description: null, expiryDate: null,
        createdAt: new Date(), updatedAt: new Date(),
      };

      mockPrisma.inventoryItem.findUnique.mockResolvedValue(item);

      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await getInventoryItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ sku: 'RM-001', stockStatus: 'LOW_STOCK' }),
        }),
      );
    });

    it('returns 404 for non-existent item', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      await getInventoryItem(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 }),
      );
    });
  });

  describe('createInventoryItem', () => {
    it('creates item with valid data', async () => {
      const created = {
        id: '1', sku: 'NEW-001', name: 'New Item', category: 'Raw Materials',
        type: InventoryItemType.RAW_MATERIAL, unit: 'KG',
        currentStock: new Prisma.Decimal('0'), minStock: new Prisma.Decimal('10'),
        reorderLevel: new Prisma.Decimal('20'), isActive: true,
        supplierId: null, supplier: null, description: 'test', expiryDate: null,
        createdAt: new Date(), updatedAt: new Date(),
      };

      mockPrisma.inventoryItem.create.mockResolvedValue(created);

      const req = mockRequest({
        body: {
          sku: 'NEW-001', name: 'New Item', category: 'Raw Materials',
          type: 'RAW_MATERIAL', unit: 'KG', minStock: 10, reorderLevel: 20,
          description: 'test',
        },
      });
      const res = mockResponse();

      await createInventoryItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ sku: 'NEW-001' }) }),
      );
    });

    it('rejects invalid data (missing sku)', async () => {
      const req = mockRequest({
        body: { name: 'No SKU', category: 'Test', type: 'RAW_MATERIAL', unit: 'KG' },
      });
      const res = mockResponse();

      await createInventoryItem(req, res, mockNext);

      // ZodError is thrown and caught by errorHandler or next
      expect(mockNext).toHaveBeenCalled();
    });

    it('handles duplicate SKU', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      mockPrisma.inventoryItem.create.mockRejectedValue(prismaError);

      const req = mockRequest({
        body: {
          sku: 'DUP-001', name: 'Dup', category: 'Test',
          type: 'RAW_MATERIAL', unit: 'KG',
        },
      });
      const res = mockResponse();

      await createInventoryItem(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 409, code: 'DUPLICATE_SKU' }),
      );
    });
  });

  describe('adjustStock', () => {
    it('calls inventoryService.adjustStock with correct params', async () => {
      const mockResult = {
        item: { id: '1', currentStock: new Prisma.Decimal('110') },
        transaction: { id: 'tx-1' },
        previousStock: new Prisma.Decimal('100'),
        newStock: new Prisma.Decimal('110'),
        delta: new Prisma.Decimal('10'),
      };

      mockAdjustStock.mockResolvedValue(mockResult);

      const req = mockRequest({
        params: { id: 'item-1' },
        body: { quantityDelta: 10, notes: 'Stock count adjustment' },
      });
      const res = mockResponse();

      await adjustStock(req, res, mockNext);

      expect(mockAdjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item-1',
          quantityDelta: 10,
          performedById: 'user-1',
          notes: 'Stock count adjustment',
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects zero delta', async () => {
      const req = mockRequest({
        params: { id: 'item-1' },
        body: { quantityDelta: 0, notes: 'No change' },
      });
      const res = mockResponse();

      await adjustStock(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('rejects missing notes', async () => {
      const req = mockRequest({
        params: { id: 'item-1' },
        body: { quantityDelta: 5 },
      });
      const res = mockResponse();

      await adjustStock(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getTransactionHistory', () => {
    it('delegates to inventoryService.getTransactionHistory', async () => {
      const mockResult = {
        transactions: [{ id: 'tx-1', type: TransactionType.ADJUSTMENT }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockGetTransactionHistory.mockResolvedValue(mockResult);

      const req = mockRequest({
        params: { id: 'item-1' },
        query: { page: '1', limit: '20' },
      });
      const res = mockResponse();

      await getTransactionHistory(req, res, mockNext);

      expect(mockGetTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 'item-1', page: 1, limit: 20 }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deactivateInventoryItem', () => {
    it('sets isActive to false', async () => {
      const item = {
        id: '1', sku: 'RM-001', name: 'Steel', isActive: false,
        currentStock: new Prisma.Decimal('0'), reorderLevel: new Prisma.Decimal('50'),
      };

      mockPrisma.inventoryItem.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.inventoryItem.update.mockResolvedValue(item);

      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await deactivateInventoryItem(req, res, mockNext);

      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { isActive: false },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
