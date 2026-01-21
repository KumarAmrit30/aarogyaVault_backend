/**
 * Consent Entity
 * Represents a time-bound consent for sharing medical records
 */
export interface Consent {
  id: string;
  user_id: string;
  purpose: string;
  expires_at: Date;
  share_token: string; // Secure token for share link
  created_at: Date;
}

/**
 * Consent Record Junction
 * Links a consent to specific records being shared
 */
export interface ConsentRecord {
  consent_id: string;
  record_id: string;
}

/**
 * Consent creation input
 */
export interface CreateConsentInput {
  user_id: string;
  purpose: string;
  expires_at: Date;
  share_token: string;
}

/**
 * Consent with records (for API responses)
 */
export interface ConsentWithRecords extends Consent {
  records: string[]; // Array of record IDs
}
