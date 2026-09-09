import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { getDashboardSummary, getReportData } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/summary', requirePermission('inventory:read'), getDashboardSummary);
router.get('/reports', requirePermission('reports:read'), getReportData);

export default router;
