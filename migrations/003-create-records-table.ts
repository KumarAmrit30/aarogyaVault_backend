import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('records', {
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
    record_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    file_url: {
      type: 'text',
      notNull: true,
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    record_date: {
      type: 'date',
      notNull: true,
    },
    source: {
      type: 'varchar(255)',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'uploaded',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('records', 'user_id', {
    name: 'idx_records_user_id',
  });

  pgm.createIndex('records', 'record_date', {
    name: 'idx_records_record_date',
  });

  pgm.createIndex('records', 'status', {
    name: 'idx_records_status',
  });

  // Composite index for timeline queries (user_id + record_date DESC)
  pgm.sql('CREATE INDEX idx_records_user_date ON records (user_id, record_date DESC)');

  // CHECK constraint for status values
  pgm.addConstraint('records', 'chk_records_status', {
    check: "status IN ('uploaded', 'ai_extracted', 'verified')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('records', { ifExists: true });
}
