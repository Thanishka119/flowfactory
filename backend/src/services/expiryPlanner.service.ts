import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ExpiryAtRiskItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'EXPIRED' | 'CRITICAL_EXPIRY' | 'NEAR_EXPIRY' | 'HEALTHY';
  isUsable: boolean;
  blockReason?: string | null;
  feasibleBurnDownRuns: {
    finishedGoodId: string;
    finishedGoodName: string;
    finishedGoodSku: string;
    requiredPerUnit: number;
    maxFeasibleUnits: number;
    atRiskUnitsConsumed: number;
    estimatedWasteAvoidedValue: number;
    isFeasible: boolean;
    missingComponents: {
      itemId: string;
      itemName: string;
      itemSku: string;
      required: number;
      available: number;
    }[];
    infeasibilityReason?: string;
  }[];
}

export class ExpiryPlannerService {
  /**
   * Scans inventory items with expiry dates and generates burn-down recommendations.
   * Expired stock is flagged as BLOCKED from production.
   * Checks secondary BOM component availability before proposing production.
   * Does NOT mutate stock.
   */
  async getExpiryBurnDownAnalysis(thresholdDays: number = 60): Promise<{
    summary: {
      totalAtRiskCount: number;
      expiredCount: number;
      nearExpiryCount: number;
      potentialWasteValue: number;
    };
    items: ExpiryAtRiskItem[];
  }> {
    const now = new Date();

    // Query inventory items with an expiry date and positive stock
    const items = await prisma.inventoryItem.findMany({
      where: {
        expiryDate: { not: null },
        currentStock: { gt: 0 },
        isActive: true,
      },
      include: {
        productionItemRequirements: {
          include: {
            productionOrder: {
              include: {
                finishedGoodItem: true,
                requiredItems: {
                  include: {
                    item: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const atRiskItems: ExpiryAtRiskItem[] = [];
    let expiredCount = 0;
    let nearExpiryCount = 0;
    let potentialWasteValue = 0;

    for (const item of items) {
      if (!item.expiryDate) continue;

      const expiryTime = new Date(item.expiryDate).getTime();
      const diffMs = expiryTime - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const currentStock = Number(item.currentStock);

      let status: ExpiryAtRiskItem['status'] = 'HEALTHY';
      let isUsable = true;
      let blockReason: string | null = null;

      if (daysUntilExpiry < 0) {
        status = 'EXPIRED';
        isUsable = false;
        blockReason = `EXPIRED on ${new Date(item.expiryDate).toLocaleDateString()}. Strictly prohibited from production and issue.`;
        expiredCount++;
        potentialWasteValue += currentStock * 10; // rough unit cost
      } else if (daysUntilExpiry <= 14) {
        status = 'CRITICAL_EXPIRY';
        isUsable = true;
        nearExpiryCount++;
        potentialWasteValue += currentStock * 10;
      } else if (daysUntilExpiry <= thresholdDays) {
        status = 'NEAR_EXPIRY';
        isUsable = true;
        nearExpiryCount++;
        potentialWasteValue += currentStock * 10;
      } else {
        // Expiry is far in future, outside threshold
        continue;
      }

      // Find BOMs that require this component to calculate feasible burn-down
      // We look at all production orders in system that use this item
      const feasibleBurnDownRuns: ExpiryAtRiskItem['feasibleBurnDownRuns'] = [];

      // Query production orders that consume this item
      const candidateOrders = await prisma.productionItem.findMany({
        where: { itemId: item.id },
        include: {
          productionOrder: {
            include: {
              finishedGoodItem: true,
              requiredItems: {
                include: { item: true },
              },
            },
          },
        },
        take: 5,
      });

      if (!isUsable) {
        // Expired stock cannot be used anywhere
        feasibleBurnDownRuns.push({
          finishedGoodId: '',
          finishedGoodName: 'None (Stock Expired)',
          finishedGoodSku: '',
          requiredPerUnit: 0,
          maxFeasibleUnits: 0,
          atRiskUnitsConsumed: 0,
          estimatedWasteAvoidedValue: 0,
          isFeasible: false,
          missingComponents: [],
          infeasibilityReason: blockReason || 'Material is past its expiry date and cannot be used in production.',
        });
      } else {
        for (const req of candidateOrders) {
          const po = req.productionOrder;
          const reqPerUnit = Number(req.requiredQuantity);
          if (reqPerUnit <= 0) continue;

          // Check all other BOM items for this finished good
          const missingComponents: ExpiryAtRiskItem['feasibleBurnDownRuns'][0]['missingComponents'] = [];
          let maxBatchFromBOM = Math.floor(currentStock / reqPerUnit);

          for (const bomItem of po.requiredItems) {
            if (bomItem.itemId === item.id) continue;
            const bomPerUnit = Number(bomItem.requiredQuantity);
            const bomStock = Number(bomItem.item.currentStock);
            const feasibleForThis = bomPerUnit > 0 ? Math.floor(bomStock / bomPerUnit) : 9999;
            if (feasibleForThis < maxBatchFromBOM) {
              maxBatchFromBOM = Math.max(0, feasibleForThis);
            }
            if (bomStock < bomPerUnit) {
              missingComponents.push({
                itemId: bomItem.itemId,
                itemName: bomItem.item.name,
                itemSku: bomItem.item.sku,
                required: bomPerUnit,
                available: bomStock,
              });
            }
          }

          const isFeasible = maxBatchFromBOM > 0 && missingComponents.length === 0;
          const unitsConsumed = Math.min(currentStock, maxBatchFromBOM * reqPerUnit);

          feasibleBurnDownRuns.push({
            finishedGoodId: po.finishedGoodItemId,
            finishedGoodName: po.finishedGoodItem.name,
            finishedGoodSku: po.finishedGoodItem.sku,
            requiredPerUnit: reqPerUnit,
            maxFeasibleUnits: maxBatchFromBOM,
            atRiskUnitsConsumed: unitsConsumed,
            estimatedWasteAvoidedValue: unitsConsumed * 15, // Approximate waste savings
            isFeasible,
            missingComponents,
            infeasibilityReason: isFeasible
              ? undefined
              : missingComponents.length > 0
              ? `Missing secondary BOM component(s): ${missingComponents.map((m) => m.itemName).join(', ')}`
              : 'Insufficient remaining BOM capacity to safely burn down stock before expiry.',
          });
        }

        if (candidateOrders.length === 0) {
          feasibleBurnDownRuns.push({
            finishedGoodId: '',
            finishedGoodName: 'No active production orders linked',
            finishedGoodSku: '',
            requiredPerUnit: 0,
            maxFeasibleUnits: 0,
            atRiskUnitsConsumed: 0,
            estimatedWasteAvoidedValue: 0,
            isFeasible: false,
            missingComponents: [],
            infeasibilityReason: 'No BOM or production recipe currently registered requiring this component.',
          });
        }
      }

      atRiskItems.push({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock,
        expiryDate: item.expiryDate.toISOString(),
        daysUntilExpiry,
        status,
        isUsable,
        blockReason,
        feasibleBurnDownRuns,
      });
    }

    return {
      summary: {
        totalAtRiskCount: atRiskItems.length,
        expiredCount,
        nearExpiryCount,
        potentialWasteValue,
      },
      items: atRiskItems,
    };
  }

  /**
   * Approves an expedited burn-down order or isolates expired stock.
   * Requires Admin permissions. Uses database transactions and audit logging.
   */
  async approveBurnDownAction(
    input: {
      itemId: string;
      action: 'EXPEDITE_CONSUMPTION' | 'QUARANTINE_EXPIRED';
      targetOrderId?: string;
      quantity?: number;
      notes?: string;
    },
    adminUserId: string
  ): Promise<any> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: input.itemId },
    });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    const now = new Date();
    const isExpired = item.expiryDate && new Date(item.expiryDate).getTime() < now.getTime();

    if (input.action === 'EXPEDITE_CONSUMPTION' && isExpired) {
      throw new AppError(
        `Cannot schedule production with expired material ("${item.name}" expired on ${item.expiryDate?.toLocaleDateString()}). Expired items must be quarantined.`,
        400
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let auditDetails: any = { itemId: item.id, itemName: item.name, action: input.action };

      if (input.action === 'QUARANTINE_EXPIRED') {
        // Deactivate or quarantine
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            isActive: false,
            description: `${item.description ? item.description + ' | ' : ''}QUARANTINED on ${new Date().toLocaleDateString()}: Past expiry.`,
          },
        });
        auditDetails.status = 'QUARANTINED_DEACTIVATED';
      } else if (input.action === 'EXPEDITE_CONSUMPTION') {
        // Tag production order or notes
        if (input.targetOrderId) {
          const po = await tx.productionOrder.findUnique({ where: { id: input.targetOrderId } });
          if (po) {
            await tx.productionOrder.update({
              where: { id: po.id },
              data: {
                notes: `${po.notes ? po.notes + ' | ' : ''}PRIORITY EXPIRY BURN-DOWN: Lot ${item.sku} expires soon.`,
              },
            });
            auditDetails.targetOrderNumber = po.orderNumber;
          }
        }
      }

      const audit = await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'EXPIRY_BURNDOWN_APPROVED',
          entity: 'InventoryItem',
          entityId: item.id,
          details: {
            ...auditDetails,
            notes: input.notes,
          },
        },
      });

      return { auditId: audit.id, action: input.action };
    });

    return {
      success: true,
      data: result,
      message: `Expiry burn-down action "${input.action}" approved for "${item.name}".`,
    };
  }
}

export const expiryPlannerService = new ExpiryPlannerService();
