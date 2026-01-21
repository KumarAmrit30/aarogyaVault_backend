import { Consent, Record } from '../../shared/types';

/**
 * Consent status enum
 */
export type ConsentStatus = 'active' | 'expired' | 'revoked';

/**
 * Request to create a new consent
 */
export interface CreateConsentRequest {
  record_ids: string[]; // UUIDs of records to share
  purpose: string; // Purpose of sharing (e.g., "Doctor consultation")
  duration_hours: number; // How long the consent is valid (in hours)
  access_pin?: string; // Optional 4-6 digit PIN for extra security
}

/**
 * Response after creating consent
 */
export interface CreateConsentResponse {
  success: boolean;
  message: string;
  consent?: {
    id: string;
    share_url: string; // URL that can be shared with doctor
    share_token: string;
    expires_at: string;
    purpose: string;
    record_count: number;
    access_pin_required: boolean;
  };
}

/**
 * Request to access shared records via consent
 */
export interface AccessConsentRequest {
  share_token: string;
  access_pin?: string; // Required if consent has PIN protection
}

/**
 * Response when accessing shared records
 */
export interface AccessConsentResponse {
  success: boolean;
  message?: string;
  requires_pin?: boolean;
  consent?: {
    id: string;
    purpose: string;
    expires_at: string;
    created_at: string;
    records: ConsentRecordDetail[];
  };
}

/**
 * Detail of a record in consent response
 */
export interface ConsentRecordDetail {
  id: string;
  record_type: string;
  file_name: string;
  record_date: string;
  source: string;
  file_url: string;
  ai_extraction?: {
    extracted_data: Record<string, unknown>;
    confidence_score: number;
    is_ai_assisted: true;
  };
}

/**
 * Request to revoke a consent
 */
export interface RevokeConsentRequest {
  consent_id: string;
}

/**
 * Response after revoking consent
 */
export interface RevokeConsentResponse {
  success: boolean;
  message: string;
}

/**
 * List consents response
 */
export interface ListConsentsResponse {
  success: boolean;
  consents: ConsentListItem[];
  total: number;
}

/**
 * Individual consent in list
 */
export interface ConsentListItem {
  id: string;
  purpose: string;
  share_token: string;
  expires_at: string;
  created_at: string;
  status: ConsentStatus;
  record_count: number;
  access_pin_required: boolean;
}

/**
 * Internal consent with PIN (not exposed to API)
 */
export interface ConsentWithPin extends Consent {
  access_pin_hash?: string | null;
  status: ConsentStatus;
}
