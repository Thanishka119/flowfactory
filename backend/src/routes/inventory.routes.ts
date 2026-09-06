import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
  getTransactionHistory,
  adjustStock,
} from '../controllers/inventory.controller.js';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

router.get('/', requirePermission('inventory:read'), listInventoryItems);
router.get('/:id', requirePermission('inventory:read'), getInventoryItem);
router.post('/', requirePermission('inventory:create'), createInventoryItem);
router.patch('/:id', requirePermission('inventory:update'), updateInventoryItem);
router.patch('/:id/deactivate', requirePermission('inventory:update'), deactivateInventoryItem);
router.get('/:id/transactions', requirePermission('inventory:read'), getTransactionHistory);
router.post('/:id/adjust', requirePermission('inventory:adjust'), adjustStock);

export default router;
