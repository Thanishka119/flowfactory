/**
 * M22 — Security & RBAC Audit Tests
 *
 * Verifies that:
 * A. Authentication middleware correctly rejects unauthenticated requests.
 * B. requirePermission correctly rejects forbidden roles.
 * C. Protected business operations enforce auth at the handler level.
 * D. Invoice verification requires all items verified AND matched.
 * E. Simulator endpoints are demonstrably read-only (no inventoryService calls).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceStatus, SaleStatus, PurchaseStatus, ProductionStatus } from '@prisma/client';
import { AppError } from '../src/middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockPrisma, mockInventoryService } = vi.hoisted(() => {
  const prismaMock: any = {
    user: { findUnique: vi.fn() },
    rolePermission: { findFirst: vi.fn() },
    inventoryItem: { findUnique: vi.fn(), findMany: vi.fn() },
    supplier: { findUnique: vi.fn(), findMany: vi.fn() },
    purchase: { findUnique: vi.fn() },
    invoice: { findUnique: vi.fn() },
    invoiceItem: { deleteMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    sale: { findUnique: vi.fn() },
    productionOrder: { findUnique: vi.fn() },
    ['$transaction']: vi.fn(),
  };
  const inventoryServiceMock = {
    increaseStock: vi.fn(),
    decreaseStock: vi.fn(),
    adjustStock: vi.fn(),
  };
  return { mockPrisma: prismaMock, mockInventoryService: inventoryServiceMock };
});

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));
vi.mock('../src/services/inventory.service.js', () => ({ inventoryService: mockInventoryService }));

import { authenticate, requirePermission } from '../src/middleware/auth.middleware.js';
import { verifyInvoice, processInvoice } from '../src/controllers/invoice.controller.js';
import {
  simulateProduction,
  simulateSale,
  getInventoryIntelligence,
} from '../src/controllers/simulator.controller.js';
import { completeSale } from '../src/controllers/sale.controller.js';
import { receivePurchase } from '../src/controllers/purchase.controller.js';
import { completeProductionOrder } from '../src/controllers/production.controller.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: undefined,
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockNext = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// A. AUTHENTICATION MIDDLEWARE
// ===========================================================================
describe('A. authenticate middleware', () => {
  it('rejects request with no Authorization header', () => {
    const req = mockReq({ headers: {} });
    authenticate(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects request with malformed Bearer header (no token)', () => {
    const req = mockReq({ headers: { authorization: 'Bearer ' } });
    authenticate(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('rejects request with non-Bearer scheme', () => {
    const req = mockReq({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    authenticate(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects request with an obviously invalid JWT token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer not.a.valid.jwt' } });
    authenticate(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });
});

// ===========================================================================
// B. RBAC — requirePermission
// ===========================================================================
describe('B. requirePermission middleware', () => {
  it('returns 401 when req.user is not set', async () => {
    const req = mockReq({ user: undefined });
    const guard = requirePermission('inventory:read');
    await guard(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('returns 403 when role does not have the required permission', async () => {
    mockPrisma.rolePermission.findFirst.mockResolvedValue(null);
    const req = mockReq({
      user: { userId: 'u-1', roleId: 'role-viewer', email: 'viewer@ff.local' },
    });
    const guard = requirePermission('production:execute');
    await guard(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('calls next() without error when role has the required permission', async () => {
    mockPrisma.rolePermission.findFirst.mockResolvedValue({ id: 'rp-1' });
    const req = mockReq({
      user: { userId: 'u-1', roleId: 'role-admin', email: 'admin@ff.local' },
    });
    const guard = requirePermission('inventory:read');
    await guard(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });
});

// ===========================================================================
// C. BUSINESS OPERATIONS — auth enforcement at handler level
// ===========================================================================
describe('C. Handler-level authentication checks', () => {
  it('receivePurchase returns 401 when req.user is missing', async () => {
    const req = mockReq({ params: { id: 'po-1' }, user: undefined });
    await receivePurchase(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('completeSale returns 401 when req.user is missing', async () => {
    const req = mockReq({ params: { id: 'sale-1' }, user: undefined });
    await completeSale(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('verifyInvoice returns 401 when req.user is missing', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: InvoiceStatus.EXTRACTED,
      items: [],
    });
    const req = mockReq({ params: { id: 'inv-1' }, body: {}, user: undefined });
    await verifyInvoice(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });
});

// ===========================================================================
// D. INVOICE VERIFICATION SAFETY
// ===========================================================================
describe('D. Invoice verification guard', () => {
  it('blocks verification when an item is not user-verified', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: InvoiceStatus.EXTRACTED,
      items: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          extractedDescription: 'Steel Plate',
          isUserVerified: false,
          matchedItemId: '22222222-2222-2222-2222-222222222222',
        },
      ],
    });

    const req = mockReq({
      params: { id: 'inv-1' },
      body: { items: [] },
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'role-1', email: 'a@b.com' },
    });

    await verifyInvoice(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('unverified');
    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
  });

  it('blocks verification when an item has no matched inventory item', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-2',
      status: InvoiceStatus.EXTRACTED,
      items: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          extractedDescription: 'Aluminium Rod',
          isUserVerified: true,
          matchedItemId: null,
        },
      ],
    });

    const req = mockReq({
      params: { id: 'inv-2' },
      body: { items: [{ id: '11111111-1111-1111-1111-111111111111', isUserVerified: true, matchedItemId: null }] },
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'role-1', email: 'a@b.com' },
    });

    await verifyInvoice(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('matched');
    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
  });

  it('blocks verification of an already VERIFIED invoice', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-3',
      status: InvoiceStatus.VERIFIED,
      items: [],
    });

    const req = mockReq({
      params: { id: 'inv-3' },
      body: {},
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'role-1', email: 'a@b.com' },
    });

    await verifyInvoice(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('VERIFIED');
  });

  it('OCR processInvoice does NOT modify stock — only sets EXTRACTED status', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-ocr-1',
      originalFilename: 'test_invoice.pdf',
      status: InvoiceStatus.UPLOADED,
      supplierId: null,
      invoiceNumber: null,
      invoiceDate: null,
      totalAmount: null,
      items: [],
    });
    mockPrisma.inventoryItem.findMany.mockResolvedValue([]);
    mockPrisma.supplier.findMany.mockResolvedValue([]);

    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        invoiceItem: { deleteMany: vi.fn(), createMany: vi.fn() },
        invoice: {
          update: vi.fn().mockResolvedValue({ id: 'inv-ocr-1', status: InvoiceStatus.EXTRACTED }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({ params: { id: 'inv-ocr-1' } });
    const res = mockRes();

    await processInvoice(req, res, mockNext);

    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.adjustStock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ===========================================================================
// E. SIMULATOR — READ-ONLY ENFORCEMENT
// ===========================================================================
describe('E. Simulator read-only enforcement', () => {
  it('simulateProduction never calls inventoryService methods', async () => {
    mockPrisma.inventoryItem.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === '11111111-1111-1111-1111-111111111111') {
        return Promise.resolve({
          id: '11111111-1111-1111-1111-111111111111',
          sku: 'FG-DESK',
          name: 'Executive Desk',
          unit: 'pcs',
          currentStock: 10,
          type: 'FINISHED_GOOD',
        });
      }
      return Promise.resolve({
        id: where.id,
        sku: 'RM-WOOD',
        name: 'Oak Plank',
        unit: 'sheet',
        currentStock: 20,
        reorderLevel: 5,
        type: 'RAW_MATERIAL',
        supplier: null,
      });
    });

    const req = mockReq({
      body: {
        finishedGoodItemId: '11111111-1111-1111-1111-111111111111',
        plannedQuantity: 3,
        requiredItems: [
          { itemId: '22222222-2222-2222-2222-222222222222', requiredQuantity: 6 },
        ],
      },
    });
    const res = mockRes();

    await simulateProduction(req, res, mockNext);

    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.adjustStock).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ simulationType: 'PRODUCTION' }),
      })
    );
  });

  it('simulateSale never calls inventoryService methods', async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      sku: 'FG-CHAIR',
      name: 'Office Chair',
      unit: 'pcs',
      currentStock: 50,
      type: 'FINISHED_GOOD',
    });

    const req = mockReq({
      body: {
        items: [{ itemId: '11111111-1111-1111-1111-111111111111', quantity: 5 }],
      },
    });
    const res = mockRes();

    await simulateSale(req, res, mockNext);

    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.adjustStock).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ simulationType: 'SALE' }),
      })
    );
  });

  it('getInventoryIntelligence never calls inventoryService methods or writes to DB', async () => {
    mockPrisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        sku: 'RM-STEEL',
        name: 'Steel Sheet',
        unit: 'sheet',
        currentStock: 2,
        reorderLevel: 10,
        minStock: 5,
        isActive: true,
        expiryDate: null,
        supplier: { id: 's-1', name: 'Apex Metals', leadTimeDays: 7 },
      },
    ]);

    const req = mockReq({});
    const res = mockRes();

    await getInventoryIntelligence(req, res, mockNext);

    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.adjustStock).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.success).toBe(true);
    expect(callArg.data).toHaveProperty('lowStockAlerts');
    expect(callArg.data).toHaveProperty('recommendations');
  });

  it('simulator shortage detection is purely calculated — no DB writes', async () => {
    mockPrisma.inventoryItem.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === '11111111-1111-1111-1111-111111111111') {
        return Promise.resolve({
          id: '11111111-1111-1111-1111-111111111111',
          sku: 'FG-TABLE',
          name: 'Table',
          unit: 'pcs',
          currentStock: 0,
          type: 'FINISHED_GOOD',
        });
      }
      return Promise.resolve({
        id: where.id,
        sku: 'RM-BOLT',
        name: 'Steel Bolt',
        unit: 'box',
        currentStock: 1,
        reorderLevel: 10,
        type: 'RAW_MATERIAL',
        supplier: null,
      });
    });

    const req = mockReq({
      body: {
        finishedGoodItemId: '11111111-1111-1111-1111-111111111111',
        plannedQuantity: 10,
        requiredItems: [
          { itemId: '22222222-2222-2222-2222-222222222222', requiredQuantity: 50 },
        ],
      },
    });
    const res = mockRes();

    await simulateProduction(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hasShortage: true }),
      })
    );
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// F. PURCHASE STATE MACHINE
// ===========================================================================
describe('F. Purchase state machine', () => {
  it('receiving a CANCELLED purchase returns 400', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        purchase: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'po-1',
            status: PurchaseStatus.CANCELLED,
            items: [],
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'po-1' },
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await receivePurchase(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
  });

  it('receiving an already RECEIVED purchase returns 400', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        purchase: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'po-2',
            status: PurchaseStatus.RECEIVED,
            items: [],
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'po-2' },
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await receivePurchase(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// G. PRODUCTION STATE MACHINE
// ===========================================================================
describe('G. Production state machine', () => {
  it('completing a COMPLETED production order returns 400', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        productionOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'prod-1',
            status: ProductionStatus.COMPLETED,
            requiredItems: [],
            finishedGoodItemId: 'fg-1',
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'prod-1' },
      body: {},
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await completeProductionOrder(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
  });

  it('completing a CANCELLED production order returns 400', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        productionOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'prod-2',
            status: ProductionStatus.CANCELLED,
            requiredItems: [],
            finishedGoodItemId: 'fg-1',
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'prod-2' },
      body: {},
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await completeProductionOrder(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
    expect(mockInventoryService.increaseStock).not.toHaveBeenCalled();
  });

  it('completing a DRAFT order (not yet started) returns 400', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        productionOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'prod-3',
            status: ProductionStatus.DRAFT,
            requiredItems: [],
            finishedGoodItemId: 'fg-1',
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'prod-3' },
      body: {},
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await completeProductionOrder(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('IN_PROGRESS');
  });
});

// ===========================================================================
// H. SALE STATE MACHINE
// ===========================================================================
describe('H. Sale state machine', () => {
  it('completing a CANCELLED sale returns 400 without touching stock', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        sale: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sale-c1',
            status: SaleStatus.CANCELLED,
            items: [],
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'sale-c1' },
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await completeSale(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
  });

  it('completing a sale with insufficient stock returns 400 without touching stock', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        sale: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sale-s1',
            saleNumber: 'SO-1001',
            customerName: 'Acme',
            status: SaleStatus.PENDING,
            items: [{ itemId: '11111111-1111-1111-1111-111111111111', quantity: 100, unitPrice: 50, totalPrice: 5000 }],
          }),
        },
        inventoryItem: {
          findUnique: vi.fn().mockResolvedValue({
            id: '11111111-1111-1111-1111-111111111111',
            sku: 'FG-CHAIR',
            name: 'Chair',
            currentStock: '5',
          }),
        },
      };
      return cb(tx);
    });

    const req = mockReq({
      params: { id: 'sale-s1' },
      user: { userId: '11111111-1111-1111-1111-111111111111', roleId: 'r-1', email: 'a@b.com' },
    });

    await completeSale(req, mockRes(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const err = mockNext.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('Insufficient stock');
    expect(mockInventoryService.decreaseStock).not.toHaveBeenCalled();
  });
});
