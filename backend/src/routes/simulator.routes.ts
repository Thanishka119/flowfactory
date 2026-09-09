import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  simulateProduction,
  simulateSale,
  getInventoryIntelligence,
} from '../controllers/simulator.controller.js';

const router = Router();

router.use(authenticate);

router.post('/production', requirePermission('production:read'), simulateProduction);
router.post('/sale', requirePermission('sales:read'), simulateSale);
router.get('/intelligence', requirePermission('inventory:read'), getInventoryIntelligence);

export default router;
