import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const idParamSchema = z.object({
  id: z.string().min(1, 'Supplier ID is required'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
});

export const listSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, search, isActive } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      ...(isActive === 'true' && { isActive: true }),
      ...(isActive === 'false' && { isActive: false }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              inventoryItems: true,
              purchases: true,
              invoices: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: suppliers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          take: 20,
          select: {
            id: true,
            sku: true,
            name: true,
            currentStock: true,
            unit: true,
            isActive: true,
          },
        },
        purchases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            purchaseNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            inventoryItems: true,
            purchases: true,
            invoices: true,
          },
        },
      },
    });

    if (!supplier) {
      return next(new AppError('Supplier not found', 404));
    }

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  contactPerson: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  leadTimeDays: z.coerce.number().min(0).default(0),
});

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSupplierSchema.parse(req.body);

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        email: data.email || null,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        address: data.address || null,
        taxId: data.taxId || null,
      },
    });

    res.status(201).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).optional(),
  contactPerson: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  leadTimeDays: z.coerce.number().min(0).optional(),
});

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateSupplierSchema.parse(req.body);

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError('Supplier not found', 404));
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        ...(data.email !== undefined && { email: data.email || null }),
      },
    });

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError('Supplier not found', 404));
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const activateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError('Supplier not found', 404));
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: true },
    });

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};
