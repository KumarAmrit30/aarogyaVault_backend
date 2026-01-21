import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('abha_links', {
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
    abha_number: {
      type: 'varchar(20)',
      notNull: true,
      unique: true,
    },
    linked_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
    },
  });

  // Indexes
  pgm.createIndex('abha_links', 'user_id', {
    name: 'idx_abha_links_user_id',
  });

  pgm.createIndex('abha_links', 'abha_number', {
    name: 'idx_abha_links_abha_number',
    unique: true,
  });

  // CHECK constraint for status values
  pgm.addConstraint('abha_links', 'chk_abha_links_status', {
    check: "status IN ('pending', 'linked', 'failed')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('abha_links', { ifExists: true });
}
