import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, SaleStatus, TransactionType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';
import { inventoryService } from '../services/inventory.service.js';

const idParamSchema = z.object({
  id: z.string().min(1, 'Sale ID is required'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
});

export const listSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { saleNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                  type: true,
                  currentStock: true,
                },
              },
            },
          },
          createdBy: {
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
      data: sales,
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

export const getSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                type: true,
                currentStock: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!sale) {
      return next(new AppError('Sale order not found', 404));
    }

    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

const createSaleSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  notes: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid('Invalid inventory item ID'),
        quantity: z.coerce.number().positive('Quantity must be greater than 0'),
        unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
      })
    )
    .min(1, 'At least one sale item is required'),
});

export const createSale = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSaleSchema.parse(req.body);
    const userId = req.user?.userId || null;

    // Validate inventory items exist and are active
    for (const itemInput of data.items) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemInput.itemId },
      });
      if (!item) {
        return next(new AppError(`Inventory item ${itemInput.itemId} not found`, 404));
      }
      if (!item.isActive) {
        return next(new AppError(`Inventory item ${item.sku} is inactive`, 400));
      }
    }

    const uniqueSuffix =
      Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const saleNumber = `SO-${uniqueSuffix}`;

    let totalAmount = 0;
    const saleItemsData = data.items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerName: data.customerName,
        totalAmount,
        status: SaleStatus.PENDING,
        notes: data.notes || null,
        createdById: userId,
        items: {
          create: saleItemsData,
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const completeSale = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!sale) {
        throw new AppError('Sale order not found', 404);
      }

      if (sale.status !== SaleStatus.PENDING) {
        throw new AppError(
          `Cannot complete sale with status ${sale.status}. Only PENDING sales can be completed.`,
          400
        );
      }

      // Pre-validate stock availability for all sale items
      for (const saleItem of sale.items) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: saleItem.itemId },
        });

        if (!item) {
          throw new AppError(`Item ${saleItem.itemId} not found`, 404);
        }

        const required = new Prisma.Decimal(saleItem.quantity);
        const available = new Prisma.Decimal(item.currentStock);

        if (available.lessThan(required)) {
          throw new AppError(
            `Insufficient stock for item ${item.sku} (${item.name}). Required: ${required.toString()}, Available: ${available.toString()}`,
            400
          );
        }
      }

      // Decrement stock atomically via inventoryService
      for (const saleItem of sale.items) {
        await inventoryService.decreaseStock({
          itemId: saleItem.itemId,
          quantity: saleItem.quantity,
          type: TransactionType.SALE,
          unitCost: saleItem.unitPrice,
          totalCost: saleItem.totalPrice,
          referenceType: 'SALE',
          referenceId: sale.id,
          performedById: userId,
          notes: `Customer sale ${sale.saleNumber} to ${sale.customerName}`,
          tx,
        });
      }

      // Mark sale COMPLETED
      const completedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.COMPLETED,
        },
        include: {
          items: {
            include: {
              item: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return completedSale;
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Sale completed successfully and finished goods stock dispatched',
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const sale = await prisma.sale.findUnique({ where: { id } });

    if (!sale) {
      return next(new AppError('Sale order not found', 404));
    }

    if (sale.status !== SaleStatus.PENDING) {
      return next(new AppError(`Cannot cancel sale with status ${sale.status}. Only PENDING sales can be cancelled.`, 400));
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: { status: SaleStatus.CANCELLED },
      include: {
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
      message: 'Sale order cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};
