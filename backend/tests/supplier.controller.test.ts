import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    supplier: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));

import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  activateSupplier,
} from '../src/controllers/supplier.controller.js';

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

describe('Supplier Controller', () => {
  describe('listSuppliers', () => {
    it('returns paginated suppliers list', async () => {
      const suppliers = [
        { id: '1', name: 'Acme Corp', contactPerson: 'John', email: 'john@acme.com', phone: '123', isActive: true, leadTimeDays: 5 },
      ];
      mockPrisma.supplier.count.mockResolvedValue(1);
      mockPrisma.supplier.findMany.mockResolvedValue(suppliers);

      const req = mockRequest({ query: { page: '1', limit: '20' } });
      const res = mockResponse();

      await listSuppliers(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: suppliers,
          meta: expect.objectContaining({ page: 1, limit: 20, total: 1 }),
        }),
      );
    });
  });

  describe('getSupplier', () => {
    it('returns supplier details', async () => {
      const supplier = { id: '1', name: 'Acme Corp', contactPerson: 'John' };
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await getSupplier(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: supplier,
      });
    });

    it('returns 404 for non-existent supplier', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      await getSupplier(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 }),
      );
    });
  });

  describe('createSupplier', () => {
    it('creates supplier with valid data', async () => {
      const created = { id: '1', name: 'New Supplier', email: 'new@sup.com', leadTimeDays: 3, isActive: true };
      mockPrisma.supplier.create.mockResolvedValue(created);

      const req = mockRequest({
        body: { name: 'New Supplier', email: 'new@sup.com', leadTimeDays: 3 },
      });
      const res = mockResponse();

      await createSupplier(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: created,
      });
    });
  });

  describe('deactivateSupplier and activateSupplier', () => {
    it('deactivates supplier', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.supplier.update.mockResolvedValue({ id: '1', isActive: false });

      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await deactivateSupplier(req, res, mockNext);

      expect(mockPrisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' }, data: { isActive: false } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('activates supplier', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.supplier.update.mockResolvedValue({ id: '1', isActive: true });

      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await activateSupplier(req, res, mockNext);

      expect(mockPrisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' }, data: { isActive: true } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
