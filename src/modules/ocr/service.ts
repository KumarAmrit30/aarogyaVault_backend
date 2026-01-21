import { pool } from '../../shared/database/connection';
import { AIExtraction, CreateAIExtractionInput } from '../../shared/types';
import { ExtractedMedicalData, OCRExtractionResponse, GetExtractionResponse } from './types';
import { updateRecordStatus, getRecordByIdForUser } from '../records/service';

/**
 * Mock OCR extraction function.
 * In a real implementation, this would call an AI/OCR service (e.g., Google Vision, AWS Textract, or custom ML model).
 * For MVP, we generate mock data based on record type.
 */
function mockExtractData(recordType: string, fileName: string): ExtractedMedicalData {
  // Generate mock extracted data based on record type
  const baseData: ExtractedMedicalData = {
    document_type: recordType,
    raw_text: `[Mock OCR Text for ${fileName}]`,
    notes: 'This is AI-extracted data and should be verified by a healthcare professional.',
  };

  switch (recordType.toLowerCase()) {
    case 'prescription':
      return {
        ...baseData,
        document_type: 'Prescription',
        patient_name: 'Patient Name (extracted)',
        date_of_report: new Date().toISOString().split('T')[0],
        doctor_name: 'Dr. Sample Doctor',
        hospital_name: 'Sample Hospital',
        medications: [
          { name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily' },
          { name: 'Vitamin D3', dosage: '60000 IU', frequency: 'Once weekly' },
        ],
        diagnosis: ['Viral fever', 'Vitamin D deficiency'],
      };

    case 'lab_report':
    case 'lab report':
      return {
        ...baseData,
        document_type: 'Laboratory Report',
        patient_name: 'Patient Name (extracted)',
        date_of_report: new Date().toISOString().split('T')[0],
        hospital_name: 'Sample Diagnostics Lab',
        lab_results: [
          { test_name: 'Hemoglobin', value: '14.2', unit: 'g/dL', reference_range: '13.5-17.5' },
          { test_name: 'WBC Count', value: '7500', unit: '/μL', reference_range: '4000-11000' },
          { test_name: 'Platelet Count', value: '250000', unit: '/μL', reference_range: '150000-400000' },
          { test_name: 'Blood Sugar (Fasting)', value: '98', unit: 'mg/dL', reference_range: '70-100' },
        ],
      };

    case 'discharge_summary':
    case 'discharge summary':
      return {
        ...baseData,
        document_type: 'Discharge Summary',
        patient_name: 'Patient Name (extracted)',
        date_of_report: new Date().toISOString().split('T')[0],
        hospital_name: 'Sample Hospital',
        doctor_name: 'Dr. Attending Physician',
        diagnosis: ['Acute gastroenteritis', 'Dehydration'],
        medications: [
          { name: 'ORS', dosage: 'As needed', frequency: 'After each loose stool' },
          { name: 'Probiotics', dosage: '1 capsule', frequency: 'Once daily' },
        ],
        vitals: {
          blood_pressure: '120/80 mmHg',
          pulse: '78 bpm',
          temperature: '98.6°F',
        },
      };

    case 'imaging':
    case 'xray':
    case 'x-ray':
    case 'mri':
    case 'ct_scan':
      return {
        ...baseData,
        document_type: 'Imaging Report',
        patient_name: 'Patient Name (extracted)',
        date_of_report: new Date().toISOString().split('T')[0],
        hospital_name: 'Sample Radiology Center',
        doctor_name: 'Dr. Radiologist',
        notes: 'Impression: No significant abnormality detected. This is AI-extracted data and should be verified.',
      };

    case 'vaccination':
    case 'vaccine':
      return {
        ...baseData,
        document_type: 'Vaccination Record',
        patient_name: 'Patient Name (extracted)',
        date_of_report: new Date().toISOString().split('T')[0],
        hospital_name: 'Sample Vaccination Center',
        notes: 'Vaccine administered as per schedule. This is AI-extracted data and should be verified.',
      };

    default:
      return {
        ...baseData,
        document_type: recordType || 'Medical Document',
        patient_name: 'Patient Name (extracted)',
        date_of_report: new Date().toISOString().split('T')[0],
      };
  }
}

/**
 * Generates a mock confidence score based on record type.
 * In a real implementation, this would come from the AI model.
 */
function generateConfidenceScore(): number {
  // Return a random confidence score between 0.75 and 0.95
  return Math.round((0.75 + Math.random() * 0.2) * 10000) / 10000;
}

/**
 * Triggers OCR extraction for a medical record.
 * This is a mock implementation that simulates AI extraction.
 */
export async function triggerOCRExtraction(
  userId: string,
  recordId: string,
  _ipAddress?: string | null
): Promise<OCRExtractionResponse> {
  // First, verify the record exists and belongs to the user
  const record = await getRecordByIdForUser(recordId, userId);

  if (!record) {
    return { success: false, message: 'Record not found or unauthorized', is_ai_assisted: true };
  }

  // Check if extraction already exists
  const existingExtraction = await getExtractionByRecordId(recordId);
  if (existingExtraction) {
    return {
      success: true,
      message: 'Extraction already exists for this record',
      extraction: existingExtraction,
      is_ai_assisted: true,
    };
  }

  // Perform mock OCR extraction
  const extractedData = mockExtractData(record.record_type, record.file_name);
  const confidenceScore = generateConfidenceScore();

  const createInput: CreateAIExtractionInput = {
    record_id: recordId,
    extracted_data: extractedData,
    confidence_score: confidenceScore,
  };

  try {
    const extraction = await createAIExtraction(createInput);

    if (!extraction) {
      return { success: false, message: 'Failed to save extraction', is_ai_assisted: true };
    }

    // Update record status to 'ai_extracted'
    await updateRecordStatus(recordId, 'ai_extracted');

    return {
      success: true,
      message: 'OCR extraction completed successfully',
      extraction,
      is_ai_assisted: true,
    };
  } catch (error) {
    console.error('Error during OCR extraction:', error);
    return { success: false, message: 'OCR extraction failed', is_ai_assisted: true };
  }
}

/**
 * Creates an AI extraction record in the database.
 */
export async function createAIExtraction(input: CreateAIExtractionInput): Promise<AIExtraction | null> {
  try {
    const result = await pool.query<AIExtraction>(
      `INSERT INTO ai_extractions (record_id, extracted_data, confidence_score)
       VALUES ($1, $2, $3)
       RETURNING id, record_id, extracted_data, confidence_score, created_at`,
      [input.record_id, JSON.stringify(input.extracted_data), input.confidence_score]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error creating AI extraction:', error);
    return null;
  }
}

/**
 * Retrieves an AI extraction by record ID.
 */
export async function getExtractionByRecordId(recordId: string): Promise<AIExtraction | null> {
  const result = await pool.query<AIExtraction>(
    `SELECT id, record_id, extracted_data, confidence_score, created_at
     FROM ai_extractions
     WHERE record_id = $1`,
    [recordId]
  );
  return result.rows[0] || null;
}

/**
 * Gets extraction for a record, with user ownership check.
 */
export async function getExtraction(
  userId: string,
  recordId: string,
  _ipAddress?: string | null
): Promise<GetExtractionResponse> {
  // Verify record ownership
  const record = await getRecordByIdForUser(recordId, userId);

  if (!record) {
    return { success: false, message: 'Record not found or unauthorized' };
  }

  const extraction = await getExtractionByRecordId(recordId);

  if (!extraction) {
    return { success: false, message: 'No extraction found for this record' };
  }

  return {
    success: true,
    extraction: { ...extraction, is_ai_assisted: true as const },
  };
}

/**
 * Deletes an AI extraction (for re-extraction scenarios).
 */
export async function deleteExtraction(recordId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM ai_extractions WHERE record_id = $1`,
      [recordId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting extraction:', error);
    return false;
  }
}
