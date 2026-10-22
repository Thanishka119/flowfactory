import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ShortageRescuePlan {
  orderId: string;
  orderNumber: string;
  finishedGoodId: string;
  finishedGoodName: string;
  finishedGoodSku: string;
  plannedQuantity: number;
  status: string;
  startDate: string | null;
  completionDate: string | null;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  shortageItems: {
    itemId: string;
    itemName: string;
    itemSku: string;
    requiredPerUnit: number;
    totalRequired: number;
    currentStock: number;
    shortageQuantity: number;
    approvedAlternates: {
      alternateItemId: string;
      alternateItemName: string;
      alternateItemSku: string;
      availableStock: number;
      isStockSufficient: boolean;
      notes?: string | null;
    }[];
  }[];
  feasiblePartialQuantity: number;
  allBomComponentsSufficient: boolean;
  recommendations: {
    type: 'SUBSTITUTE' | 'PARTIAL_RUN' | 'RESCHEDULE';
    title: string;
    explanation: string;
    isFeasible: boolean;
    alternateItemId?: string;
    recommendedQuantity?: number;
  }[];
}

export interface SalesOrderShortage {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  requiredQuantity: number;
  availableStock: number;
  shortageQuantity: number;
}

export class ShortageRescueService {
  /**
   * Evaluates active production orders and identifies feasible rescue plans for component shortages.
   * Does NOT mutate any stock or database records.
   */
  async getShortageRescuePlans(): Promise<ShortageRescuePlan[]> {
    const orders = await prisma.productionOrder.findMany({
      where: {
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
      },
      include: {
        finishedGoodItem: true,
        requiredItems: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Query all approved alternates
    const alternatesRaw = (await prisma.$queryRawUnsafe(`
      SELECT 
        ac.id, ac.original_item_id as "originalItemId", ac.alternate_item_id as "alternateItemId", ac.notes,
        alt.name as "alternateName", alt.sku as "alternateSku", alt.current_stock as "alternateStock"
      FROM alternate_components ac
      JOIN inventory_items alt ON alt.id = ac.alternate_item_id
      WHERE alt.is_active = true
    `)) as any[];

    const alternatesMap = new Map<string, any[]>();
    for (const alt of alternatesRaw) {
      if (!alternatesMap.has(alt.originalItemId)) {
        alternatesMap.set(alt.originalItemId, []);
      }
      alternatesMap.get(alt.originalItemId)!.push(alt);
    }

    const plans: ShortageRescuePlan[] = [];

    for (const order of orders) {
      const plannedQty = Number(order.plannedQuantity);
      const shortageItems: ShortageRescuePlan['shortageItems'] = [];
      let minFeasibleBatch = plannedQty;
      let hasShortage = false;

      for (const reqItem of order.requiredItems) {
        const reqPerUnit = Number(reqItem.requiredQuantity);
        const totalReq = plannedQty * reqPerUnit;
        const currentStock = Number(reqItem.item.currentStock);

        // Check feasible partial units for this component
        const feasibleForThis = reqPerUnit > 0 ? Math.floor(currentStock / reqPerUnit) : plannedQty;
        if (feasibleForThis < minFeasibleBatch) {
          minFeasibleBatch = Math.max(0, feasibleForThis);
        }

        if (currentStock < totalReq) {
          hasShortage = true;
          const shortageQty = totalReq - currentStock;
          const rawAlts = alternatesMap.get(reqItem.itemId) || [];
          const approvedAlternates = rawAlts.map((a) => {
            const stock = Number(a.alternateStock);
            return {
              alternateItemId: a.alternateItemId,
              alternateItemName: a.alternateName,
              alternateItemSku: a.alternateSku,
              availableStock: stock,
              isStockSufficient: stock >= shortageQty,
              notes: a.notes,
            };
          });

          shortageItems.push({
            itemId: reqItem.itemId,
            itemName: reqItem.item.name,
            itemSku: reqItem.item.sku,
            requiredPerUnit: reqPerUnit,
            totalRequired: totalReq,
            currentStock,
            shortageQuantity: shortageQty,
            approvedAlternates,
          });
        }
      }

      if (!hasShortage) {
        continue; // No shortage on this order
      }

      // Calculate urgency
      let urgency: ShortageRescuePlan['urgency'] = 'MEDIUM';
      if (order.status === 'IN_PROGRESS') {
        urgency = 'HIGH';
      }
      if (order.completionDate && new Date(order.completionDate).getTime() < Date.now() + 86400000 * 3) {
        urgency = 'CRITICAL';
      }

      // Generate explainable recommendations
      const recommendations: ShortageRescuePlan['recommendations'] = [];

      // Check if approved alternates can satisfy shortages
      const allShortagesCoverable = shortageItems.every((si) =>
        si.approvedAlternates.some((alt) => alt.isStockSufficient)
      );

      if (allShortagesCoverable && shortageItems.length > 0) {
        const firstShortage = shortageItems[0];
        const matchingAlt = firstShortage.approvedAlternates.find((alt) => alt.isStockSufficient);
        if (matchingAlt) {
          recommendations.push({
            type: 'SUBSTITUTE',
            title: `Substitute with approved alternate: ${matchingAlt.alternateItemName}`,
            explanation: `Approved alternate "${matchingAlt.alternateItemName}" (${matchingAlt.alternateItemSku}) has ${matchingAlt.availableStock} in stock, which fully covers the shortage of ${firstShortage.shortageQuantity} units for "${firstShortage.itemName}".`,
            isFeasible: true,
            alternateItemId: matchingAlt.alternateItemId,
            recommendedQuantity: firstShortage.shortageQuantity,
          });
        }
      }

      // Check partial batch feasibility
      if (minFeasibleBatch > 0) {
        recommendations.push({
          type: 'PARTIAL_RUN',
          title: `Produce feasible partial run of ${minFeasibleBatch} units`,
          explanation: `Remaining BOM inventory permits immediate assembly of ${minFeasibleBatch} out of ${plannedQty} units without substituting components.`,
          isFeasible: true,
          recommendedQuantity: minFeasibleBatch,
        });
      } else {
        recommendations.push({
          type: 'PARTIAL_RUN',
          title: 'Partial run infeasible',
          explanation: `At least one critical BOM component has 0 available units in stock. Cannot produce any partial units.`,
          isFeasible: false,
          recommendedQuantity: 0,
        });
      }

      // Rescheduling fallback
      recommendations.push({
        type: 'RESCHEDULE',
        title: 'Reschedule order awaiting replenishment',
        explanation: 'Postpone assembly until supplier PO arrival or planned replenishment completes.',
        isFeasible: true,
      });

      plans.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        finishedGoodId: order.finishedGoodItemId,
        finishedGoodName: order.finishedGoodItem.name,
        finishedGoodSku: order.finishedGoodItem.sku,
        plannedQuantity: plannedQty,
        status: order.status,
        startDate: order.startDate ? order.startDate.toISOString() : null,
        completionDate: order.completionDate ? order.completionDate.toISOString() : null,
        urgency,
        shortageItems,
        feasiblePartialQuantity: minFeasibleBatch,
        allBomComponentsSufficient: false,
        recommendations,
      });
    }

    return plans;
  }

  /**
   * Registers an explicitly approved alternate component for a given inventory item.
   */
  async addApprovedAlternate(
    originalItemId: string,
    alternateItemId: string,
    notes?: string,
    adminUserId?: string
  ): Promise<any> {
    if (originalItemId === alternateItemId) {
      throw new AppError('An item cannot be an alternate of itself', 400);
    }

    const [orig, alt] = await Promise.all([
      prisma.inventoryItem.findUnique({ where: { id: originalItemId } }),
      prisma.inventoryItem.findUnique({ where: { id: alternateItemId } }),
    ]);

    if (!orig || !alt) {
      throw new AppError('Original or alternate inventory item not found', 404);
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO alternate_components (id, original_item_id, alternate_item_id, notes, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW())
      ON CONFLICT (original_item_id, alternate_item_id)
      DO UPDATE SET notes = EXCLUDED.notes, created_at = NOW()
    `,
      originalItemId,
      alternateItemId,
      notes || null
    );

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUserId || null,
        action: 'SHORTAGE_ALTERNATE_APPROVED',
        entity: 'AlternateComponent',
        entityId: originalItemId,
        details: {
          originalSku: orig.sku,
          originalName: orig.name,
          alternateSku: alt.sku,
          alternateName: alt.name,
          notes,
        },
      },
    });

    return {
      success: true,
      message: `Approved alternate "${alt.name}" registered for "${orig.name}".`,
    };
  }

  /**
   * Lists all approved alternate components.
   */
  async listApprovedAlternates(): Promise<any[]> {
    const records = (await prisma.$queryRawUnsafe(`
      SELECT 
        ac.id, ac.original_item_id as "originalItemId", ac.alternate_item_id as "alternateItemId", ac.notes, ac.created_at as "createdAt",
        orig.name as "originalName", orig.sku as "originalSku",
        alt.name as "alternateName", alt.sku as "alternateSku", alt.current_stock as "alternateStock", alt.unit as "alternateUnit"
      FROM alternate_components ac
      JOIN inventory_items orig ON orig.id = ac.original_item_id
      JOIN inventory_items alt ON alt.id = ac.alternate_item_id
      ORDER BY ac.created_at DESC
    `)) as any[];

    return records;
  }

  /**
   * Explicitly executes an approved rescue plan. Requires Admin approval.
   */
  async approveRescuePlan(
    input: {
      orderId: string;
      action: 'SUBSTITUTE' | 'PARTIAL_RUN' | 'RESCHEDULE';
      alternateItemId?: string;
      substituteQty?: number;
      partialQty?: number;
      newStartDate?: string;
    },
    adminUserId: string
  ): Promise<any> {
    const order = await prisma.productionOrder.findUnique({
      where: { id: input.orderId },
      include: { requiredItems: true },
    });

    if (!order) {
      throw new AppError('Production order not found', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (input.action === 'SUBSTITUTE') {
        if (!input.alternateItemId) {
          throw new AppError('Alternate item ID is required for substitution', 400);
        }
        const alt = await tx.inventoryItem.findUnique({ where: { id: input.alternateItemId } });
        if (!alt) {
          throw new AppError('Selected alternate item not found', 404);
        }

        // Add or update required item on production order
        await tx.productionItem.create({
          data: {
            productionOrderId: order.id,
            itemId: input.alternateItemId,
            requiredQuantity: input.substituteQty || 1,
          },
        });
      } else if (input.action === 'PARTIAL_RUN') {
        if (!input.partialQty || input.partialQty <= 0) {
          throw new AppError('Valid positive partial quantity is required', 400);
        }
        await tx.productionOrder.update({
          where: { id: order.id },
          data: {
            plannedQuantity: input.partialQty,
            notes: `${order.notes ? order.notes + ' | ' : ''}Rescued to partial run: ${input.partialQty} units.`,
          },
        });
      } else if (input.action === 'RESCHEDULE') {
        await tx.productionOrder.update({
          where: { id: order.id },
          data: {
            startDate: input.newStartDate ? new Date(input.newStartDate) : new Date(Date.now() + 86400000 * 7),
            notes: `${order.notes ? order.notes + ' | ' : ''}Rescheduled due to material shortage.`,
          },
        });
      }

      // Record audit log
      const audit = await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'SHORTAGE_RESCUE_EXECUTED',
          entity: 'ProductionOrder',
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            action: input.action,
            parameters: input,
          },
        },
      });

      return { orderId: order.id, action: input.action, auditId: audit.id };
    });

    return {
      success: true,
      data: result,
      message: `Rescue action ${input.action} approved and applied to order ${order.orderNumber}.`,
    };
  }

  /**
   * Identifies PENDING sales orders where the required finished-goods quantity
   * exceeds available stock. This is a finished-goods shortage, NOT a BOM shortage.
   * Read-only — does not mutate any records.
   */
  async getSalesOrderShortages(): Promise<SalesOrderShortage[]> {
    const pendingSales = await prisma.sale.findMany({
      where: { status: 'PENDING' },
      include: {
        items: {
          include: { item: true },
        },
      },
    });

    const shortages: SalesOrderShortage[] = [];

    for (const sale of pendingSales) {
      for (const saleItem of sale.items) {
        const required = Number(saleItem.quantity);
        const available = Number(saleItem.item.currentStock);
        if (available < required) {
          shortages.push({
            orderId: sale.id,
            orderNumber: sale.saleNumber,
            customerName: sale.customerName,
            status: sale.status,
            itemId: saleItem.item.id,
            itemName: saleItem.item.name,
            itemSku: saleItem.item.sku,
            requiredQuantity: required,
            availableStock: available,
            shortageQuantity: required - available,
          });
        }
      }
    }

    return shortages;
  }
}

export const shortageRescueService = new ShortageRescueService();
