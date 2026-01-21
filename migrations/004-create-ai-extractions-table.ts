import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('ai_extractions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    record_id: {
      type: 'uuid',
      notNull: true,
      references: 'records(id)',
      onDelete: 'CASCADE',
      unique: true, // One extraction per record
    },
    extracted_data: {
      type: 'jsonb',
      notNull: true,
    },
    confidence_score: {
      type: 'decimal(5,4)',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('ai_extractions', 'record_id', {
    name: 'idx_ai_extractions_record_id',
    unique: true,
  });

  // GIN index for JSONB queries on extracted_data
  pgm.createIndex('ai_extractions', 'extracted_data', {
    name: 'idx_ai_extractions_data',
    method: 'gin',
  });

  // CHECK constraint for confidence_score (0-1)
  pgm.addConstraint('ai_extractions', 'chk_ai_extractions_confidence', {
    check: 'confidence_score >= 0 AND confidence_score <= 1',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('ai_extractions', { ifExists: true });
}
