import { Router } from 'express';
import {
  loginController,
  getMe,
  refreshController,
  logoutController,
} from '../controllers/auth.controller.js';
import {
  authenticate,
  requirePermission,
} from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.get(
  '/me',
  authenticate,
  requirePermission('users:read'),
  getMe,
);

export default router;