import { AIExtraction } from '../../shared/types';

/**
 * Request to trigger OCR extraction for a record
 */
export interface TriggerOCRRequest {
  record_id: string;
}

/**
 * Response from OCR extraction
 */
export interface OCRExtractionResponse {
  success: boolean;
  message: string;
  extraction?: AIExtraction;
  is_ai_assisted: true; // Always labeled as AI-assisted
}

/**
 * Extracted medical data structure (mock)
 * In a real implementation, this would be returned by the AI/OCR service
 * The index signature allows compatibility with Record<string, unknown>
 */
export interface ExtractedMedicalData {
  [key: string]: unknown;
  document_type?: string;
  patient_name?: string;
  date_of_report?: string;
  hospital_name?: string;
  doctor_name?: string;
  diagnosis?: string[];
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  lab_results?: Array<{
    test_name: string;
    value: string;
    unit?: string;
    reference_range?: string;
  }>;
  vitals?: {
    blood_pressure?: string;
    pulse?: string;
    temperature?: string;
    weight?: string;
    height?: string;
  };
  notes?: string;
  raw_text?: string; // Raw OCR text for reference
}

/**
 * Get extraction response
 */
export interface GetExtractionResponse {
  success: boolean;
  extraction?: AIExtraction & { is_ai_assisted: true };
  message?: string;
}
