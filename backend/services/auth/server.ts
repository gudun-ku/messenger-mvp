import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config, getCorsConfig } from '../../shared/config/env';
import { apiRateLimiter } from '../../shared/middleware/rateLimiter';
import { requestLogger } from '../../shared/middleware/logging';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { runMigrations, healthCheck } from '../../shared/database/connection';
import authRoutes from './auth.routes';
import logger, { createLogger } from '../../shared/utils/logger';

const app = express();
const authLogger = createLogger('auth-service');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors(getCorsConfig()));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// Rate limiting
app.use(apiRateLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    
    if (!dbHealthy) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'healthy',
      service: 'auth-service',
      version: '1.0.0',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    authLogger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      statusCode: 404
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Try to run database migrations, but don't fail if DB is not ready
    authLogger.info('Running database migrations...');
    try {
      await runMigrations();
      authLogger.info('Database migrations completed');
    } catch (dbError) {
      authLogger.warn('Database not ready yet, starting without migrations', { 
        error: dbError instanceof Error ? dbError.message : String(dbError) 
      });
    }

    // Start server
    const port = config.AUTH_PORT;
    const server = app.listen(port, () => {
      authLogger.info(`Auth service started on port ${port}`, {
        port,
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      authLogger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close(() => {
        authLogger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        authLogger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    authLogger.error('Failed to start auth service', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
};

// Start the server
startServer();