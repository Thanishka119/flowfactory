import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

const app = createApp();

const startServer = async () => {
  try {
    await connectDatabase();
  } catch {
    logger.warn('⚠️ Server starting, but database connection could not be established immediately.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 FlowFactory Backend running on http://localhost:${env.PORT}`);
    logger.info(`🩺 Health check available at http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forceful shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer();

