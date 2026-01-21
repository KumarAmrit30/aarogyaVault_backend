import { z } from 'zod';

/**
 * Valid action types for filtering
 */
const actionTypes = z.enum([
  'user_created',
  'user_login',
  'abha_linked',
  'record_uploaded',
  'record_viewed',
  'record_verified',
  'consent_created',
  'consent_accessed',
  'consent_access_failed',
  'consent_revoked',
  'consent_expired',
  'external_access',
]);

/**
 * Valid resource types for filtering
 */
const resourceTypes = z.enum([
  'user',
  'abha_link',
  'record',
  'consent',
  'ai_extraction',
]);

/**
 * Schema for listing audit logs query parameters
 */
export const listAuditLogsQuerySchema = z.object({
  page: z.string().optional().transform((val) => parseInt(val || '1', 10)),
  limit: z.string().optional().transform((val) => Math.min(parseInt(val || '50', 10), 100)),
  action_type: actionTypes.optional(),
  resource_type: resourceTypes.optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
}).refine((data) => {
  if (data.from_date && data.to_date) {
    return new Date(data.from_date) <= new Date(data.to_date);
  }
  return true;
}, {
  message: 'from_date must be before or equal to to_date',
});
