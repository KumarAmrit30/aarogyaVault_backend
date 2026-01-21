import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('consents', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    purpose: {
      type: 'text',
      notNull: true,
    },
    expires_at: {
      type: 'timestamp',
      notNull: true,
    },
    share_token: {
      type: 'varchar(64)',
      notNull: true,
      unique: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('consents', 'user_id', {
    name: 'idx_consents_user_id',
  });

  pgm.createIndex('consents', 'share_token', {
    name: 'idx_consents_share_token',
    unique: true,
  });

  pgm.createIndex('consents', 'expires_at', {
    name: 'idx_consents_expires_at',
  });

  // CHECK constraint: expires_at must be after created_at
  pgm.addConstraint('consents', 'chk_consents_expiry', {
    check: 'expires_at > created_at',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('consents', { ifExists: true });
}
