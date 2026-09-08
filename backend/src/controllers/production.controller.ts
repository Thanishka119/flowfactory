import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, ProductionStatus, TransactionType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';
import { inventoryService } from '../services/inventory.service.js';

const idParamSchema = z.object({
  id: z.string().min(1, 'Production Order ID is required'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(ProductionStatus).optional(),
  finishedGoodItemId: z.string().optional(),
});

export const listProductionOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { page, limit, search, status, finishedGoodItemId } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductionOrderWhereInput = {
      ...(status && { status }),
      ...(finishedGoodItemId && { finishedGoodItemId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { finishedGoodItem: { name: { contains: search, mode: 'insensitive' } } },
          { finishedGoodItem: { sku: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, orders] = await Promise.all([
      prisma.productionOrder.count({ where }),
      prisma.productionOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          finishedGoodItem: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              type: true,
              currentStock: true,
            },
          },
          requiredItems: {
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
      data: orders,
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

export const getProductionOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        finishedGoodItem: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            type: true,
            currentStock: true,
          },
        },
        requiredItems: {
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
        consumptionRecords: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
            recordedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        finishedGoodsYield: {
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

    if (!order) {
      return next(new AppError('Production order not found', 404));
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const createProductionOrderSchema = z.object({
  finishedGoodItemId: z.string().uuid('Invalid finished good item ID'),
  plannedQuantity: z.coerce.number().positive('Planned quantity must be greater than 0'),
  notes: z.string().max(500).optional().nullable(),
  requiredItems: z
    .array(
      z.object({
        itemId: z.string().uuid('Invalid inventory item ID'),
        requiredQuantity: z.coerce.number().positive('Required quantity must be greater than 0'),
      })
    )
    .min(1, 'At least one material requirement is required'),
});

export const createProductionOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProductionOrderSchema.parse(req.body);
    const userId = req.user?.userId || null;

    // Validate finished good item exists and is FINISHED_GOOD
    const finishedGood = await prisma.inventoryItem.findUnique({
      where: { id: data.finishedGoodItemId },
    });

    if (!finishedGood) {
      return next(new AppError('Finished good item not found', 404));
    }

    if (!finishedGood.isActive) {
      return next(new AppError('Finished good item is inactive', 400));
    }

    if (finishedGood.type !== 'FINISHED_GOOD') {
      return next(new AppError(`Selected item type is ${finishedGood.type}, expected FINISHED_GOOD`, 400));
    }

    // Validate material requirements
    for (const reqItem of data.requiredItems) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: reqItem.itemId },
      });
      if (!item) {
        return next(new AppError(`Material item ${reqItem.itemId} not found`, 404));
      }
      if (!item.isActive) {
        return next(new AppError(`Material item ${item.sku} is inactive`, 400));
      }
    }

    const uniqueSuffix =
      Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `PROD-${uniqueSuffix}`;

    const order = await prisma.productionOrder.create({
      data: {
        orderNumber,
        finishedGoodItemId: data.finishedGoodItemId,
        plannedQuantity: data.plannedQuantity,
        actualQuantity: 0,
        status: ProductionStatus.DRAFT,
        notes: data.notes || null,
        createdById: userId,
        requiredItems: {
          create: data.requiredItems.map((item) => ({
            itemId: item.itemId,
            requiredQuantity: item.requiredQuantity,
          })),
        },
      },
      include: {
        finishedGoodItem: true,
        requiredItems: {
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
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updateProductionOrderSchema = z.object({
  plannedQuantity: z.coerce.number().positive().optional(),
  notes: z.string().max(500).optional().nullable(),
  requiredItems: z
    .array(
      z.object({
        itemId: z.string().uuid('Invalid inventory item ID'),
        requiredQuantity: z.coerce.number().positive('Required quantity must be greater than 0'),
      })
    )
    .min(1)
    .optional(),
});

export const updateProductionOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateProductionOrderSchema.parse(req.body);

    const existingOrder = await prisma.productionOrder.findUnique({
      where: { id },
      include: { requiredItems: true },
    });

    if (!existingOrder) {
      return next(new AppError('Production order not found', 404));
    }

    if (existingOrder.status !== ProductionStatus.DRAFT) {
      return next(
        new AppError(`Cannot update production order with status ${existingOrder.status}. Only DRAFT orders can be edited.`, 400)
      );
    }

    // If requiredItems provided, validate each item
    if (data.requiredItems) {
      for (const reqItem of data.requiredItems) {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: reqItem.itemId },
        });
        if (!item) {
          return next(new AppError(`Material item ${reqItem.itemId} not found`, 404));
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.requiredItems) {
        // Delete existing requirements and re-create
        await tx.productionItem.deleteMany({
          where: { productionOrderId: id },
        });
        await tx.productionItem.createMany({
          data: data.requiredItems.map((item) => ({
            productionOrderId: id,
            itemId: item.itemId,
            requiredQuantity: item.requiredQuantity,
          })),
        });
      }

      return tx.productionOrder.update({
        where: { id },
        data: {
          ...(data.plannedQuantity !== undefined && { plannedQuantity: data.plannedQuantity }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
        },
        include: {
          finishedGoodItem: true,
          requiredItems: {
            include: {
              item: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const startProductionOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: { requiredItems: true },
    });

    if (!order) {
      return next(new AppError('Production order not found', 404));
    }

    if (order.status !== ProductionStatus.DRAFT) {
      return next(
        new AppError(`Cannot start production order with status ${order.status}. Only DRAFT orders can be started.`, 400)
      );
    }

    if (!order.requiredItems || order.requiredItems.length === 0) {
      return next(new AppError('Cannot start production order without material requirements', 400));
    }

    const updated = await prisma.productionOrder.update({
      where: { id },
      data: {
        status: ProductionStatus.IN_PROGRESS,
        startDate: new Date(),
      },
      include: {
        finishedGoodItem: true,
        requiredItems: {
          include: {
            item: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Production order started successfully',
    });
  } catch (error) {
    next(error);
  }
};

const completeProductionSchema = z.object({
  actualQuantity: z.coerce.number().positive().optional(),
});

export const completeProductionOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = completeProductionSchema.parse(req.body || {});
    const userId = req.user?.userId || null;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id },
        include: {
          finishedGoodItem: true,
          requiredItems: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError('Production order not found', 404);
      }

      if (order.status !== ProductionStatus.IN_PROGRESS) {
        throw new AppError(
          `Cannot complete production order with status ${order.status}. Only IN_PROGRESS orders can be completed.`,
          400
        );
      }

      const yieldQuantity = body.actualQuantity ?? Number(order.plannedQuantity);

      // Pre-validate stock availability for all materials to fail fast and cleanly
      for (const reqItem of order.requiredItems) {
        const currentItem = await tx.inventoryItem.findUnique({
          where: { id: reqItem.itemId },
        });

        if (!currentItem) {
          throw new AppError(`Required material item ${reqItem.itemId} not found`, 404);
        }

        const required = new Prisma.Decimal(reqItem.requiredQuantity);
        const available = new Prisma.Decimal(currentItem.currentStock);

        if (available.lessThan(required)) {
          throw new AppError(
            `Insufficient stock for item ${currentItem.sku} (${currentItem.name}). Required: ${required.toString()}, Available: ${available.toString()}`,
            400
          );
        }
      }

      // Step c: Decrease stock for each material using inventoryService with CONSUMPTION type
      for (const reqItem of order.requiredItems) {
        await inventoryService.decreaseStock({
          itemId: reqItem.itemId,
          quantity: reqItem.requiredQuantity,
          type: TransactionType.CONSUMPTION,
          referenceType: 'PRODUCTION_ORDER',
          referenceId: order.id,
          performedById: userId || undefined,
          notes: `Material consumed for Production Order ${order.orderNumber}`,
          tx,
        });

        // Record ConsumptionRecord
        await tx.consumptionRecord.create({
          data: {
            productionOrderId: order.id,
            itemId: reqItem.itemId,
            quantityConsumed: reqItem.requiredQuantity,
            recordedById: userId,
          },
        });
      }

      // Step d: Increase stock for finished good using inventoryService with PRODUCTION type
      await inventoryService.increaseStock({
        itemId: order.finishedGoodItemId,
        quantity: yieldQuantity,
        type: TransactionType.PRODUCTION,
        referenceType: 'PRODUCTION_ORDER',
        referenceId: order.id,
        performedById: userId || undefined,
        notes: `Finished goods yield from Production Order ${order.orderNumber}`,
        tx,
      });

      // Record FinishedGood yield
      await tx.finishedGood.create({
        data: {
          productionOrderId: order.id,
          itemId: order.finishedGoodItemId,
          quantityProduced: yieldQuantity,
        },
      });

      // Step f: Mark order as COMPLETED
      const completedOrder = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          status: ProductionStatus.COMPLETED,
          actualQuantity: yieldQuantity,
          completionDate: new Date(),
        },
        include: {
          finishedGoodItem: true,
          requiredItems: {
            include: {
              item: true,
            },
          },
          consumptionRecords: true,
          finishedGoodsYield: true,
        },
      });

      return completedOrder;
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Production order completed successfully, materials consumed and finished goods updated',
    });
  } catch (error) {
    next(error);
  }
};

export const cancelProductionOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);

    const order = await prisma.productionOrder.findUnique({ where: { id } });

    if (!order) {
      return next(new AppError('Production order not found', 404));
    }

    if (order.status === ProductionStatus.COMPLETED) {
      return next(new AppError('Cannot cancel a COMPLETED production order', 400));
    }

    if (order.status === ProductionStatus.CANCELLED) {
      return next(new AppError('Production order is already CANCELLED', 400));
    }

    // Both DRAFT and IN_PROGRESS can be cancelled before completion (no stock was consumed yet during IN_PROGRESS)
    const updated = await prisma.productionOrder.update({
      where: { id },
      data: { status: ProductionStatus.CANCELLED },
      include: {
        finishedGoodItem: true,
        requiredItems: {
          include: {
            item: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Production order cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};
