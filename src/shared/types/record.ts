/**
 * Record Status
 * Represents the processing state of a medical record
 */
export type RecordStatus = 'uploaded' | 'ai_extracted' | 'verified';

/**
 * Record Entity
 * Represents a medical record uploaded by a user
 */
export interface Record {
  id: string;
  user_id: string;
  record_type: string;
  file_url: string;
  file_name: string;
  record_date: Date;
  source: string;
  status: RecordStatus;
  created_at: Date;
}

/**
 * Record creation input
 */
export interface CreateRecordInput {
  user_id: string;
  record_type: string;
  file_url: string;
  file_name: string;
  record_date: Date;
  source: string;
}
