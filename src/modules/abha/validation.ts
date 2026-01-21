import { z } from 'zod';

/**
 * ABHA Number validation
 * Format: 14 digits (XXXX-XXXX-XXXX-XX) or health ID (username@abdm)
 * For MVP, we accept both formats
 */
const abhaNumberSchema = z
  .string()
  .refine(
    (val) => {
      // Remove hyphens for digit check
      const digitsOnly = val.replace(/-/g, '');
      // Accept 14-digit ABHA number
      if (/^\d{14}$/.test(digitsOnly)) return true;
      // Accept health ID format (username@abdm or similar)
      if (/^[a-zA-Z0-9._]+@[a-zA-Z]+$/.test(val)) return true;
      return false;
    },
    { message: 'Invalid ABHA number format. Use 14-digit number (XXXX-XXXX-XXXX-XX) or health ID (username@abdm)' }
  );

/**
 * Link ID validation (UUID)
 */
const linkIdSchema = z.string().uuid('Invalid link ID format');

/**
 * OTP validation (6 digits)
 */
const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

/**
 * Initiate ABHA Link request validation
 */
export const initiateLinkSchema = z.object({
  abha_number: abhaNumberSchema,
});

/**
 * Verify ABHA Link request validation
 */
export const verifyLinkSchema = z.object({
  link_id: linkIdSchema,
  otp: otpSchema,
});

// Type exports
export type InitiateLinkInput = z.infer<typeof initiateLinkSchema>;
export type VerifyLinkInput = z.infer<typeof verifyLinkSchema>;
