import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { ApiResponse } from './types/index.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS setup
  const allowedOrigins = [
  ...env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  'https://flowfactory.onrender.com',
];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new AppError(`Origin ${origin} not allowed by CORS`, 403, 'CORS_ERROR'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request logging
  if (env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root health check / info
  app.get('/', (_req: Request, res: Response<ApiResponse>) => {
    res.status(200).json({
      success: true,
      data: {
        message: 'FlowFactory REST API Server',
        docs: `${env.API_PREFIX}/health`,
      },
    });
  });

  // Mount API v1 Routes
  app.use(env.API_PREFIX, apiRouter);

  // 404 Route Handler
  app.use((req: Request, res: Response<ApiResponse>) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
