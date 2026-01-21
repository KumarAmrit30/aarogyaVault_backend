import jwt from 'jsonwebtoken';
import { pool } from '../../shared/database/connection';
import { jwtConfig, config } from '../../shared/config';
import { User } from '../../shared/types';
import { JwtPayload, OtpEntry, AuthenticatedUser } from './types';

/**
 * In-memory OTP store for development/MVP
 * In production, use Redis or similar
 */
const otpStore = new Map<string, OtpEntry>();

// OTP configuration
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

/**
 * Generate a 6-digit OTP
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to mobile number (mock implementation)
 * In production, integrate with SMS gateway
 */
export async function sendOtp(mobileNumber: string): Promise<{ success: boolean; otp?: string }> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP
  otpStore.set(mobileNumber, {
    otp,
    expires_at: expiresAt,
    attempts: 0,
  });

  // In development, return OTP for testing
  // In production, send via SMS and don't return OTP
  if (config.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${mobileNumber}: ${otp}`);
    return { success: true, otp };
  }

  // TODO: Integrate SMS gateway for production
  // await smsGateway.send(mobileNumber, `Your AarogyaVault OTP is: ${otp}`);

  return { success: true };
}

/**
 * Verify OTP for a mobile number
 */
export async function verifyOtp(
  mobileNumber: string,
  otp: string
): Promise<{ valid: boolean; message: string }> {
  const entry = otpStore.get(mobileNumber);

  if (!entry) {
    return { valid: false, message: 'OTP not found. Please request a new OTP.' };
  }

  // Check expiry
  if (new Date() > entry.expires_at) {
    otpStore.delete(mobileNumber);
    return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
  }

  // Check attempts
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(mobileNumber);
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  // Verify OTP
  if (entry.otp !== otp) {
    entry.attempts += 1;
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP is valid, remove from store
  otpStore.delete(mobileNumber);
  return { valid: true, message: 'OTP verified successfully.' };
}

/**
 * Find or create user by mobile number (idempotent)
 */
export async function findOrCreateUser(mobileNumber: string): Promise<{ user: User; isNew: boolean }> {
  // Try to find existing user
  const findResult = await pool.query<User>(
    'SELECT id, mobile_number, created_at, updated_at FROM users WHERE mobile_number = $1',
    [mobileNumber]
  );

  if (findResult.rows.length > 0) {
    return { user: findResult.rows[0], isNew: false };
  }

  // Create new user
  const createResult = await pool.query<User>(
    `INSERT INTO users (mobile_number) 
     VALUES ($1) 
     RETURNING id, mobile_number, created_at, updated_at`,
    [mobileNumber]
  );

  return { user: createResult.rows[0], isNew: true };
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    user_id: user.id,
    mobile_number: user.mobile_number,
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiry as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT id, mobile_number, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Extract authenticated user from JWT payload
 */
export function extractAuthenticatedUser(payload: JwtPayload): AuthenticatedUser {
  return {
    id: payload.user_id,
    mobile_number: payload.mobile_number,
  };
}
