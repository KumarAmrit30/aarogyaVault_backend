import { z } from 'zod';

/**
 * Indian mobile number validation
 * Format: 10 digits, starting with 6-9
 */
const mobileNumberSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

/**
 * OTP validation
 * Format: 6 digits
 */
const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP must be 6 digits');

/**
 * Send OTP request validation
 */
export const sendOtpSchema = z.object({
  mobile_number: mobileNumberSchema,
});

/**
 * Verify OTP request validation
 */
export const verifyOtpSchema = z.object({
  mobile_number: mobileNumberSchema,
  otp: otpSchema,
});

// Type exports for use in routes
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
