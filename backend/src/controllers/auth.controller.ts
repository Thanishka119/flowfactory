import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import {
  login,
  refreshAccessToken,
  logout,
} from '../services/auth.service.js';
import { type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = loginSchema.parse(req.body);

    const result = await login(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new AppError(
        'Refresh token is required',
        400,
        'REFRESH_TOKEN_REQUIRED',
      );
    }

    const result = await refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(
        'Authentication required',
        401,
        'AUTHENTICATION_REQUIRED',
      );
    }

    res.status(200).json({
      success: true,
      data: {
        userId: req.user.userId,
        email: req.user.email,
        roleId: req.user.roleId,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new AppError(
        'Refresh token is required',
        400,
        'REFRESH_TOKEN_REQUIRED',
      );
    }

    const result = await logout(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}