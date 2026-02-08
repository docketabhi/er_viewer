/**
 * Drizzle Kit Configuration
 *
 * Configuration for Drizzle Kit CLI tools:
 * - npx drizzle-kit generate: Generate migrations from schema changes
 * - npx drizzle-kit migrate: Apply migrations to the database
 * - npx drizzle-kit push: Push schema directly (dev only)
 * - npx drizzle-kit studio: Open Drizzle Studio for database inspection
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Schema location
  schema: './src/db/schema.ts',

  // Output directory for migrations
  out: './src/db/migrations',

  // Database driver
  dialect: 'postgresql',

  // Database connection
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/er_viewer',
  },

  // Verbose logging during migrations
  verbose: true,

  // Strict mode - fail on warnings
  strict: true,

  // Table filters (optional - include all tables by default)
  // tablesFilter: ['diagrams', 'diagram_versions', 'diagram_blocks'],
});
