import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  cancelPurchase,
  receivePurchase,
} from '../controllers/purchase.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('purchases:read'), listPurchases);
router.get('/:id', requirePermission('purchases:read'), getPurchase);
router.post('/', requirePermission('purchases:create'), createPurchase);
router.patch('/:id', requirePermission('purchases:create'), updatePurchase);
router.post('/:id/cancel', requirePermission('purchases:create'), cancelPurchase);
router.post('/:id/receive', requirePermission('purchases:create'), receivePurchase);

export default router;
