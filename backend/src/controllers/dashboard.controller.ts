import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, InventoryItemType, TransactionType, ProductionStatus, SaleStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

export const getDashboardSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalItems,
      rawMaterialsCount,
      componentsCount,
      finishedGoodsCount,
      pendingPurchasesCount,
      pendingInvoicesCount,
      activeProductionCount,
      completedSalesCount,
      recentTransactions,
      recentPurchases,
      recentProduction,
      recentSales,
      inventoryItems,
    ] = await Promise.all([
      prisma.inventoryItem.count({ where: { isActive: true } }),
      prisma.inventoryItem.count({ where: { type: InventoryItemType.RAW_MATERIAL, isActive: true } }),
      prisma.inventoryItem.count({ where: { type: InventoryItemType.COMPONENT, isActive: true } }),
      prisma.inventoryItem.count({ where: { type: InventoryItemType.FINISHED_GOOD, isActive: true } }),
      prisma.purchase.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: { in: ['UPLOADED', 'PROCESSING', 'EXTRACTED'] } } }),
      prisma.productionOrder.count({ where: { status: ProductionStatus.IN_PROGRESS } }),
      prisma.sale.count({ where: { status: SaleStatus.COMPLETED } }),
      prisma.inventoryTransaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              sku: true,
              name: true,
              unit: true,
            },
          },
        },
      }),
      prisma.purchase.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
        },
      }),
      prisma.productionOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          finishedGoodItem: { select: { name: true, sku: true, unit: true } },
        },
      }),
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          name: true,
          currentStock: true,
          reorderLevel: true,
          minStock: true,
          unit: true,
          type: true,
        },
      }),
    ]);

    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: any[] = [];

    for (const item of inventoryItems) {
      const stock = Number(item.currentStock);
      const reorder = Number(item.reorderLevel);
      if (stock <= 0) {
        outOfStockCount++;
        lowStockItems.push({ ...item, isOut: true });
      } else if (stock <= reorder) {
        lowStockCount++;
        lowStockItems.push({ ...item, isOut: false });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalItems,
          rawMaterialsCount,
          componentsCount,
          finishedGoodsCount,
          lowStockCount,
          outOfStockCount,
          pendingPurchasesCount,
          pendingInvoicesCount,
          activeProductionCount,
          completedSalesCount,
        },
        lowStockItems: lowStockItems.slice(0, 10),
        recentTransactions,
        recentPurchases,
        recentProduction,
        recentSales,
      },
    });
  } catch (error) {
    next(error);
  }
};

const reportQuerySchema = z.object({
  type: z.enum(['inventory', 'transactions', 'purchases', 'production', 'sales']).default('inventory'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  itemType: z.nativeEnum(InventoryItemType).optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  productionStatus: z.nativeEnum(ProductionStatus).optional(),
  saleStatus: z.nativeEnum(SaleStatus).optional(),
});

export const getReportData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) dateFilter.lte = new Date(query.endDate);

    const hasDateFilter = Boolean(query.startDate || query.endDate);

    if (query.type === 'transactions') {
      const where: Prisma.InventoryTransactionWhereInput = {
        ...(hasDateFilter && { createdAt: dateFilter }),
        ...(query.transactionType && { type: query.transactionType }),
      };

      const transactions = await prisma.inventoryTransaction.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { sku: true, name: true, unit: true, type: true } },
          performedBy: { select: { firstName: true, lastName: true } },
        },
      });

      return res.status(200).json({ success: true, data: transactions });
    }

    if (query.type === 'purchases') {
      const where: Prisma.PurchaseWhereInput = {
        ...(hasDateFilter && { createdAt: dateFilter }),
      };
      const purchases = await prisma.purchase.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
          items: { include: { item: { select: { sku: true, name: true, unit: true } } } },
        },
      });
      return res.status(200).json({ success: true, data: purchases });
    }

    if (query.type === 'production') {
      const where: Prisma.ProductionOrderWhereInput = {
        ...(hasDateFilter && { createdAt: dateFilter }),
        ...(query.productionStatus && { status: query.productionStatus }),
      };
      const production = await prisma.productionOrder.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          finishedGoodItem: { select: { sku: true, name: true, unit: true } },
          requiredItems: { include: { item: { select: { sku: true, name: true, unit: true } } } },
        },
      });
      return res.status(200).json({ success: true, data: production });
    }

    if (query.type === 'sales') {
      const where: Prisma.SaleWhereInput = {
        ...(hasDateFilter && { createdAt: dateFilter }),
        ...(query.saleStatus && { status: query.saleStatus }),
      };
      const sales = await prisma.sale.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { item: { select: { sku: true, name: true, unit: true } } } },
        },
      });
      return res.status(200).json({ success: true, data: sales });
    }

    // Default: inventory report
    const where: Prisma.InventoryItemWhereInput = {
      isActive: true,
      ...(query.itemType && { type: query.itemType }),
    };

    const items = await prisma.inventoryItem.findMany({
      where,
      take: 100,
      orderBy: { name: 'asc' },
      include: {
        supplier: { select: { name: true } },
      },
    });

    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
    return;
  }
};
