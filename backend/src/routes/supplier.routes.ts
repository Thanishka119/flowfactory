import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  activateSupplier,
} from '../controllers/supplier.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('suppliers:read'), listSuppliers);
router.get('/:id', requirePermission('suppliers:read'), getSupplier);
router.post('/', requirePermission('suppliers:manage'), createSupplier);
router.patch('/:id', requirePermission('suppliers:manage'), updateSupplier);
router.patch('/:id/deactivate', requirePermission('suppliers:manage'), deactivateSupplier);
router.patch('/:id/activate', requirePermission('suppliers:manage'), activateSupplier);

export default router;
