import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../utils/jwt.js';

interface LoginInput {
  email: string;
  password: string;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email.toLowerCase(),
    },
    include: {
      role: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const passwordValid = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordValid) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const tokenPayload = {
    userId: user.id,
    roleId: user.roleId,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Decode the refresh token to obtain its expiry time.
  const refreshPayload = verifyToken(refreshToken);

  const expiresAt = new Date(
    (refreshPayload.exp ?? Math.floor(Date.now() / 1000)) * 1000,
  );

  // Store only the hash of the refresh token.
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;

  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AppError(
      'Invalid or expired refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  if (payload.type !== 'refresh') {
    throw new AppError(
      'Invalid refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (
    !storedToken ||
    storedToken.revokedAt !== null ||
    storedToken.expiresAt <= new Date()
  ) {
    throw new AppError(
      'Invalid or expired refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(
      'User account is inactive or not found',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    roleId: user.roleId,
    email: user.email,
  });

  return {
    accessToken,
  };
}
export async function logout(refreshToken: string) {
  let payload;

  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AppError(
      'Invalid or expired refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  if (payload.type !== 'refresh') {
    throw new AppError(
      'Invalid refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!storedToken || storedToken.revokedAt !== null) {
    throw new AppError(
      'Invalid or already revoked refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return {
    message: 'Logged out successfully',
  };
}