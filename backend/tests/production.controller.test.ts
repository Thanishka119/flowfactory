import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionStatus, TransactionType } from '@prisma/client';

const { mockPrisma, mockInventoryService } = vi.hoisted(() => {
  const prismaMock: any = {
    inventoryItem: {
      findUnique: vi.fn(),
    },
    productionOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productionItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    consumptionRecord: {
      create: vi.fn(),
    },
    finishedGood: {
      create: vi.fn(),
    },
    ['$transaction']: vi.fn(),
  };

  const inventoryServiceMock = {
    increaseStock: vi.fn(),
    decreaseStock: vi.fn(),
  };

  return { mockPrisma: prismaMock, mockInventoryService: inventoryServiceMock };
});

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));
vi.mock('../src/services/inventory.service.js', () => ({ inventoryService: mockInventoryService }));

import {
  listProductionOrders,
  getProductionOrder,
  createProductionOrder,
  updateProductionOrder,
  startProductionOrder,
  completeProductionOrder,
  cancelProductionOrder,
} from '../src/controllers/production.controller.js';

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    query: {},
    params: {},
    body: {},
    user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'role-1', email: 'pm@flowfactory.local' },
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

describe('Production Controller', () => {
  describe('createProductionOrder', () => {
    it('creates production order as DRAFT and does NOT call inventoryService', async () => {
      mockPrisma.inventoryItem.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === '11111111-1111-1111-1111-111111111111') {
          return Promise.resolve({
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Widget',
            sku: 'FG-WIDGET',
            type: 'FINISHED_GOOD',
            isActive: true,
          });
        }
        if (where.id === '22222222-2222-2222-2222-222222222222') {
          return Promise.resolve({
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Steel',
            sku: 'RM-STEEL',
            type: 'RAW_MATERIAL',
            isActive: true,
          });
        }
        return Promise.resolve(null);
      });

      mockPrisma.productionOrder.create.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'PROD-TEST',
        status: ProductionStatus.DRAFT,
        plannedQuantity: 10,
      });

      const req = mockRequest({
        body: {
          finishedGoodItemId: '11111111-1111-1111-1111-111111111111',
          plannedQuantity: 10,
          requiredItems: [
            { itemId: '22222222-2222-2222-2222-222222222222', requiredQuantity: 5 },
          ],
        },
      });
      const res = mockResponse();

      await createProductionOrder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    });

    it('fails when finished good item is not type FINISHED_GOOD', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        type: 'RAW_MATERIAL',
        isActive: true,
      });

      const req = mockRequest({
        body: {
          finishedGoodItemId: '11111111-1111-1111-1111-111111111111',
          plannedQuantity: 10,
          requiredItems: [
            { itemId: '22222222-2222-2222-2222-222222222222', requiredQuantity: 5 },
          ],
        },
      });
      const res = mockResponse();

      await createProductionOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('FINISHED_GOOD') })
      );
    });
  });

  describe('startProductionOrder', () => {
    it('transitions DRAFT to IN_PROGRESS and does NOT modify stock', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: ProductionStatus.DRAFT,
        requiredItems: [{ id: 'req-1', itemId: 'rm-1', requiredQuantity: 5 }],
      });
      mockPrisma.productionOrder.update.mockResolvedValue({
        id: 'po-1',
        status: ProductionStatus.IN_PROGRESS,
      });

      const req = mockRequest({ params: { id: 'po-1' } });
      const res = mockResponse();

      await startProductionOrder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    });

    it('rejects starting an order that is not DRAFT (e.g. COMPLETED or CANCELLED)', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: ProductionStatus.COMPLETED,
        requiredItems: [{ id: 'req-1' }],
      });

      const req = mockRequest({ params: { id: 'po-1' } });
      const res = mockResponse();

      await startProductionOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Only DRAFT orders can be started') })
      );
    });
  });

  describe('completeProductionOrder', () => {
    it('consumes materials and increases finished-good stock atomically', async () => {
      const order = {
        id: 'po-1',
        orderNumber: 'PROD-100',
        status: ProductionStatus.IN_PROGRESS,
        finishedGoodItemId: 'fg-1',
        plannedQuantity: 10,
        requiredItems: [
          { itemId: 'rm-1', requiredQuantity: 20 },
          { itemId: 'rm-2', requiredQuantity: 5 },
        ],
      };

      // Mock $transaction executing callback
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          productionOrder: {
            findUnique: vi.fn().mockResolvedValue(order),
            update: vi.fn().mockResolvedValue({ ...order, status: ProductionStatus.COMPLETED }),
          },
          inventoryItem: {
            findUnique: vi.fn().mockImplementation(({ where }: any) => {
              if (where.id === 'rm-1') return Promise.resolve({ id: 'rm-1', sku: 'RM-1', name: 'Material 1', currentStock: '50' });
              if (where.id === 'rm-2') return Promise.resolve({ id: 'rm-2', sku: 'RM-2', name: 'Material 2', currentStock: '10' });
              return Promise.resolve(null);
            }),
          },
          consumptionRecord: { create: vi.fn().mockResolvedValue({}) },
          finishedGood: { create: vi.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const req = mockRequest({
        params: { id: 'po-1' },
        body: { actualQuantity: 10 },
      });
      const res = mockResponse();

      await completeProductionOrder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockInventoryService.decreaseStock).toHaveBeenCalledTimes(2);
      expect(mockInventoryService.decreaseStock).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'rm-1',
          quantity: 20,
          type: TransactionType.CONSUMPTION,
        })
      );
      expect(mockInventoryService.decreaseStock).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'rm-2',
          quantity: 5,
          type: TransactionType.CONSUMPTION,
        })
      );
      expect(mockInventoryService.increaseStock).toHaveBeenCalledTimes(1);
      expect(mockInventoryService.increaseStock).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'fg-1',
          quantity: 10,
          type: TransactionType.PRODUCTION,
        })
      );
    });

    it('rejects completion if order is DRAFT or already COMPLETED', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          productionOrder: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'po-1',
              status: ProductionStatus.COMPLETED,
            }),
          },
        };
        return cb(tx);
      });

      const req = mockRequest({ params: { id: 'po-1' } });
      const res = mockResponse();

      await completeProductionOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Only IN_PROGRESS orders can be completed') })
      );
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    });

    it('prevents completion and rolls back if material stock is insufficient', async () => {
      const order = {
        id: 'po-1',
        orderNumber: 'PROD-100',
        status: ProductionStatus.IN_PROGRESS,
        finishedGoodItemId: 'fg-1',
        plannedQuantity: 10,
        requiredItems: [
          { itemId: 'rm-1', requiredQuantity: 50 },
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          productionOrder: {
            findUnique: vi.fn().mockResolvedValue(order),
          },
          inventoryItem: {
            findUnique: vi.fn().mockResolvedValue({ id: 'rm-1', sku: 'RM-1', name: 'Material 1', currentStock: '10' }),
          },
        };
        return cb(tx);
      });

      const req = mockRequest({ params: { id: 'po-1' } });
      const res = mockResponse();

      await completeProductionOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Insufficient stock') })
      );
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    });
  });

  describe('cancelProductionOrder', () => {
    it('cannot cancel COMPLETED production order', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: ProductionStatus.COMPLETED,
      });

      const req = mockRequest({ params: { id: 'po-1' } });
      const res = mockResponse();

      await cancelProductionOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Cannot cancel a COMPLETED') })
      );
    });

    it('cancels DRAFT or IN_PROGRESS production order', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: ProductionStatus.IN_PROGRESS,
      });
      mockPrisma.productionOrder.update.mockResolvedValue({
        id: 'po-1',
        status: ProductionStatus.CANCELLED,
      });

      const req = mockRequest({ params: { id: 'po-1' } });
      const res = mockResponse();

      await cancelProductionOrder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPrisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ProductionStatus.CANCELLED },
        })
      );
    });
  });
});
