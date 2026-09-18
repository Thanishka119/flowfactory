import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roleId: string;
    email: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new AppError(
        'Authentication required',
        401,
        'AUTHENTICATION_REQUIRED',
      );
    }

    const token = authorization.substring(7);

    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new AppError(
        'Access token required',
        401,
        'INVALID_TOKEN_TYPE',
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, roleId: true, email: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new AppError(
        'User account is inactive or disabled',
        401,
        'ACCOUNT_INACTIVE',
      );
    }

    req.user = {
      userId: dbUser.id,
      roleId: dbUser.roleId,
      email: dbUser.email,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError(
        'Invalid or expired token',
        401,
        'INVALID_TOKEN',
      ),
    );
  }
}

export function requirePermission(permissionName: string) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED',
        );
      }

      const permission = await prisma.rolePermission.findFirst({
        where: {
          roleId: req.user.roleId,
          permission: {
            name: permissionName,
          },
        },
      });

      if (!permission) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'FORBIDDEN',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}