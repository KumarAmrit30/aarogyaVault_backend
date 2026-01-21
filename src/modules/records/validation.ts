import { z } from 'zod';

/**
 * Record type validation
 */
const recordTypeSchema = z.enum([
  'lab_report',
  'prescription',
  'discharge_summary',
  'xray',
  'mri',
  'ct_scan',
  'ultrasound',
  'ecg',
  'vaccination',
  'other',
]);

/**
 * Record status validation
 */
const recordStatusSchema = z.enum(['uploaded', 'ai_extracted', 'verified']);

/**
 * Date string validation (ISO format or YYYY-MM-DD)
 */
const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
);

/**
 * Upload record metadata validation
 */
export const uploadRecordSchema = z.object({
  record_type: recordTypeSchema,
  record_date: dateStringSchema,
  source: z.string().min(1, 'Source is required').max(255),
});

/**
 * List records query validation
 */
export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  record_type: recordTypeSchema.optional(),
  status: recordStatusSchema.optional(),
  from_date: dateStringSchema.optional(),
  to_date: dateStringSchema.optional(),
});

/**
 * Record ID validation (UUID)
 */
export const recordIdSchema = z.string().uuid('Invalid record ID');

// Type exports
export type UploadRecordInput = z.infer<typeof uploadRecordSchema>;
export type ListRecordsQueryInput = z.infer<typeof listRecordsQuerySchema>;
