import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseStatus, TransactionType } from '@prisma/client';

const { mockPrisma, mockInventoryService } = vi.hoisted(() => {
  const prismaMock: any = {
    supplier: {
      findUnique: vi.fn(),
    },
    purchase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ['$transaction']: vi.fn(),
  };

  const inventoryServiceMock = {
    increaseStock: vi.fn(),
  };

  return { mockPrisma: prismaMock, mockInventoryService: inventoryServiceMock };
});

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));
vi.mock('../src/services/inventory.service.js', () => ({ inventoryService: mockInventoryService }));

import {
  listPurchases,
  getPurchase,
  createPurchase,
  cancelPurchase,
  receivePurchase,
} from '../src/controllers/purchase.controller.js';

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

describe('Purchase Controller', () => {
  describe('listPurchases', () => {
    it('returns paginated purchases', async () => {
      const purchases = [
        { id: '1', purchaseNumber: 'PO-001', status: PurchaseStatus.PENDING, totalAmount: 500 },
      ];
      mockPrisma.purchase.count.mockResolvedValue(1);
      mockPrisma.purchase.findMany.mockResolvedValue(purchases);

      const req = mockRequest({ query: { page: '1', limit: '20' } });
      const res = mockResponse();

      await listPurchases(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: purchases }),
      );
    });
  });

  describe('createPurchase', () => {
    it('creates purchase order and does NOT call inventoryService', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111', name: 'Apex' });
      mockPrisma.purchase.create.mockResolvedValue({
        id: 'p-1',
        purchaseNumber: 'PO-TEST',
        status: PurchaseStatus.PENDING,
        totalAmount: 100,
      });

      const req = mockRequest({
        body: {
          supplierId: '11111111-1111-1111-1111-111111111111',
          items: [{ itemId: '22222222-2222-2222-2222-222222222222', quantity: 10, unitPrice: 10 }],
        },
      });
      const res = mockResponse();

      await createPurchase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    });
  });

  describe('cancelPurchase', () => {
    it('cancels pending purchase', async () => {
      mockPrisma.purchase.findUnique.mockResolvedValue({ id: 'p-1', status: PurchaseStatus.PENDING });
      mockPrisma.purchase.update.mockResolvedValue({ id: 'p-1', status: PurchaseStatus.CANCELLED });

      const req = mockRequest({ params: { id: 'p-1' } });
      const res = mockResponse();

      await cancelPurchase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPrisma.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p-1' }, data: { status: PurchaseStatus.CANCELLED } }),
      );
    });
  });

  describe('receivePurchase (Goods Receipt)', () => {
    it('calls inventoryService.increaseStock for all items inside transaction and updates status to RECEIVED', async () => {
      const mockPurchase = {
        id: 'p-1',
        purchaseNumber: 'PO-001',
        status: PurchaseStatus.PENDING,
        items: [
          { itemId: 'item-1', quantity: 10, unitPrice: 5, totalPrice: 50 },
          { itemId: 'item-2', quantity: 20, unitPrice: 2, totalPrice: 40 },
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          purchase: {
            findUnique: vi.fn().mockResolvedValue(mockPurchase),
            update: vi.fn().mockResolvedValue({
              ...mockPurchase,
              status: PurchaseStatus.RECEIVED,
              receivedById: 'user-1',
            }),
          },
        };
        return callback(txMock);
      });

      const req = mockRequest({ params: { id: 'p-1' } });
      const res = mockResponse();

      await receivePurchase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockInventoryService.increaseStock).toHaveBeenCalledTimes(2);
      expect(mockInventoryService.increaseStock).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item-1',
          quantity: 10,
          type: TransactionType.PURCHASE,
          unitCost: 5,
          totalCost: 50,
          referenceType: 'PURCHASE',
          referenceId: 'p-1',
          performedById: 'user-1',
        }),
      );
    });

    it('rejects receiving if purchase is already RECEIVED (prevent double receive)', async () => {
      const mockPurchase = {
        id: 'p-1',
        purchaseNumber: 'PO-001',
        status: PurchaseStatus.RECEIVED,
        items: [],
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          purchase: {
            findUnique: vi.fn().mockResolvedValue(mockPurchase),
          },
        };
        return callback(txMock);
      });

      const req = mockRequest({ params: { id: 'p-1' } });
      const res = mockResponse();

      await receivePurchase(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Only PENDING purchases can be received'),
          statusCode: 400,
        }),
      );
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    });

    it('rejects receiving if purchase is CANCELLED', async () => {
      const mockPurchase = {
        id: 'p-1',
        purchaseNumber: 'PO-001',
        status: PurchaseStatus.CANCELLED,
        items: [],
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          purchase: {
            findUnique: vi.fn().mockResolvedValue(mockPurchase),
          },
        };
        return callback(txMock);
      });

      const req = mockRequest({ params: { id: 'p-1' } });
      const res = mockResponse();

      await receivePurchase(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Only PENDING purchases can be received'),
          statusCode: 400,
        }),
      );
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    });
  });
});
