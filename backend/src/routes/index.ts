import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import inventoryRoutes from './inventory.routes.js';
import supplierRoutes from './supplier.routes.js';
import purchaseRoutes from './purchase.routes.js';
import invoiceRoutes from './invoice.routes.js';

const apiRouter = Router();

apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/invoices', invoiceRoutes);

export default apiRouter;
