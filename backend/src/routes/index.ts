import { Router } from 'express';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

// Mount sub-routers
apiRouter.use('/', healthRoutes);

export default apiRouter;
