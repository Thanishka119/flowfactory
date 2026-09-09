import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaleStatus, TransactionType } from '@prisma/client';

const { mockPrisma, mockInventoryService } = vi.hoisted(() => {
  const prismaMock: any = {
    inventoryItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    sale: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
    },
    purchase: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    productionOrder: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    invoiceItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    inventoryTransaction: {
      findMany: vi.fn(),
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
  createSale,
  completeSale,
  cancelSale,
} from '../src/controllers/sale.controller.js';
import { getDashboardSummary } from '../src/controllers/dashboard.controller.js';
import { simulateProduction, simulateSale } from '../src/controllers/simulator.controller.js';
import { processInvoice } from '../src/controllers/invoice.controller.js';

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    query: {},
    params: {},
    body: {},
    user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'role-1', email: 'sales@flowfactory.local' },
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

describe('M14-M21 Consolidated Test Suite', () => {
  describe('Sales Workflow', () => {
    it('creates sale in PENDING status and does NOT call inventoryService', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        sku: 'FG-DESK',
        name: 'Executive Desk',
        isActive: true,
      });

      mockPrisma.sale.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'SO-1001',
        customerName: 'Acme Corp',
        status: SaleStatus.PENDING,
        totalAmount: 500,
      });

      const req = mockRequest({
        body: {
          customerName: 'Acme Corp',
          items: [
            { itemId: '11111111-1111-1111-1111-111111111111', quantity: 2, unitPrice: 250 },
          ],
        },
      });
      const res = mockResponse();

      await createSale(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    });

    it('completes sale atomically using inventoryService SALE type and decrements stock', async () => {
      const sale = {
        id: 'sale-1',
        saleNumber: 'SO-1001',
        customerName: 'Acme Corp',
        status: SaleStatus.PENDING,
        items: [
          { itemId: '11111111-1111-1111-1111-111111111111', quantity: 2, unitPrice: 250, totalPrice: 500 },
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          sale: {
            findUnique: vi.fn().mockResolvedValue(sale),
            update: vi.fn().mockResolvedValue({ ...sale, status: SaleStatus.COMPLETED }),
          },
          inventoryItem: {
            findUnique: vi.fn().mockResolvedValue({
              id: '11111111-1111-1111-1111-111111111111',
              sku: 'FG-DESK',
              name: 'Executive Desk',
              currentStock: '10',
            }),
          },
        };
        return cb(tx);
      });

      const req = mockRequest({ params: { id: 'sale-1' } });
      const res = mockResponse();

      await completeSale(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockInventoryService.decreaseStock).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: '11111111-1111-1111-1111-111111111111',
          quantity: 2,
          type: TransactionType.SALE,
        })
      );
    });

    it('prevents completion if finished goods stock is insufficient', async () => {
      const sale = {
        id: 'sale-1',
        status: SaleStatus.PENDING,
        items: [{ itemId: '11111111-1111-1111-1111-111111111111', quantity: 20 }],
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          sale: { findUnique: vi.fn().mockResolvedValue(sale) },
          inventoryItem: {
            findUnique: vi.fn().mockResolvedValue({
              id: '11111111-1111-1111-1111-111111111111',
              sku: 'FG-DESK',
              name: 'Executive Desk',
              currentStock: '5',
            }),
          },
        };
        return cb(tx);
      });

      const req = mockRequest({ params: { id: 'sale-1' } });
      const res = mockResponse();

      await completeSale(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Insufficient stock') })
      );
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    });

    it('blocks duplicate completion of completed or cancelled sales', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          sale: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sale-1',
              status: SaleStatus.COMPLETED,
              items: [],
            }),
          },
        };
        return cb(tx);
      });

      const req = mockRequest({ params: { id: 'sale-1' } });
      const res = mockResponse();

      await completeSale(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Only PENDING sales can be completed') })
      );
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    });
  });

  describe('Dashboard Summary', () => {
    it('returns calculated metrics and low-stock indicators without mutating data', async () => {
      mockPrisma.inventoryItem.count.mockResolvedValue(10);
      mockPrisma.purchase.count.mockResolvedValue(2);
      mockPrisma.invoice.count.mockResolvedValue(1);
      mockPrisma.productionOrder.count.mockResolvedValue(1);
      mockPrisma.sale.count.mockResolvedValue(4);
      mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
      mockPrisma.purchase.findMany.mockResolvedValue([]);
      mockPrisma.productionOrder.findMany.mockResolvedValue([]);
      mockPrisma.sale.findMany.mockResolvedValue([]);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { id: '1', sku: 'RM-1', name: 'Raw 1', currentStock: 2, reorderLevel: 5, minStock: 1, unit: 'kg', type: 'RAW_MATERIAL' },
      ]);

      const req = mockRequest();
      const res = mockResponse();

      await getDashboardSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            metrics: expect.objectContaining({
              totalItems: 10,
              lowStockCount: 1,
            }),
          }),
        })
      );
    });
  });

  describe('What-If Simulator', () => {
    it('simulates production stock and shortages without mutating database', async () => {
      mockPrisma.inventoryItem.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === '11111111-1111-1111-1111-111111111111') {
          return Promise.resolve({
            id: '11111111-1111-1111-1111-111111111111',
            sku: 'FG-1',
            name: 'Finished Product',
            currentStock: 10,
            unit: 'pcs',
          });
        }
        if (where.id === '22222222-2222-2222-2222-222222222222') {
          return Promise.resolve({
            id: '22222222-2222-2222-2222-222222222222',
            sku: 'RM-1',
            name: 'Material',
            currentStock: 5,
            reorderLevel: 10,
            unit: 'kg',
            supplier: { id: 's-1', name: 'Apex', leadTimeDays: 7 },
          });
        }
        return Promise.resolve(null);
      });

      const req = mockRequest({
        body: {
          finishedGoodItemId: '11111111-1111-1111-1111-111111111111',
          plannedQuantity: 5,
          requiredItems: [
            { itemId: '22222222-2222-2222-2222-222222222222', requiredQuantity: 15 },
          ],
        },
      });
      const res = mockResponse();

      await simulateProduction(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            hasShortage: true,
            finishedGood: expect.objectContaining({
              currentStock: 10,
              projectedStock: 15,
            }),
          }),
        })
      );
    });
  });

  describe('Invoice OCR & Verification Rule', () => {
    it('extracts line items safely into EXTRACTED status without modifying stock', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        originalFilename: 'test_invoice.pdf',
        status: 'UPLOADED',
        items: [],
      });
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { id: '11111111-1111-1111-1111-111111111111', sku: 'RM-STEEL', name: 'Steel' },
      ]);
      mockPrisma.supplier.findMany.mockResolvedValue([{ id: 'sup-1', name: 'Apex' }]);

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          invoiceItem: { deleteMany: vi.fn(), createMany: vi.fn() },
          invoice: {
            update: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'EXTRACTED' }),
          },
        };
        return cb(tx);
      });

      const req = mockRequest({ params: { id: 'inv-1' } });
      const res = mockResponse();

      await processInvoice(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
      expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    });
  });
});
