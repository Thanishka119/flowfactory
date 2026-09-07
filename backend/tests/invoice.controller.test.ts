import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceStatus } from '@prisma/client';

const { mockPrisma } = vi.hoisted(() => {
  const prismaMock: any = {
    invoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoiceItem: {
      update: vi.fn(),
    },
    ['$transaction']: vi.fn(),
  };

  return { mockPrisma: prismaMock };
});

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));

import {
  listInvoices,
  getInvoice,
  createInvoice,
  verifyInvoice,
} from '../src/controllers/invoice.controller.js';

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

describe('Invoice Controller', () => {
  describe('listInvoices', () => {
    it('returns paginated invoices', async () => {
      const invoices = [
        { id: '1', invoiceNumber: 'INV-001', status: InvoiceStatus.UPLOADED },
      ];
      mockPrisma.invoice.count.mockResolvedValue(1);
      mockPrisma.invoice.findMany.mockResolvedValue(invoices);

      const req = mockRequest({ query: { page: '1', limit: '20' } });
      const res = mockResponse();

      await listInvoices(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: invoices }),
      );
    });
  });

  describe('createInvoice', () => {
    it('creates an invoice with initial status', async () => {
      const created = { id: 'inv-1', originalFilename: 'invoice.pdf', status: InvoiceStatus.UPLOADED };
      mockPrisma.invoice.create.mockResolvedValue(created);

      const req = mockRequest({
        body: { originalFilename: 'invoice.pdf', fileSize: 1024 },
      });
      const res = mockResponse();

      await createInvoice(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: created,
      });
    });
  });

  describe('verifyInvoice', () => {
    it('verifies invoice and updates verifiedById and items', async () => {
      const existing = { id: 'inv-1', status: InvoiceStatus.EXTRACTED, items: [] };
      mockPrisma.invoice.findUnique.mockResolvedValue(existing);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const txMock = {
          invoiceItem: { update: vi.fn() },
          invoice: {
            update: vi.fn().mockResolvedValue({
              id: 'inv-1',
              status: InvoiceStatus.VERIFIED,
              verifiedById: 'user-1',
            }),
          },
        };
        return callback(txMock);
      });

      const req = mockRequest({
        params: { id: 'inv-1' },
        body: {
          items: [{ id: '11111111-1111-1111-1111-111111111111', matchedItemId: '22222222-2222-2222-2222-222222222222', isUserVerified: true }],
        },
      });
      const res = mockResponse();

      await verifyInvoice(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Invoice verified successfully',
        }),
      );
    });

    it('rejects verification if an item is not verified', async () => {
      const existing = {
        id: 'inv-1',
        status: InvoiceStatus.EXTRACTED,
        items: [
          { id: '11111111-1111-1111-1111-111111111111', extractedDescription: 'Item 1', isUserVerified: false, matchedItemId: '22222222-2222-2222-2222-222222222222' },
        ],
      };
      mockPrisma.invoice.findUnique.mockResolvedValue(existing);

      const req = mockRequest({
        params: { id: 'inv-1' },
        body: {
          items: [{ id: '11111111-1111-1111-1111-111111111111', isUserVerified: false, matchedItemId: '22222222-2222-2222-2222-222222222222' }],
        },
      });
      const res = mockResponse();

      await verifyInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('All invoice line items must be verified'),
          statusCode: 400,
        }),
      );
    });

    it('rejects verification if an item has no matchedItemId', async () => {
      const existing = {
        id: 'inv-1',
        status: InvoiceStatus.EXTRACTED,
        items: [
          { id: '11111111-1111-1111-1111-111111111111', extractedDescription: 'Item 1', isUserVerified: true, matchedItemId: null },
        ],
      };
      mockPrisma.invoice.findUnique.mockResolvedValue(existing);

      const req = mockRequest({
        params: { id: 'inv-1' },
        body: {
          items: [{ id: '11111111-1111-1111-1111-111111111111', isUserVerified: true, matchedItemId: null }],
        },
      });
      const res = mockResponse();

      await verifyInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('All invoice line items must be matched'),
          statusCode: 400,
        }),
      );
    });

    it('rejects verification if invoice is already VERIFIED or in invalid state', async () => {
      const existing = {
        id: 'inv-1',
        status: InvoiceStatus.VERIFIED,
        items: [],
      };
      mockPrisma.invoice.findUnique.mockResolvedValue(existing);

      const req = mockRequest({
        params: { id: 'inv-1' },
        body: {},
      });
      const res = mockResponse();

      await verifyInvoice(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Cannot verify invoice with status VERIFIED'),
          statusCode: 400,
        }),
      );
    });
  });
});
