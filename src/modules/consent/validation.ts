import { z } from 'zod';

/**
 * Schema for creating a new consent
 */
export const createConsentSchema = z.object({
  record_ids: z
    .array(z.string().uuid('Each record_id must be a valid UUID'))
    .min(1, 'At least one record must be selected')
    .max(50, 'Maximum 50 records per consent'),
  purpose: z
    .string()
    .min(3, 'Purpose must be at least 3 characters')
    .max(500, 'Purpose must not exceed 500 characters'),
  duration_hours: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 hour')
    .max(720, 'Duration cannot exceed 30 days (720 hours)'),
  access_pin: z
    .string()
    .regex(/^\d{4,6}$/, 'Access PIN must be 4-6 digits')
    .optional(),
});

/**
 * Schema for accessing shared records via consent
 */
export const accessConsentSchema = z.object({
  access_pin: z
    .string()
    .regex(/^\d{4,6}$/, 'Access PIN must be 4-6 digits')
    .optional(),
});

/**
 * Schema for revoking a consent
 */
export const revokeConsentSchema = z.object({
  consent_id: z.string().uuid('Invalid consent ID format'),
});

/**
 * Schema for listing consents (query params)
 */
export const listConsentsQuerySchema = z.object({
  status: z.enum(['active', 'expired', 'revoked', 'all']).optional().default('all'),
  page: z.string().optional().transform((val) => parseInt(val || '1', 10)),
  limit: z.string().optional().transform((val) => Math.min(parseInt(val || '20', 10), 100)),
});
