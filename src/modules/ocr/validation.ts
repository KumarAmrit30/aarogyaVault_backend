import { z } from 'zod';

/**
 * Schema for triggering OCR extraction
 */
export const triggerOCRSchema = z.object({
  record_id: z.string().uuid('Invalid record ID format'),
});

/**
 * Schema for getting extraction by record ID (URL param)
 */
export const recordIdParamSchema = z.object({
  record_id: z.string().uuid('Invalid record ID format'),
});
