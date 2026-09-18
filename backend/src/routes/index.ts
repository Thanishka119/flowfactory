import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import inventoryRoutes from './inventory.routes.js';
import supplierRoutes from './supplier.routes.js';
import purchaseRoutes from './purchase.routes.js';
import invoiceRoutes from './invoice.routes.js';
import productionRoutes from './production.routes.js';
import saleRoutes from './sale.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import simulatorRoutes from './simulator.routes.js';
import userRoutes from './user.routes.js';

const apiRouter = Router();

apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/production', productionRoutes);
apiRouter.use('/sales', saleRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/simulator', simulatorRoutes);

export default apiRouter;
