import { Request, Response } from 'express';
import { ApiResponse, HealthCheckResponse } from '../types/index.js';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

export const getHealth = async (_req: Request, res: Response<ApiResponse<HealthCheckResponse>>): Promise<void> => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';

  const data: HealthCheckResponse = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'FlowFactory API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: dbStatus,
  };

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data,
  });
};

