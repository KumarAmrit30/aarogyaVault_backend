import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    action_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    resource_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    resource_id: {
      type: 'uuid',
    },
    metadata: {
      type: 'jsonb',
    },
    ip_address: {
      type: 'inet',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('audit_logs', 'user_id', {
    name: 'idx_audit_logs_user_id',
  });

  pgm.createIndex('audit_logs', 'action_type', {
    name: 'idx_audit_logs_action_type',
  });

  // Composite index for resource lookups
  pgm.createIndex('audit_logs', ['resource_type', 'resource_id'], {
    name: 'idx_audit_logs_resource',
  });

  // Index for chronological queries
  pgm.sql('CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC)');

  // Composite index for user timeline queries
  pgm.sql('CREATE INDEX idx_audit_logs_user_date ON audit_logs (user_id, created_at DESC)');

  // CHECK constraints for action_type and resource_type
  pgm.addConstraint('audit_logs', 'chk_audit_logs_action_type', {
    check: `action_type IN (
      'user_created',
      'user_login',
      'abha_linked',
      'record_uploaded',
      'record_viewed',
      'record_verified',
      'consent_created',
      'consent_accessed',
      'consent_expired',
      'external_access'
    )`,
  });

  pgm.addConstraint('audit_logs', 'chk_audit_logs_resource_type', {
    check: `resource_type IN (
      'user',
      'abha_link',
      'record',
      'consent',
      'ai_extraction'
    )`,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('audit_logs', { ifExists: true });
}
