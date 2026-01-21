import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add access_pin_hash column for PIN protection
  pgm.addColumn('consents', {
    access_pin_hash: {
      type: 'varchar(128)',
      notNull: false,
    },
  });

  // Add status column with default 'active'
  pgm.addColumn('consents', {
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'active'",
    },
  });

  // Create index on status for filtering
  pgm.createIndex('consents', 'status', {
    name: 'idx_consents_status',
  });

  // Add CHECK constraint for valid status values
  pgm.addConstraint('consents', 'chk_consents_status', {
    check: "status IN ('active', 'expired', 'revoked')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('consents', 'chk_consents_status', { ifExists: true });
  pgm.dropIndex('consents', 'status', { name: 'idx_consents_status', ifExists: true });
  pgm.dropColumn('consents', 'status', { ifExists: true });
  pgm.dropColumn('consents', 'access_pin_hash', { ifExists: true });
}
