import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, InventoryItemType, TransactionType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';
import { inventoryService } from '../services/inventory.service.js';

function computeStockStatus(currentStock: Prisma.Decimal | number | string, reorderLevel: Prisma.Decimal | number | string): 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL' {
  const stock = new Prisma.Decimal(currentStock.toString());
  const reorder = new Prisma.Decimal(reorderLevel.toString());
  if (stock.lessThanOrEqualTo(0)) return 'OUT_OF_STOCK';
  if (stock.lessThanOrEqualTo(reorder)) return 'LOW_STOCK';
  return 'NORMAL';
}

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.nativeEnum(InventoryItemType).optional(),
  category: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),
});

export const listInventoryItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, search, type, category, isActive } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      isActive,
      ...(type && { type }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        include: { supplier: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const enrichedItems = items.map((item) => ({
      ...item,
      stockStatus: computeStockStatus(item.currentStock, item.reorderLevel),
    }));

    res.status(200).json({
      success: true,
      data: enrichedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const idParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

export const getInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!item) {
      return next(new AppError('Inventory item not found', 404));
    }

    const enrichedItem = {
      ...item,
      stockStatus: computeStockStatus(item.currentStock, item.reorderLevel),
    };

    res.status(200).json({
      success: true,
      data: enrichedItem,
    });
  } catch (error) {
    next(error);
  }
};

const createItemSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1).max(100),
  type: z.nativeEnum(InventoryItemType),
  unit: z.string().min(1).max(20),
  minStock: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  supplierId: z.string().uuid().optional(),
  expiryDate: z.string().datetime().optional(),
});

export const createInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createItemSchema.parse(req.body);

    const item = await prisma.inventoryItem.create({
      data: {
        ...data,
        currentStock: 0,
      },
      include: { supplier: true },
    });

    res.status(201).json({
      success: true,
      data: {
        ...item,
        stockStatus: computeStockStatus(item.currentStock, item.reorderLevel),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      next(new AppError('An inventory item with this SKU already exists', 409, 'DUPLICATE_SKU'));
      return;
    }
    next(error);
  }
};

const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  minStock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  supplierId: z.string().uuid().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

export const updateInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateItemSchema.parse(req.body);

    const existingItem = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existingItem) {
      return next(new AppError('Inventory item not found', 404));
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
      include: { supplier: true },
    });

    res.status(200).json({
      success: true,
      data: {
        ...item,
        stockStatus: computeStockStatus(item.currentStock, item.reorderLevel),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const existingItem = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existingItem) {
      return next(new AppError('Inventory item not found', 404));
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
      include: { supplier: true },
    });

    res.status(200).json({
      success: true,
      data: {
        ...item,
        stockStatus: computeStockStatus(item.currentStock, item.reorderLevel),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.nativeEnum(TransactionType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const query = getHistoryQuerySchema.parse(req.query);

    const result = await inventoryService.getTransactionHistory({
      itemId: id,
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.transactions,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const adjustStockSchema = z.object({
  quantityDelta: z.number().refine(val => val !== 0, { message: "quantityDelta must be non-zero" }),
  notes: z.string().min(1).max(500),
});

export const adjustStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { quantityDelta, notes } = adjustStockSchema.parse(req.body);

    if (!req.user?.userId) {
      return next(new AppError('Unauthorized', 401));
    }

    const result = await inventoryService.adjustStock({
      itemId: id,
      quantityDelta,
      performedById: req.user.userId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
