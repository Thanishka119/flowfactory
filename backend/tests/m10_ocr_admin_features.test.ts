import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Hoist mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const prismaMock: any = {
    invoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoiceItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    productionOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productionItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };

  return { mockPrisma: prismaMock };
});

vi.mock('../src/config/db.js', () => ({ prisma: mockPrisma }));

import { invoiceOcrService, extractPdfTokens } from '../src/services/invoiceOcr.service.js';
import { shortageRescueService } from '../src/services/shortageRescue.service.js';
import { expiryPlannerService } from '../src/services/expiryPlanner.service.js';
import { recoveryResaleService } from '../src/services/recoveryResale.service.js';
import { requireAdmin } from '../src/middleware/auth.middleware.js';

describe('FLOWFACTORY — Invoice OCR Pipeline & Admin Features Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Part A — OCR Extraction and Product Matching', () => {
    it('accurately parses 01_purchase_normal_stock.pdf headers, lines, lot/batch, expiry, and currency', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);
      mockPrisma.supplier.findMany.mockResolvedValue([]);

      const samplePdfPath = 'D:/software engineering/project/01_purchase_normal_stock.pdf';
      const fileBuffer = fs.readFileSync(samplePdfPath);

      const result = await invoiceOcrService.processInvoice(samplePdfPath, fileBuffer);

      // Header fields
      expect(result.invoiceNumber).toBe('VTX-PI-2601');
      expect(result.supplierName).toBe('Vetri Industrial Supplies');
      expect(result.billToReference).toBe('FlowFactory Test Plant');
      expect(result.currency).toBe('Rs');

      // Totals
      expect(result.subtotal).toBe(6640);
      expect(result.taxTotal).toBe(259.2);
      expect(result.totalAmount).toBe(6899.2);
      expect(result.discrepancyNote).toBeNull();

      // Line items
      expect(result.items).toHaveLength(3);

      // Item 1
      expect(result.items[0].extractedSku).toBe('TEST-COMP-001');
      expect(result.items[0].extractedDescription).toBe('ESP32 Development Board');
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[0].unitPrice).toBe(350);
      expect(result.items[0].taxRate).toBe(0);
      expect(result.items[0].totalPrice).toBe(3500);
      expect(result.items[0].lotBatch).toBe('LOT-ESP-2210');
      expect(result.items[0].expiryNote).toBe('No expiry');
      expect(result.items[0].matchedItemId).toBeNull();
      expect(result.items[0].matchReason).toBe('Unmatched — Needs Review');

      // Item 2
      expect(result.items[1].extractedSku).toBe('TEST-COMP-002');
      expect(result.items[1].extractedDescription).toBe('Relay Module 5V');
      expect(result.items[1].quantity).toBe(20);
      expect(result.items[1].unitPrice).toBe(85);
      expect(result.items[1].totalPrice).toBe(1700);
      expect(result.items[1].lotBatch).toBe('LOT-RLY-2210');

      // Item 3
      expect(result.items[2].extractedSku).toBe('TEST-COMP-003');
      expect(result.items[2].extractedDescription).toBe('Industrial Adhesive Cartridge');
      expect(result.items[2].quantity).toBe(6);
      expect(result.items[2].unitPrice).toBe(240);
      expect(result.items[2].taxRate).toBe(18);
      expect(result.items[2].totalPrice).toBe(1440);
      expect(result.items[2].lotBatch).toBe('LOT-ADH-2210');
      expect(result.items[2].expiryNote).toBe('Expiry 22-Oct-2027');
    });

    it('does not fall back to INV-7125, Prime Metals, High-Grade Steel Sheet 2mm, or Oak Timber Plank', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { id: 'item-1', sku: 'RM-STEEL-001', name: 'High-Grade Steel Sheet 2mm', category: 'Raw Materials', unit: 'pcs', type: 'RAW_MATERIAL' },
        { id: 'item-2', sku: 'RM-WOOD-001', name: 'Oak Timber Plank 2x4', category: 'Raw Materials', unit: 'pcs', type: 'RAW_MATERIAL' },
      ]);
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 'supp-1', name: 'Prime Metals & Hardware' },
      ]);

      const samplePdfPath = 'D:/software engineering/project/01_purchase_normal_stock.pdf';
      const fileBuffer = fs.readFileSync(samplePdfPath);

      const result = await invoiceOcrService.processInvoice(samplePdfPath, fileBuffer);

      // Verifies no fallback to first catalog/supplier items
      expect(result.invoiceNumber).not.toBe('INV-7125');
      expect(result.supplierName).not.toBe('Prime Metals & Hardware');
      expect(result.matchedSupplierId).toBeNull(); // Vetri Industrial Supplies does not exist in mock, remains unmatched!

      // All items must remain Unmatched — Needs Review
      for (const line of result.items) {
        expect(line.matchedItemId).toBeNull();
        expect(line.matchReason).toBe('Unmatched — Needs Review');
      }
    });

    it('matches catalog item when exact SKU or exact normalized name exists', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { id: 'item-relay', sku: 'TEST-COMP-002', name: 'Relay Module 5V', category: 'Components', unit: 'pcs', type: 'COMPONENT' },
      ]);
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 'supp-vetri', name: 'Vetri Industrial Supplies' },
      ]);

      const samplePdfPath = 'D:/software engineering/project/01_purchase_normal_stock.pdf';
      const fileBuffer = fs.readFileSync(samplePdfPath);

      const result = await invoiceOcrService.processInvoice(samplePdfPath, fileBuffer);

      expect(result.matchedSupplierId).toBe('supp-vetri');
      expect(result.items[0].matchedItemId).toBeNull(); // TEST-COMP-001 unmatched
      expect(result.items[1].matchedItemId).toBe('item-relay'); // TEST-COMP-002 exact match
      expect(result.items[1].matchReason).toContain('Exact SKU match');
      expect(result.items[2].matchedItemId).toBeNull(); // TEST-COMP-003 unmatched
    });
  });

  describe('Part B — Admin Feature 1: Shortage Rescue Planner', () => {
    it('detects component shortage and proposes approved alternate when stock is sufficient', async () => {
      mockPrisma.productionOrder.findMany.mockResolvedValue([
        {
          id: 'po-1',
          orderNumber: 'PO-2026-001',
          finishedGoodItemId: 'fg-1',
          plannedQuantity: 10,
          status: 'IN_PROGRESS',
          startDate: new Date('2026-10-22'),
          completionDate: new Date('2026-10-24'),
          finishedGoodItem: { id: 'fg-1', name: 'Smart IoT Gateway', sku: 'FG-GATEWAY' },
          requiredItems: [
            {
              id: 'pi-1',
              itemId: 'comp-esp',
              requiredQuantity: 1, // 10 total needed
              item: { id: 'comp-esp', name: 'ESP32 Development Board', sku: 'TEST-COMP-001', currentStock: 2 }, // Shortage: 8
            },
          ],
        },
      ]);

      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'alt-row-1',
          originalItemId: 'comp-esp',
          alternateItemId: 'comp-esp-s3',
          notes: 'ESP32-S3 compatible drop-in',
          alternateName: 'ESP32-S3 Pro Board',
          alternateSku: 'TEST-COMP-001-S3',
          alternateStock: 25,
        },
      ]);

      const plans = await shortageRescueService.getShortageRescuePlans();

      expect(plans).toHaveLength(1);
      const plan = plans[0];
      expect(plan.orderNumber).toBe('PO-2026-001');
      expect(plan.urgency).toBe('CRITICAL');
      expect(plan.shortageItems[0].shortageQuantity).toBe(8);
      expect(plan.shortageItems[0].approvedAlternates[0].isStockSufficient).toBe(true);

      const subRec = plan.recommendations.find((r) => r.type === 'SUBSTITUTE');
      expect(subRec?.isFeasible).toBe(true);
      expect(subRec?.alternateItemId).toBe('comp-esp-s3');
    });

    it('calculates feasible partial run quantity across all BOM components', async () => {
      mockPrisma.productionOrder.findMany.mockResolvedValue([
        {
          id: 'po-2',
          orderNumber: 'PO-2026-002',
          finishedGoodItemId: 'fg-1',
          plannedQuantity: 50,
          status: 'DRAFT',
          finishedGoodItem: { id: 'fg-1', name: 'Industrial Relay Box', sku: 'FG-RELAY' },
          requiredItems: [
            {
              id: 'pi-1',
              itemId: 'comp-1',
              requiredQuantity: 2, // 50 * 2 = 100 needed, 40 stock => 20 feasible
              item: { id: 'comp-1', name: 'Relay Module 5V', sku: 'TEST-COMP-002', currentStock: 40 },
            },
            {
              id: 'pi-2',
              itemId: 'comp-2',
              requiredQuantity: 1, // 50 * 1 = 50 needed, 15 stock => 15 feasible
              item: { id: 'comp-2', name: 'Industrial Adhesive', sku: 'TEST-COMP-003', currentStock: 15 },
            },
          ],
        },
      ]);

      mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // No alternates

      const plans = await shortageRescueService.getShortageRescuePlans();
      expect(plans).toHaveLength(1);
      expect(plans[0].feasiblePartialQuantity).toBe(15); // Limited by comp-2 (15 / 1 = 15)

      const partialRec = plans[0].recommendations.find((r) => r.type === 'PARTIAL_RUN');
      expect(partialRec?.isFeasible).toBe(true);
      expect(partialRec?.recommendedQuantity).toBe(15);
    });
  });

  describe('Part B — Admin Feature 2: Expiry Burn-down Planner', () => {
    it('flags past-expiry batches as BLOCKED from production or issue', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 10); // 10 days ago

      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-expired',
          sku: 'TEST-COMP-006',
          name: 'Cleaning Solvent 500 ml',
          category: 'Chemicals',
          unit: 'bottles',
          currentStock: 4,
          expiryDate: pastDate,
          productionItemRequirements: [],
        },
      ]);

      mockPrisma.productionItem.findMany.mockResolvedValue([]);

      const analysis = await expiryPlannerService.getExpiryBurnDownAnalysis(60);

      expect(analysis.summary.expiredCount).toBe(1);
      const expiredItem = analysis.items[0];
      expect(expiredItem.status).toBe('EXPIRED');
      expect(expiredItem.isUsable).toBe(false);
      expect(expiredItem.blockReason).toContain('Strictly prohibited from production and issue');
      expect(expiredItem.feasibleBurnDownRuns[0].isFeasible).toBe(false);
    });

    it('identifies missing secondary BOM component and flags recommendation as infeasible', async () => {
      const nearFutureDate = new Date(Date.now() + 86400000 * 15); // 15 days ahead

      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-resin',
          sku: 'TEST-COMP-004',
          name: 'Epoxy Resin Kit',
          category: 'Chemicals',
          unit: 'kits',
          currentStock: 8,
          expiryDate: nearFutureDate,
          productionItemRequirements: [],
        },
      ]);

      mockPrisma.productionItem.findMany.mockResolvedValue([
        {
          id: 'pi-1',
          itemId: 'item-resin',
          requiredQuantity: 1,
          productionOrder: {
            id: 'po-bonded',
            finishedGoodItemId: 'fg-panel',
            finishedGoodItem: { name: 'Reinforced Enclosure Panel', sku: 'FG-PANEL' },
            requiredItems: [
              {
                itemId: 'item-resin',
                requiredQuantity: 1,
                item: { currentStock: 8 },
              },
              {
                itemId: 'item-hardener',
                requiredQuantity: 1,
                item: { id: 'item-hardener', name: 'Polyamide Hardener', sku: 'RM-HARD-001', currentStock: 0 }, // MISSING
              },
            ],
          },
        },
      ]);

      const analysis = await expiryPlannerService.getExpiryBurnDownAnalysis(60);
      const resinItem = analysis.items[0];

      expect(resinItem.status).toBe('NEAR_EXPIRY');
      expect(resinItem.isUsable).toBe(true);
      expect(resinItem.feasibleBurnDownRuns[0].isFeasible).toBe(false);
      expect(resinItem.feasibleBurnDownRuns[0].infeasibilityReason).toContain('Missing secondary BOM component(s)');
      expect(resinItem.feasibleBurnDownRuns[0].infeasibilityReason).toContain('Polyamide Hardener');
    });
  });

  describe('Part B — Admin Feature 3: Returned Product Recovery & Resale Engine', () => {
    it('evaluates NEW_LIKE as OPEN_BOX_RESALE with discount and never labels as New', () => {
      const eval1 = recoveryResaleService.evaluateRoute('NEW_LIKE', 'PENDING_INSPECTION', 200);
      expect(eval1.route).toBe('OPEN_BOX_RESALE');
      expect(eval1.explanation).toContain('Never labeled as New');
      expect(eval1.suggestedResalePrice).toBe(170); // 15% discount
    });

    it('evaluates DEFECTIVE as COMPONENT_RECOVERY', () => {
      const eval2 = recoveryResaleService.evaluateRoute('DEFECTIVE', 'PENDING_INSPECTION', 100);
      expect(eval2.route).toBe('COMPONENT_RECOVERY');
      expect(eval2.explanation).toContain('salvaged, and reclaimed');
    });

    it('evaluates INSPECTED_FAILED as QUARANTINE', () => {
      const eval3 = recoveryResaleService.evaluateRoute('NEW_LIKE', 'INSPECTED_FAILED', 100);
      expect(eval3.route).toBe('QUARANTINE');
      expect(eval3.explanation).toContain('failed formal safety or quality inspection');
    });
  });

  describe('Part C — Security & RBAC Enforcement', () => {
    it('denies access to non-admin roles for Admin-only routes', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'PURCHASE_MANAGER' });

      const req: any = {
        user: { userId: 'user-pm', roleId: 'role-pm', email: 'pm@flowfactory.com' },
      };
      const res: any = {};
      const next = vi.fn();

      const middleware = requireAdmin();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Forbidden: Admin access required',
        })
      );
    });

    it('allows access to admin users', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'ADMIN' });

      const req: any = {
        user: { userId: 'user-admin', roleId: 'role-admin', email: 'admin@flowfactory.com' },
      };
      const res: any = {};
      const next = vi.fn();

      const middleware = requireAdmin();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // No error passed
    });
  });
});
