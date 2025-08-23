import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'messenger-mvp-auth'
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
        )
      )
    })
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true
  }));
}

// Create logger with additional metadata
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Export default logger
export default logger;

// Structured logging functions
export const logAuthAttempt = (data: {
  email?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  method: 'google' | 'refresh';
  error?: string;
}) => {
  const level = data.success ? 'info' : 'warn';
  logger.log(level, 'Authentication attempt', {
    ...data,
    event: 'auth_attempt'
  });
};

export const logTokenGeneration = (data: {
  userId: string;
  email: string;
  ipAddress: string;
  deviceInfo?: any;
}) => {
  logger.info('Token pair generated', {
    ...data,
    event: 'token_generated'
  });
};

export const logTokenRefresh = (data: {
  userId: string;
  ipAddress: string;
  success: boolean;
  error?: string;
}) => {
  const level = data.success ? 'info' : 'warn';
  logger.log(level, 'Token refresh attempt', {
    ...data,
    event: 'token_refresh'
  });
};

export const logUserAction = (data: {
  userId: string;
  action: 'login' | 'logout' | 'logout_all' | 'deactivate' | 'profile_view';
  ipAddress: string;
  userAgent?: string;
  metadata?: any;
}) => {
  logger.info('User action', {
    ...data,
    event: 'user_action'
  });
};

export const logRateLimit = (data: {
  ipAddress: string;
  email?: string;
  attempts: number;
  blocked: boolean;
  blockedUntil?: Date;
}) => {
  logger.warn('Rate limit triggered', {
    ...data,
    event: 'rate_limit'
  });
};

export const logDatabaseOperation = (data: {
  operation: string;
  table: string;
  duration?: number;
  success: boolean;
  error?: string;
}) => {
  const level = data.success ? 'debug' : 'error';
  logger.log(level, 'Database operation', {
    ...data,
    event: 'db_operation'
  });
};

export const logApiRequest = (data: {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
}) => {
  logger.http('API request', {
    ...data,
    event: 'api_request'
  });
};