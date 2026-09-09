import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listSales,
  getSale,
  createSale,
  completeSale,
  cancelSale,
} from '../controllers/sale.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('sales:read'), listSales);
router.get('/:id', requirePermission('sales:read'), getSale);
router.post('/', requirePermission('sales:create'), createSale);
router.post('/:id/complete', requirePermission('sales:create'), completeSale);
router.post('/:id/cancel', requirePermission('sales:create'), cancelSale);

export default router;
