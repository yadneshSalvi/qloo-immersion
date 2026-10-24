import { Pool, type PoolClient } from 'pg';

const globalDb = globalThis as unknown as { immersionPool?: Pool };
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required. Follow the README to configure PostgreSQL.');
  if (!globalDb.immersionPool)
    globalDb.immersionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  return globalDb.immersionPool;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function closeDatabase() {
  await globalDb.immersionPool?.end();
  globalDb.immersionPool = undefined;
}
