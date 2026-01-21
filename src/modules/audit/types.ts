import { AuditActionType, ResourceType } from '../../shared/types';

/**
 * Query parameters for listing audit logs
 */
export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  action_type?: AuditActionType;
  resource_type?: ResourceType;
  from_date?: string; // ISO date string
  to_date?: string;   // ISO date string
}

/**
 * Response for listing audit logs
 */
export interface ListAuditLogsResponse {
  success: boolean;
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Individual audit log item with readable format
 */
export interface AuditLogItem {
  id: string;
  action_type: AuditActionType;
  action_description: string; // Human-readable description
  resource_type: ResourceType;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

/**
 * Response for getting audit stats
 */
export interface AuditStatsResponse {
  success: boolean;
  stats: {
    total_actions: number;
    actions_by_type: Record<AuditActionType, number>;
    recent_actions: AuditLogItem[];
    last_login?: string;
    records_uploaded: number;
    consents_created: number;
  };
}

/**
 * Map action types to human-readable descriptions
 */
export const ACTION_DESCRIPTIONS: Record<AuditActionType, string> = {
  user_created: 'Account created',
  user_login: 'Logged in',
  abha_linked: 'ABHA number linked',
  record_uploaded: 'Medical record uploaded',
  record_viewed: 'Medical record viewed',
  record_verified: 'Medical record verified',
  consent_created: 'Sharing consent created',
  consent_accessed: 'Shared records accessed',
  consent_access_failed: 'Failed consent access attempt',
  consent_revoked: 'Sharing consent revoked',
  consent_expired: 'Sharing consent expired',
  external_access: 'External access to records',
};
