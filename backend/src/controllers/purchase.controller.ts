import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, PurchaseStatus, TransactionType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';
import { inventoryService } from '../services/inventory.service.js';

const idParamSchema = z.object({
  id: z.string().min(1, 'Purchase ID is required'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(PurchaseStatus).optional(),
  supplierId: z.string().optional(),
});

export const listPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, search, status, supplierId } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { purchaseNumber: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
              contactPerson: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: purchases,
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

export const getPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                currentStock: true,
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!purchase) {
      return next(new AppError('Purchase order not found', 404));
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

const createPurchaseSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  invoiceNumber: z.string().max(100).optional().nullable(),
  invoiceDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid('Invalid inventory item ID'),
        quantity: z.coerce.number().positive('Quantity must be greater than 0'),
        unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
      })
    )
    .min(1, 'At least one line item is required'),
});

export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPurchaseSchema.parse(req.body);

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) {
      return next(new AppError('Supplier not found', 404));
    }

    const uniqueSuffix = Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const purchaseNumber = `PO-${uniqueSuffix}`;

    let totalAmount = 0;
    const purchaseItemsData = data.items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        notes: data.notes || null,
        totalAmount,
        status: PurchaseStatus.PENDING,
        items: {
          create: purchaseItemsData,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

const updatePurchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  invoiceDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const updatePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updatePurchaseSchema.parse(req.body);

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (purchase.status !== PurchaseStatus.PENDING) {
      return next(new AppError(`Cannot update a purchase with status ${purchase.status}`, 400));
    }

    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) {
        return next(new AppError('Supplier not found', 404));
      }
    }

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        ...(data.supplierId && { supplierId: data.supplierId }),
        ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber || null }),
        ...(data.invoiceDate !== undefined && { invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (purchase.status !== PurchaseStatus.PENDING) {
      return next(new AppError(`Cannot cancel a purchase with status ${purchase.status}`, 400));
    }

    const updated = await prisma.purchase.update({
      where: { id },
      data: { status: PurchaseStatus.CANCELLED },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const receivePurchase = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    if (!req.user?.userId) {
      return next(new AppError('Authentication required', 401));
    }

    const userId = req.user.userId;

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!purchase) {
        throw new AppError('Purchase order not found', 404);
      }

      if (purchase.status !== PurchaseStatus.PENDING) {
        throw new AppError(`Cannot receive purchase with status ${purchase.status}. Only PENDING purchases can be received.`, 400);
      }

      for (const item of purchase.items) {
        await inventoryService.increaseStock({
          itemId: item.itemId,
          quantity: item.quantity,
          type: TransactionType.PURCHASE,
          unitCost: item.unitPrice,
          totalCost: item.totalPrice,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          performedById: userId,
          notes: `Goods receipt for PO ${purchase.purchaseNumber}`,
          tx,
        });
      }

      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          status: PurchaseStatus.RECEIVED,
          receivedById: userId,
        },
        include: {
          supplier: true,
          items: {
            include: {
              item: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updatedPurchase;
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Goods received successfully and inventory updated',
    });
  } catch (error) {
    next(error);
  }
};
