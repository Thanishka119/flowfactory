import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  verifyInvoice,
  processInvoice,
} from '../controllers/invoice.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('purchases:read'), listInvoices);
router.get('/:id', requirePermission('purchases:read'), getInvoice);
router.post('/', requirePermission('invoices:upload'), createInvoice);
router.post('/:id/process', requirePermission('invoices:upload'), processInvoice);
router.post('/:id/verify', requirePermission('invoices:verify'), verifyInvoice);

export default router;
