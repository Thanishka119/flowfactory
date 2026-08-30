import { Request, Response } from 'express';
import { ApiResponse, HealthCheckResponse } from '../types/index.js';
import { env } from '../config/env.js';

export const getHealth = (_req: Request, res: Response<ApiResponse<HealthCheckResponse>>): void => {
  const data: HealthCheckResponse = {
    status: 'healthy',
    service: 'FlowFactory API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
  };

  res.status(200).json({
    success: true,
    data,
  });
};
