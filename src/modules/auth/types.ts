import { User } from '../../shared/types';

/**
 * OTP Request - Send OTP to mobile number
 */
export interface SendOtpRequest {
  mobile_number: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  // In development, we return the OTP for testing
  otp?: string;
}

/**
 * OTP Verification - Verify OTP and get JWT
 */
export interface VerifyOtpRequest {
  mobile_number: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

/**
 * JWT Payload - Data encoded in JWT token
 */
export interface JwtPayload {
  user_id: string;
  mobile_number: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated Request - Express request with user info
 */
export interface AuthenticatedUser {
  id: string;
  mobile_number: string;
}

/**
 * OTP Store Entry - For mock OTP storage
 */
export interface OtpEntry {
  otp: string;
  expires_at: Date;
  attempts: number;
}
