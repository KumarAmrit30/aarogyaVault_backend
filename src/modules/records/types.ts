import { Record, RecordStatus } from '../../shared/types';

/**
 * Supported record types
 */
export type RecordType =
  | 'lab_report'
  | 'prescription'
  | 'discharge_summary'
  | 'xray'
  | 'mri'
  | 'ct_scan'
  | 'ultrasound'
  | 'ecg'
  | 'vaccination'
  | 'other';

/**
 * Upload Record Request (metadata)
 */
export interface UploadRecordRequest {
  record_type: RecordType;
  record_date: string; // ISO date string
  source: string; // Hospital/clinic name
}

/**
 * Upload Record Response
 */
export interface UploadRecordResponse {
  success: boolean;
  message: string;
  record?: Record;
}

/**
 * Get Record Response
 */
export interface GetRecordResponse {
  success: boolean;
  record?: Record;
  message?: string;
}

/**
 * List Records Response (Timeline)
 */
export interface ListRecordsResponse {
  success: boolean;
  records: Record[];
  total: number;
  page: number;
  limit: number;
}

/**
 * List Records Query Parameters
 */
export interface ListRecordsQuery {
  page?: number;
  limit?: number;
  record_type?: RecordType;
  status?: RecordStatus;
  from_date?: string;
  to_date?: string;
}

/**
 * File upload result from storage
 */
export interface FileUploadResult {
  success: boolean;
  file_url?: string;
  file_name?: string;
  error?: string;
}

/**
 * Allowed file types for medical records
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
