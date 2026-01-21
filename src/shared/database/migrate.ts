import { dbConfig } from '../config';

// Migration configuration for node-pg-migrate
export const migrationConfig = {
  databaseUrl: `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  direction: 'up' as const,
  count: Infinity,
  dryRun: false,
  createSchema: true,
  createMigrationsSchema: true,
  schema: 'public',
};
