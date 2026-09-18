import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import {
  listUsersController,
  listRolesController,
  createUserController,
  deactivateUserController,
  activateUserController,
} from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('users:read'), listUsersController);
router.get('/roles', requirePermission('users:read'), listRolesController);
router.post('/', requirePermission('users:create'), createUserController);
router.patch('/:id/deactivate', requirePermission('users:update'), deactivateUserController);
router.patch('/:id/activate', requirePermission('users:update'), activateUserController);

export default router;
