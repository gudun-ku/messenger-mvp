import { Pool, PoolClient } from 'pg';
import { createHash } from 'crypto';

// Ensure SSL is properly configured for production
const getConnectionString = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // URL-encode any special characters in the connection string
  let connectionString = baseUrl;
  
  // Fix password encoding if it contains special characters
  const match = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    const [, username, password, hostAndDb] = match;
    const encodedPassword = encodeURIComponent(password);
    connectionString = `postgresql://${username}:${encodedPassword}@${hostAndDb}`;
  }
  
  // Add SSL mode for production if not already present
  if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=')) {
    return `${connectionString}?sslmode=require`;
  }
  
  return connectionString;
};

const pool = new Pool({
  connectionString: getConnectionString(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = (): Promise<PoolClient> => pool.connect();

export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Health check for database
export const healthCheck = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
};

// Migration runner
export const runMigrations = async (): Promise<void> => {
  const fs = require('fs');
  const path = require('path');
  
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }

  // Create migrations table if it doesn't exist
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((file: string) => file.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    const version = file.replace('.sql', '');
    
    // Check if migration already executed
    const result = await query(
      'SELECT id FROM migrations WHERE version = $1',
      [version]
    );
    
    if (result.rows.length > 0) {
      console.log(`Migration ${version} already executed, skipping`);
      continue;
    }
    
    console.log(`Running migration ${version}...`);
    
    const migrationSQL = fs.readFileSync(
      path.join(migrationsDir, file),
      'utf8'
    );
    
    try {
      await query(migrationSQL);
      
      // Record migration as executed
      await query(
        'INSERT INTO migrations (version, name) VALUES ($1, $2)',
        [version, version.replace(/^\d+_/, '')]
      );
      
      console.log(`Migration ${version} completed successfully`);
    } catch (error) {
      console.error(`Migration ${version} failed:`, error);
      throw error;
    }
  }
};

// Utility function to hash tokens for storage
export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  await pool.end();
};

process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);