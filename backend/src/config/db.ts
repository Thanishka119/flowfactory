import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Extend global namespace for development hot-reloading if needed
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (env.NODE_ENV === 'development') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('📦 PostgreSQL Database connected successfully via Prisma');
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('📦 PostgreSQL Database disconnected successfully');
  } catch (error) {
    logger.error('❌ Error disconnecting from PostgreSQL database:', error);
  }
}
