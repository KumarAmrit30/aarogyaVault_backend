import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('consent_records', {
    consent_id: {
      type: 'uuid',
      notNull: true,
      references: 'consents(id)',
      onDelete: 'CASCADE',
    },
    record_id: {
      type: 'uuid',
      notNull: true,
      references: 'records(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Composite primary key to prevent duplicates
  pgm.addConstraint('consent_records', 'pk_consent_records', {
    primaryKey: ['consent_id', 'record_id'],
  });

  // Indexes
  pgm.createIndex('consent_records', 'consent_id', {
    name: 'idx_consent_records_consent_id',
  });

  pgm.createIndex('consent_records', 'record_id', {
    name: 'idx_consent_records_record_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('consent_records', { ifExists: true });
}
