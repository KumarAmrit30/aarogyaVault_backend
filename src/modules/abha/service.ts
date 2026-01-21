import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../shared/database/connection';
import { config } from '../../shared/config';
import { ABHALink } from '../../shared/types';
import { ABHAVerificationEntry, ABHALinkStatus } from './types';

/**
 * In-memory store for pending ABHA verifications
 * In production, use Redis or similar
 */
const verificationStore = new Map<string, ABHAVerificationEntry>();

// Verification configuration
const VERIFICATION_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Generate a 6-digit OTP
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize ABHA number (remove hyphens, uppercase)
 */
function normalizeAbhaNumber(abhaNumber: string): string {
  return abhaNumber.replace(/-/g, '').toUpperCase();
}

/**
 * Check if user already has a linked ABHA
 */
export async function getUserAbhaLink(userId: string): Promise<ABHALink | null> {
  const result = await pool.query<ABHALink>(
    `SELECT id, user_id, abha_number, linked_at, status
     FROM abha_links
     WHERE user_id = $1 AND status = 'linked'
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Check if ABHA number is already linked to another user
 */
export async function isAbhaNumberLinked(abhaNumber: string): Promise<boolean> {
  const normalized = normalizeAbhaNumber(abhaNumber);
  const result = await pool.query(
    `SELECT id FROM abha_links
     WHERE abha_number = $1 AND status = 'linked'
     LIMIT 1`,
    [normalized]
  );

  return result.rows.length > 0;
}

/**
 * Initiate ABHA linking process
 * Step 1: Validate ABHA number and send OTP
 */
export async function initiateAbhaLink(
  userId: string,
  abhaNumber: string
): Promise<{ success: boolean; linkId?: string; otp?: string; message: string }> {
  const normalized = normalizeAbhaNumber(abhaNumber);

  // Check if user already has a linked ABHA
  const existingLink = await getUserAbhaLink(userId);
  if (existingLink) {
    return {
      success: false,
      message: 'You already have an ABHA number linked to your account',
    };
  }

  // Check if ABHA is already linked to another user
  if (await isAbhaNumberLinked(normalized)) {
    return {
      success: false,
      message: 'This ABHA number is already linked to another account',
    };
  }

  // In production: Call ABDM API to verify ABHA and send OTP
  // For MVP: Mock verification and generate OTP locally

  const linkId = uuidv4();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

  // Store verification entry
  verificationStore.set(linkId, {
    link_id: linkId,
    user_id: userId,
    abha_number: normalized,
    otp,
    expires_at: expiresAt,
    attempts: 0,
  });

  // In development, return OTP for testing
  if (config.NODE_ENV === 'development') {
    console.log(`[DEV] ABHA verification OTP for ${abhaNumber}: ${otp}`);
    return { success: true, linkId, otp, message: 'Verification OTP sent' };
  }

  // TODO: In production, send OTP via ABDM API
  return { success: true, linkId, message: 'Verification OTP sent to ABHA-registered mobile' };
}

/**
 * Verify ABHA linking with OTP
 * Step 2: Verify OTP and create link
 */
export async function verifyAbhaLink(
  linkId: string,
  otp: string
): Promise<{ success: boolean; abhaLink?: ABHALink; message: string }> {
  const entry = verificationStore.get(linkId);

  if (!entry) {
    return { success: false, message: 'Verification session not found or expired' };
  }

  // Check expiry
  if (new Date() > entry.expires_at) {
    verificationStore.delete(linkId);
    return { success: false, message: 'Verification session expired. Please try again.' };
  }

  // Check attempts
  if (entry.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    verificationStore.delete(linkId);
    return { success: false, message: 'Too many failed attempts. Please try again.' };
  }

  // Verify OTP
  if (entry.otp !== otp) {
    entry.attempts += 1;
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP verified - create ABHA link in database
  try {
    const result = await pool.query<ABHALink>(
      `INSERT INTO abha_links (user_id, abha_number, status)
       VALUES ($1, $2, 'linked')
       RETURNING id, user_id, abha_number, linked_at, status`,
      [entry.user_id, entry.abha_number]
    );

    // Clean up verification entry
    verificationStore.delete(linkId);

    return {
      success: true,
      abhaLink: result.rows[0],
      message: 'ABHA number linked successfully',
    };
  } catch (error: unknown) {
    // Handle unique constraint violation (ABHA already linked)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      verificationStore.delete(linkId);
      return { success: false, message: 'This ABHA number is already linked to an account' };
    }
    throw error;
  }
}

/**
 * Get ABHA link by ID
 */
export async function getAbhaLinkById(linkId: string): Promise<ABHALink | null> {
  const result = await pool.query<ABHALink>(
    `SELECT id, user_id, abha_number, linked_at, status
     FROM abha_links
     WHERE id = $1`,
    [linkId]
  );

  return result.rows[0] || null;
}

/**
 * Update ABHA link status
 */
export async function updateAbhaLinkStatus(
  linkId: string,
  status: ABHALinkStatus
): Promise<ABHALink | null> {
  const result = await pool.query<ABHALink>(
    `UPDATE abha_links
     SET status = $1
     WHERE id = $2
     RETURNING id, user_id, abha_number, linked_at, status`,
    [status, linkId]
  );

  return result.rows[0] || null;
}

/**
 * Unlink ABHA (set status to failed/unlinked)
 */
export async function unlinkAbha(userId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE abha_links
     SET status = 'failed'
     WHERE user_id = $1 AND status = 'linked'`,
    [userId]
  );

  return (result.rowCount ?? 0) > 0;
}
