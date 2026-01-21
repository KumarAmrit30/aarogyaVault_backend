import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop old constraint
  pgm.dropConstraint('audit_logs', 'chk_audit_logs_action_type', { ifExists: true });
  
  // Add updated constraint with new action types
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
      'consent_access_failed',
      'consent_revoked',
      'consent_expired',
      'external_access'
    )`,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert to original constraint
  pgm.dropConstraint('audit_logs', 'chk_audit_logs_action_type', { ifExists: true });
  
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
}
