import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { shortageRescueService } from '../services/shortageRescue.service.js';
import { expiryPlannerService } from '../services/expiryPlanner.service.js';
import { recoveryResaleService } from '../services/recoveryResale.service.js';

const router = Router();

// Enforce strict Admin-only access across all routes
router.use(authenticate);
router.use(requireAdmin());

// ----------------------------------------------------------------------
// FEATURE 1: SHORTAGE RESCUE PLANNER
// ----------------------------------------------------------------------

router.get('/shortage-rescue/plans', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await shortageRescueService.getShortageRescuePlans();
    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/shortage-rescue/sales-shortages', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shortages = await shortageRescueService.getSalesOrderShortages();
    res.status(200).json({
      success: true,
      data: shortages,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/shortage-rescue/alternates', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const alternates = await shortageRescueService.listApprovedAlternates();
    res.status(200).json({
      success: true,
      data: alternates,
    });
  } catch (error) {
    next(error);
  }
});

const addAlternateSchema = z.object({
  originalItemId: z.string().uuid(),
  alternateItemId: z.string().uuid(),
  notes: z.string().optional(),
});

router.post('/shortage-rescue/alternates', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = addAlternateSchema.parse(req.body);
    const result = await shortageRescueService.addApprovedAlternate(
      data.originalItemId,
      data.alternateItemId,
      data.notes,
      req.user?.userId
    );
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

const approveRescueSchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(['SUBSTITUTE', 'PARTIAL_RUN', 'RESCHEDULE']),
  alternateItemId: z.string().uuid().optional(),
  substituteQty: z.coerce.number().positive().optional(),
  partialQty: z.coerce.number().positive().optional(),
  newStartDate: z.string().optional(),
});

router.post('/shortage-rescue/approve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = approveRescueSchema.parse(req.body);
    const result = await shortageRescueService.approveRescuePlan(data, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// FEATURE 2: EXPIRY BURN-DOWN PLANNER
// ----------------------------------------------------------------------

router.get('/expiry-planner/analysis', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 60;
    const analysis = await expiryPlannerService.getExpiryBurnDownAnalysis(days);
    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

const approveBurnDownSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(['EXPEDITE_CONSUMPTION', 'QUARANTINE_EXPIRED']),
  targetOrderId: z.string().uuid().optional(),
  quantity: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});

router.post('/expiry-planner/approve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = approveBurnDownSchema.parse(req.body);
    const result = await expiryPlannerService.approveBurnDownAction(data, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// FEATURE 3: RETURNED PRODUCT RECOVERY & RESALE ENGINE
// ----------------------------------------------------------------------

router.get('/recovery-resale/returns', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const returns = await recoveryResaleService.listReturns();
    res.status(200).json({
      success: true,
      data: returns,
    });
  } catch (error) {
    next(error);
  }
});

const createReturnSchema = z.object({
  itemId: z.string().uuid(),
  saleId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().positive(),
  reason: z.string().min(1, 'Reason is required'),
  condition: z.enum(['NEW_LIKE', 'OPEN_BOX', 'DAMAGED', 'DEFECTIVE', 'INCOMPLETE']),
  estimatedBasePrice: z.coerce.number().min(0).optional(),
  batchReference: z.string().optional(),
});

router.post('/recovery-resale/returns', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createReturnSchema.parse(req.body);
    const result = await recoveryResaleService.createReturn(data, req.user!.userId);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

const inspectReturnSchema = z.object({
  inspectionStatus: z.enum(['INSPECTED_PASSED', 'INSPECTED_REPAIR_NEEDED', 'INSPECTED_FAILED']),
  inspectionNotes: z.string().min(1, 'Inspection notes are required'),
  overrideRoute: z.enum(['OPEN_BOX_RESALE', 'REFURBISH', 'REPAIR', 'COMPONENT_RECOVERY', 'QUARANTINE', 'RECYCLE_SCRAP']).optional(),
  resalePrice: z.coerce.number().min(0).optional(),
});

router.post('/recovery-resale/returns/:id/inspect', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = inspectReturnSchema.parse(req.body);
    const returnId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await recoveryResaleService.inspectReturn(returnId, data, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

const approveReturnRouteSchema = z.object({
  action: z.enum(['APPROVE_OPEN_BOX', 'APPROVE_COMPONENT_RECOVERY', 'SCRAP_RECYCLE', 'ROUTE_REPAIR']),
  targetComponentId: z.string().uuid().optional(),
  salvagedQuantity: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});

router.post('/recovery-resale/returns/:id/approve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = approveReturnRouteSchema.parse(req.body);
    const returnId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await recoveryResaleService.approveRecoveryRoute(returnId, data, req.user!.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
