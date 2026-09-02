import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
export interface JwtPayload {
  userId: string;
  roleId: string;
  email: string;
  type: 'access' | 'refresh';
  exp?: number;
}

export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions,
  );
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions,
  );
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as Partial<JwtPayload>;

  if (
    typeof payload.userId !== 'string' ||
    typeof payload.roleId !== 'string' ||
    typeof payload.email !== 'string' ||
    (payload.type !== 'access' && payload.type !== 'refresh')
  ) {
    throw new Error('Invalid token payload');
  }

  return payload as JwtPayload;
}