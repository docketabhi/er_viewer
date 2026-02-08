/**
 * Drizzle ORM Client Initialization
 *
 * Initializes the Drizzle ORM client with the postgres.js driver.
 * Uses environment variables for database configuration.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database connection URL from environment variables
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/er_viewer';

// Create the postgres.js connection
// In production, you may want to configure connection pooling
const queryClient = postgres(DATABASE_URL, {
  // Connection pool configuration
  max: 10, // Maximum connections in the pool
  idle_timeout: 20, // Close connections after 20 seconds of inactivity
  connect_timeout: 10, // Connection timeout in seconds

  // Transform options
  transform: {
    undefined: null, // Transform undefined to null
  },
});

// Create the Drizzle ORM client with schema for type-safe queries
export const db = drizzle(queryClient, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Export the query client for advanced use cases or cleanup
export { queryClient };

// Export all schema definitions for convenience
export * from './schema';

// Type export for the database instance
export type Database = typeof db;
