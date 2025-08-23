import { z } from 'zod';

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // Redis
  REDIS_URL: z.string().url('Invalid Redis URL'),
  
  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  
  // Ports
  AUTH_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3001'),
  SIGNALING_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3002'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  
  // Rate Limiting
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number().positive()).default('5'),
  API_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  API_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  
  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  
  // Health Check
  HEALTH_CHECK_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('5000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate and export environment configuration
export const validateEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
};

// Export validated config
export const config = validateEnv();

// Helper functions
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';
export const isTest = () => config.NODE_ENV === 'test';

// Database helpers
export const getDatabaseConfig = () => ({
  connectionString: config.DATABASE_URL,
  ssl: isProduction() ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis helpers
export const getRedisConfig = () => ({
  url: config.REDIS_URL,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// CORS helpers
export const getCorsConfig = () => ({
  origin: config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
  credentials: true,
  optionsSuccessStatus: 200,
});

// Rate limiting helpers
export const getAuthRateLimitConfig = () => ({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
});

export const getApiRateLimitConfig = () => ({
  windowMs: config.API_RATE_LIMIT_WINDOW_MS,
  max: config.API_RATE_LIMIT_MAX_REQUESTS,
});