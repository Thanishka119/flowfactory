import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listProductionOrders,
  getProductionOrder,
  createProductionOrder,
  updateProductionOrder,
  startProductionOrder,
  completeProductionOrder,
  cancelProductionOrder,
} from '../controllers/production.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('production:read'), listProductionOrders);
router.get('/:id', requirePermission('production:read'), getProductionOrder);
router.post('/', requirePermission('production:create'), createProductionOrder);
router.patch('/:id', requirePermission('production:create'), updateProductionOrder);
router.post('/:id/start', requirePermission('production:execute'), startProductionOrder);
router.post('/:id/complete', requirePermission('production:execute'), completeProductionOrder);
router.post('/:id/cancel', requirePermission('production:execute'), cancelProductionOrder);

export default router;
