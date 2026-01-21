/**
 * Audit Action Types
 * Types of actions that can be logged
 */
export type AuditActionType =
  | 'user_created'
  | 'user_login'
  | 'abha_linked'
  | 'record_uploaded'
  | 'record_viewed'
  | 'record_verified'
  | 'consent_created'
  | 'consent_accessed'
  | 'consent_access_failed'
  | 'consent_revoked'
  | 'consent_expired'
  | 'external_access';

/**
 * Resource Types
 * Types of resources that actions can be performed on
 */
export type ResourceType =
  | 'user'
  | 'abha_link'
  | 'record'
  | 'consent'
  | 'ai_extraction';

/**
 * Audit Log Entity
 * Immutable log of all system actions for compliance and security
 */
export interface AuditLog {
  id: string;
  user_id: string | null; // null for anonymous/external access
  action_type: AuditActionType;
  resource_type: ResourceType;
  resource_id: string | null; // null if action doesn't target a specific resource
  metadata: Record<string, unknown>; // Additional context as JSON
  ip_address: string | null;
  created_at: Date;
}

/**
 * Audit Log creation input
 */
export interface CreateAuditLogInput {
  user_id: string | null;
  action_type: AuditActionType;
  resource_type: ResourceType;
  resource_id: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
}
