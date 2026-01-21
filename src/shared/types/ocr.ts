/**
 * AI Extraction Entity
 * Represents OCR/AI-extracted data from a medical record
 * This is non-authoritative and always labeled as AI-assisted
 */
export interface AIExtraction {
  id: string;
  record_id: string;
  extracted_data: Record<string, unknown>; // JSON object with extracted fields
  confidence_score: number; // 0-1 confidence score
  created_at: Date;
}

/**
 * AI Extraction creation input
 */
export interface CreateAIExtractionInput {
  record_id: string;
  extracted_data: Record<string, unknown>;
  confidence_score: number;
}
