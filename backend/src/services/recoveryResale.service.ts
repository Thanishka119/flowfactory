import { prisma } from '../config/db.js';
import { TransactionType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { inventoryService } from './inventory.service.js';

export type ReturnCondition = 'NEW_LIKE' | 'OPEN_BOX' | 'DAMAGED' | 'DEFECTIVE' | 'INCOMPLETE';
export type ReturnInspectionStatus = 'PENDING_INSPECTION' | 'INSPECTED_PASSED' | 'INSPECTED_REPAIR_NEEDED' | 'INSPECTED_FAILED';
export type RecoveryRoute = 'OPEN_BOX_RESALE' | 'REFURBISH' | 'REPAIR' | 'COMPONENT_RECOVERY' | 'QUARANTINE' | 'RECYCLE_SCRAP';

export interface ProductReturnItem {
  id: string;
  returnNumber: string;
  saleId: string | null;
  saleNumber?: string | null;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  reason: string;
  condition: ReturnCondition;
  inspectionStatus: ReturnInspectionStatus;
  inspectionNotes?: string | null;
  recommendedRoute: RecoveryRoute;
  routeExplanation: string;
  resalePrice?: number | null;
  status: 'PENDING' | 'INSPECTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  batchReference?: string | null;
  dispositionAction?: string | null;
  inventoryStatus: string;
  executedAt?: string | null;
  createdAt: string;
}

export class RecoveryResaleService {
  /**
   * Deterministically recommends a safe, explainable recovery route based on condition, completeness and safety.
   */
  evaluateRoute(
    condition: ReturnCondition,
    inspectionStatus: ReturnInspectionStatus = 'PENDING_INSPECTION',
    basePrice: number = 100
  ): { route: RecoveryRoute; explanation: string; suggestedResalePrice?: number } {
    if (inspectionStatus === 'INSPECTED_FAILED') {
      return {
        route: 'QUARANTINE',
        explanation: 'Item failed formal safety or quality inspection. Quarantined to prevent contamination of stock.',
      };
    }

    switch (condition) {
      case 'NEW_LIKE':
        return {
          route: 'OPEN_BOX_RESALE',
          explanation: 'Packaging unsealed or handled, but item is intact with zero defects. Route to Open-Box resale at 15% discount. Never labeled as New.',
          suggestedResalePrice: Math.round(basePrice * 0.85 * 100) / 100,
        };
      case 'OPEN_BOX':
        return {
          route: 'OPEN_BOX_RESALE',
          explanation: 'Open-box condition with complete accessories and normal cosmetics. Route to Open-Box clearance at 25% discount.',
          suggestedResalePrice: Math.round(basePrice * 0.75 * 100) / 100,
        };
      case 'DAMAGED':
        return {
          route: 'REPAIR',
          explanation: 'Physical or cosmetic damage detected. Route to internal maintenance/repair before any resale or re-issue.',
        };
      case 'DEFECTIVE':
        return {
          route: 'COMPONENT_RECOVERY',
          explanation: 'Unit is non-functional as a finished good, but internal components (boards, hardware) can be inspected, salvaged, and reclaimed.',
        };
      case 'INCOMPLETE':
        return {
          route: 'QUARANTINE',
          explanation: 'Critical components or safety accessories are missing. Item cannot be safely resold or used until completeness check.',
        };
      default:
        return {
          route: 'QUARANTINE',
          explanation: 'Unknown return condition. Quarantined pending full physical evaluation.',
        };
    }
  }

  /**
   * Lists all product returns with full genealogy.
   */
  async listReturns(): Promise<ProductReturnItem[]> {
    const raw = (await prisma.$queryRawUnsafe(`
      SELECT
        pr.id, pr.return_number as "returnNumber", pr.sale_id as "saleId", pr.item_id as "itemId",
        pr.quantity, pr.reason, pr.condition, pr.inspection_status as "inspectionStatus",
        pr.inspection_notes as "inspectionNotes", pr.recommended_route as "recommendedRoute",
        pr.route_explanation as "routeExplanation", pr.resale_price as "resalePrice",
        pr.status, pr.created_at as "createdAt",
        pr.batch_reference as "batchReference",
        pr.disposition_action as "dispositionAction",
        COALESCE(pr.inventory_status, 'HELD_IN_RETURNS') as "inventoryStatus",
        pr.executed_at as "executedAt",
        item.name as "itemName", item.sku as "itemSku",
        s.sale_number as "saleNumber"
      FROM product_returns pr
      JOIN inventory_items item ON item.id = pr.item_id
      LEFT JOIN sales s ON s.id = pr.sale_id
      ORDER BY pr.created_at DESC
    `)) as any[];

    return raw.map((r) => ({
      id: r.id,
      returnNumber: r.returnNumber,
      saleId: r.saleId,
      saleNumber: r.saleNumber,
      itemId: r.itemId,
      itemName: r.itemName,
      itemSku: r.itemSku,
      quantity: Number(r.quantity),
      reason: r.reason,
      condition: r.condition as ReturnCondition,
      inspectionStatus: r.inspectionStatus as ReturnInspectionStatus,
      inspectionNotes: r.inspectionNotes,
      recommendedRoute: r.recommendedRoute as RecoveryRoute,
      routeExplanation: r.routeExplanation,
      resalePrice: r.resalePrice ? Number(r.resalePrice) : null,
      status: r.status,
      batchReference: r.batchReference,
      dispositionAction: r.dispositionAction,
      inventoryStatus: r.inventoryStatus || 'HELD_IN_RETURNS',
      executedAt: r.executedAt ? new Date(r.executedAt).toISOString() : null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Ingests a new returned product. Runs automatic evaluation without mutating sellable stock.
   */
  async createReturn(
    input: {
      itemId: string;
      saleId?: string | null;
      quantity: number;
      reason: string;
      condition: ReturnCondition;
      estimatedBasePrice?: number;
      batchReference?: string;
    },
    adminUserId: string
  ): Promise<any> {
    const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    if (input.quantity <= 0) {
      throw new AppError('Return quantity must be greater than 0', 400);
    }

    if (input.saleId) {
      const sale = await prisma.sale.findUnique({ where: { id: input.saleId } });
      if (!sale) {
        throw new AppError('Referenced original sale order not found', 404);
      }
    }

    const { route, explanation, suggestedResalePrice } = this.evaluateRoute(
      input.condition,
      'PENDING_INSPECTION',
      input.estimatedBasePrice || 100
    );

    const returnNumber = `RET-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO product_returns (
        id, return_number, sale_id, item_id, quantity, reason, condition,
        inspection_status, recommended_route, route_explanation, resale_price, status,
        batch_reference, inventory_status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'PENDING_INSPECTION', $7, $8, $9, 'PENDING',
        $10, 'HELD_IN_RETURNS', NOW(), NOW()
      )
    `,
      returnNumber,
      input.saleId || null,
      input.itemId,
      input.quantity,
      input.reason,
      input.condition,
      route,
      explanation,
      suggestedResalePrice || null,
      input.batchReference || null
    );

    // Audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PRODUCT_RETURN_INGESTED',
        entity: 'ProductReturn',
        entityId: returnNumber,
        details: {
          returnNumber,
          itemSku: item.sku,
          itemName: item.name,
          quantity: input.quantity,
          condition: input.condition,
          recommendedRoute: route,
          inventoryStatus: 'HELD_IN_RETURNS',
        },
      },
    });

    return {
      success: true,
      returnNumber,
      recommendedRoute: route,
      routeExplanation: explanation,
      resalePrice: suggestedResalePrice,
      inventoryStatus: 'HELD_IN_RETURNS',
      message: `Return ${returnNumber} registered in returns holding state. Sellable inventory balance is unchanged pending technical inspection.`,
    };
  }

  /**
   * Records formal inspection outcomes for a return.
   */
  async inspectReturn(
    id: string,
    input: {
      inspectionStatus: ReturnInspectionStatus;
      inspectionNotes: string;
      overrideRoute?: RecoveryRoute;
      resalePrice?: number;
    },
    adminUserId: string
  ): Promise<any> {
    const raw = (await prisma.$queryRawUnsafe(`SELECT * FROM product_returns WHERE id = $1::uuid`, id)) as any[];
    if (!raw || raw.length === 0) {
      throw new AppError('Product return record not found', 404);
    }
    const current = raw[0];

    if (current.status === 'COMPLETED' || current.status === 'APPROVED') {
      throw new AppError('Cannot inspect an already finalized disposition.', 400);
    }

    const { route, explanation, suggestedResalePrice } = this.evaluateRoute(
      current.condition as ReturnCondition,
      input.inspectionStatus,
      input.resalePrice || 100
    );

    const finalRoute = input.overrideRoute || route;
    const finalPrice = input.resalePrice !== undefined ? input.resalePrice : suggestedResalePrice;
    const inventoryStatus = input.inspectionStatus === 'INSPECTED_FAILED' ? 'QUARANTINE_HOLD' : 'INSPECTED_AWAITING_DISPOSITION';

    await prisma.$executeRawUnsafe(
      `
      UPDATE product_returns
      SET inspection_status = $1, inspection_notes = $2, recommended_route = $3,
          route_explanation = $4, resale_price = $5, status = 'INSPECTED',
          inventory_status = $6, updated_at = NOW()
      WHERE id = $7::uuid
    `,
      input.inspectionStatus,
      input.inspectionNotes,
      finalRoute,
      explanation,
      finalPrice || null,
      inventoryStatus,
      id
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PRODUCT_RETURN_INSPECTED',
        entity: 'ProductReturn',
        entityId: id,
        details: {
          returnNumber: current.return_number,
          inspectionStatus: input.inspectionStatus,
          notes: input.inspectionNotes,
          finalRoute,
          inventoryStatus,
        },
      },
    });

    return {
      success: true,
      inventoryStatus,
      message: `Inspection recorded for return ${current.return_number}. Recommended disposition: ${finalRoute}.`,
    };
  }

  /**
   * Approves and executes recovery route disposition.
   * Consequential stock movements require Admin authorization and use centralized inventoryService.
   */
  async approveRecoveryRoute(
    id: string,
    input: {
      action: 'APPROVE_OPEN_BOX' | 'APPROVE_COMPONENT_RECOVERY' | 'SCRAP_RECYCLE' | 'ROUTE_REPAIR';
      targetComponentId?: string;
      salvagedQuantity?: number;
      notes?: string;
    },
    adminUserId: string
  ): Promise<any> {
    const raw = (await prisma.$queryRawUnsafe(`SELECT * FROM product_returns WHERE id = $1::uuid`, id)) as any[];
    if (!raw || raw.length === 0) {
      throw new AppError('Product return record not found', 404);
    }
    const ret = raw[0];

    // Enforce idempotency: prevent repeated submissions
    if (ret.status === 'COMPLETED' || ret.status === 'APPROVED') {
      throw new AppError('This return disposition has already been executed. Duplicate processing is prohibited.', 400);
    }

    // Require inspection prior to disposition execution
    if (ret.inspection_status === 'PENDING_INSPECTION') {
      throw new AppError('Return must undergo technical inspection before a recovery route can be approved.', 400);
    }

    // Safety constraint: Failed items cannot be approved for open-box resale
    if (ret.inspection_status === 'INSPECTED_FAILED' && input.action === 'APPROVE_OPEN_BOX') {
      throw new AppError('Safety violation: An item that failed technical inspection cannot be approved for Open-Box resale.', 400);
    }

    let inventoryStatus = 'HELD_IN_RETURNS';
    let dispositionAction = input.action;
    let message = '';

    if (input.action === 'APPROVE_COMPONENT_RECOVERY') {
      if (!input.targetComponentId || !input.salvagedQuantity || input.salvagedQuantity <= 0) {
        throw new AppError('Component recovery requires a valid target component and a positive salvaged quantity.', 400);
      }
      if (input.salvagedQuantity > Number(ret.quantity)) {
        throw new AppError(`Salvaged quantity (${input.salvagedQuantity}) cannot exceed eligible returned quantity (${ret.quantity}).`, 400);
      }
      // Re-credit salvaged components into inventory using centralized inventory transaction service
      await inventoryService.increaseStock({
        itemId: input.targetComponentId,
        quantity: input.salvagedQuantity,
        type: TransactionType.ADJUSTMENT,
        performedById: adminUserId,
        referenceType: 'RETURN_SALVAGE',
        referenceId: ret.return_number,
        notes: `Salvaged component recovery from return ${ret.return_number}. Original item: ${ret.item_id}.`,
      });
      inventoryStatus = 'COMPONENTS_RECOVERED';
      message = `Salvaged ${input.salvagedQuantity} components recredited to inventory ledger for return ${ret.return_number}.`;
    } else if (input.action === 'APPROVE_OPEN_BOX') {
      // The application schema has only a single sellable stock balance (current_stock) without condition grading badges.
      // To prevent commingling unsealed/returned goods into prime new inventory, units remain preserved in the Open-Box Resale Ledger.
      inventoryStatus = 'PRESERVED_OPEN_BOX_LEDGER';
      message = `Return ${ret.return_number} approved for Open-Box resale. Preserved in Open-Box Resale Ledger to prevent commingling into prime sellable inventory.`;
    } else if (input.action === 'SCRAP_RECYCLE') {
      inventoryStatus = 'QUARANTINED';
      message = `Return ${ret.return_number} routed to quarantine/scrap. Units are non-sellable.`;
    } else {
      inventoryStatus = 'IN_MAINTENANCE_HOLD';
      message = `Return ${ret.return_number} routed to internal repair facility. Held outside sellable stock.`;
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE product_returns
      SET status = 'COMPLETED', disposition_action = $1, inventory_status = $2, executed_at = NOW(), updated_at = NOW()
      WHERE id = $3::uuid
    `,
      dispositionAction,
      inventoryStatus,
      id
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PRODUCT_RETURN_DISPOSITION_EXECUTED',
        entity: 'ProductReturn',
        entityId: id,
        details: {
          returnNumber: ret.return_number,
          action: input.action,
          inventoryStatus,
          notes: input.notes,
        },
      },
    });

    return {
      success: true,
      inventoryStatus,
      message,
    };
  }
}

export const recoveryResaleService = new RecoveryResaleService();
