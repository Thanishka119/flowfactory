import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const simulateProductionSchema = z.object({
  finishedGoodItemId: z.string().uuid('Invalid finished good ID'),
  plannedQuantity: z.coerce.number().positive('Planned quantity must be greater than 0'),
  requiredItems: z
    .array(
      z.object({
        itemId: z.string().uuid('Invalid material item ID'),
        requiredQuantity: z.coerce.number().positive('Required quantity must be positive'),
      })
    )
    .min(1, 'At least one material requirement is required'),
});

const simulateSaleSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().uuid('Invalid item ID'),
        quantity: z.coerce.number().positive('Quantity must be positive'),
      })
    )
    .min(1, 'At least one item is required'),
});

/**
 * What-If Simulator Controller: Purely read-only calculations.
 * Never modifies database records or inventory balances.
 */
export const simulateProduction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = simulateProductionSchema.parse(req.body);

    const finishedGood = await prisma.inventoryItem.findUnique({
      where: { id: data.finishedGoodItemId },
    });

    if (!finishedGood) {
      return next(new AppError('Finished good item not found', 404));
    }

    const currentFgStock = Number(finishedGood.currentStock);
    const projectedFgStock = currentFgStock + data.plannedQuantity;

    const materialSimulations = [];
    let hasShortage = false;

    for (const reqItem of data.requiredItems) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: reqItem.itemId },
        include: { supplier: true },
      });

      if (!item) {
        return next(new AppError(`Material item ${reqItem.itemId} not found`, 404));
      }

      const currentStock = Number(item.currentStock);
      const requiredQty = reqItem.requiredQuantity;
      const projectedBalance = currentStock - requiredQty;
      const isShortage = projectedBalance < 0;
      const shortageQuantity = isShortage ? Math.abs(projectedBalance) : 0;

      if (isShortage) {
        hasShortage = true;
      }

      materialSimulations.push({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        type: item.type,
        currentStock,
        requiredQuantity: requiredQty,
        projectedBalance,
        isShortage,
        shortageQuantity,
        reorderLevel: Number(item.reorderLevel),
        supplier: item.supplier
          ? {
              id: item.supplier.id,
              name: item.supplier.name,
              leadTimeDays: item.supplier.leadTimeDays,
            }
          : null,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        simulationType: 'PRODUCTION',
        finishedGood: {
          id: finishedGood.id,
          sku: finishedGood.sku,
          name: finishedGood.name,
          unit: finishedGood.unit,
          currentStock: currentFgStock,
          plannedYield: data.plannedQuantity,
          projectedStock: projectedFgStock,
        },
        hasShortage,
        materials: materialSimulations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const simulateSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = simulateSaleSchema.parse(req.body);

    const itemSimulations = [];
    let hasShortage = false;

    for (const saleItem of data.items) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: saleItem.itemId },
      });

      if (!item) {
        return next(new AppError(`Item ${saleItem.itemId} not found`, 404));
      }

      const currentStock = Number(item.currentStock);
      const requestedQty = saleItem.quantity;
      const projectedBalance = currentStock - requestedQty;
      const isShortage = projectedBalance < 0;
      const shortageQuantity = isShortage ? Math.abs(projectedBalance) : 0;

      if (isShortage) {
        hasShortage = true;
      }

      itemSimulations.push({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        currentStock,
        requestedQuantity: requestedQty,
        projectedBalance,
        isShortage,
        shortageQuantity,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        simulationType: 'SALE',
        hasShortage,
        items: itemSimulations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryIntelligence = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { supplier: true },
    });

    const lowStockAlerts = [];
    const expiryAlerts = [];
    const recommendations = [];

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    for (const item of items) {
      const stock = Number(item.currentStock);
      const reorder = Number(item.reorderLevel);
      const minStock = Number(item.minStock);

      if (stock <= reorder) {
        lowStockAlerts.push({
          id: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          currentStock: stock,
          reorderLevel: reorder,
          severity: stock <= minStock ? 'CRITICAL' : 'HIGH',
          supplier: item.supplier?.name || 'Unknown',
          leadTimeDays: item.supplier?.leadTimeDays ?? 0,
        });

        recommendations.push({
          type: 'PURCHASE_RECOMMENDATION',
          sku: item.sku,
          name: item.name,
          recommendedOrderQuantity: Math.max(reorder * 2 - stock, 10),
          unit: item.unit,
          supplierName: item.supplier?.name || 'No supplier assigned',
          reason: `Stock (${stock} ${item.unit}) is at or below reorder level (${reorder} ${item.unit}). Estimated lead time: ${item.supplier?.leadTimeDays ?? 0} days.`,
        });
      }

      if (item.expiryDate) {
        const expDate = new Date(item.expiryDate);
        if (expDate <= thirtyDaysAhead) {
          expiryAlerts.push({
            id: item.id,
            sku: item.sku,
            name: item.name,
            currentStock: stock,
            expiryDate: expDate.toISOString(),
            isExpired: expDate < now,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        lowStockAlerts,
        expiryAlerts,
        recommendations,
      },
    });
  } catch (error) {
    next(error);
  }
};
