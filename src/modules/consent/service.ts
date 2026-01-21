import { pool } from '../../shared/database/connection';
import { Consent, Record as MedicalRecord } from '../../shared/types';
import {
  ConsentStatus,
  CreateConsentRequest,
  CreateConsentResponse,
  AccessConsentResponse,
  RevokeConsentResponse,
  ListConsentsResponse,
  ConsentListItem,
  ConsentRecordDetail,
  ConsentWithPin,
} from './types';
import { getRecordByIdForUser } from '../records/service';
import { getExtractionByRecordId } from '../ocr/service';
import { createAuditLog } from '../audit/service';
import crypto from 'crypto';
import { config } from '../../shared/config';

/**
 * Generate a secure random token for sharing
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 character hex string
}

/**
 * Hash a PIN using SHA-256 (simple hash for MVP, consider bcrypt for production)
 */
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify PIN against hash
 */
function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

/**
 * Determine the current status of a consent
 */
function getConsentStatus(consent: { status: string; expires_at: Date }): ConsentStatus {
  if (consent.status === 'revoked') {
    return 'revoked';
  }
  if (new Date(consent.expires_at) < new Date()) {
    return 'expired';
  }
  return 'active';
}

/**
 * Create a new consent for sharing records
 */
export async function createConsent(
  userId: string,
  request: CreateConsentRequest,
  ipAddress?: string | null
): Promise<CreateConsentResponse> {
  const { record_ids, purpose, duration_hours, access_pin } = request;

  // Verify all records belong to the user
  const validRecords: MedicalRecord[] = [];
  for (const recordId of record_ids) {
    const record = await getRecordByIdForUser(recordId, userId);
    if (!record) {
      return {
        success: false,
        message: `Record ${recordId} not found or not authorized`,
      };
    }
    validRecords.push(record);
  }

  // Generate share token and calculate expiry
  const shareToken = generateShareToken();
  const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
  const pinHash = access_pin ? hashPin(access_pin) : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create consent
    const consentResult = await client.query<Consent & { access_pin_hash: string | null }>(
      `INSERT INTO consents (user_id, purpose, expires_at, share_token, access_pin_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, user_id, purpose, expires_at, share_token, created_at, access_pin_hash`,
      [userId, purpose, expiresAt, shareToken, pinHash]
    );

    const consent = consentResult.rows[0];

    // Link records to consent
    for (const recordId of record_ids) {
      await client.query(
        `INSERT INTO consent_records (consent_id, record_id) VALUES ($1, $2)`,
        [consent.id, recordId]
      );
    }

    await client.query('COMMIT');

    // Audit log
    await createAuditLog({
      user_id: userId,
      action_type: 'consent_created',
      resource_type: 'consent',
      resource_id: consent.id,
      metadata: {
        record_count: record_ids.length,
        duration_hours,
        has_pin: !!access_pin,
      },
      ip_address: ipAddress,
    });

    // Build share URL
    const baseUrl = config.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'https://app.aarogyavault.in'
      : `http://localhost:${config.PORT}`;
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    return {
      success: true,
      message: 'Consent created successfully',
      consent: {
        id: consent.id,
        share_url: shareUrl,
        share_token: shareToken,
        expires_at: consent.expires_at.toISOString(),
        purpose,
        record_count: record_ids.length,
        access_pin_required: !!access_pin,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating consent:', error);
    return {
      success: false,
      message: 'Failed to create consent',
    };
  } finally {
    client.release();
  }
}

/**
 * Access shared records via consent token
 */
export async function accessConsent(
  shareToken: string,
  accessPin?: string,
  ipAddress?: string | null
): Promise<AccessConsentResponse> {
  // Find consent by token
  const consentResult = await pool.query<ConsentWithPin>(
    `SELECT id, user_id, purpose, expires_at, share_token, created_at, access_pin_hash, status
     FROM consents
     WHERE share_token = $1`,
    [shareToken]
  );

  const consent = consentResult.rows[0];
  if (!consent) {
    return {
      success: false,
      message: 'Invalid or expired share link',
    };
  }

  // Check consent status
  const status = getConsentStatus(consent);
  if (status === 'revoked') {
    return {
      success: false,
      message: 'This consent has been revoked',
    };
  }
  if (status === 'expired') {
    return {
      success: false,
      message: 'This consent has expired',
    };
  }

  // Check PIN if required
  if (consent.access_pin_hash) {
    if (!accessPin) {
      return {
        success: false,
        requires_pin: true,
        message: 'Access PIN required',
      };
    }
    if (!verifyPin(accessPin, consent.access_pin_hash)) {
      // Audit failed access attempt
      await createAuditLog({
        user_id: consent.user_id,
        action_type: 'consent_access_failed',
        resource_type: 'consent',
        resource_id: consent.id,
        metadata: { reason: 'invalid_pin' },
        ip_address: ipAddress,
      });
      return {
        success: false,
        message: 'Invalid access PIN',
      };
    }
  }

  // Get linked records
  const recordsResult = await pool.query<MedicalRecord>(
    `SELECT r.id, r.record_type, r.file_url, r.file_name, r.record_date, r.source, r.status
     FROM records r
     INNER JOIN consent_records cr ON r.id = cr.record_id
     WHERE cr.consent_id = $1`,
    [consent.id]
  );

  // Build response with AI extractions
  const records: ConsentRecordDetail[] = [];
  for (const record of recordsResult.rows) {
    const extraction = await getExtractionByRecordId(record.id);
    records.push({
      id: record.id,
      record_type: record.record_type,
      file_name: record.file_name,
      record_date: record.record_date.toISOString(),
      source: record.source,
      file_url: record.file_url,
      ...(extraction && {
        ai_extraction: {
          extracted_data: extraction.extracted_data as Record<string, unknown>,
          confidence_score: Number(extraction.confidence_score),
          is_ai_assisted: true as const,
        },
      }),
    });
  }

  // Audit successful access
  await createAuditLog({
    user_id: consent.user_id,
    action_type: 'consent_accessed',
    resource_type: 'consent',
    resource_id: consent.id,
    metadata: { records_accessed: records.length },
    ip_address: ipAddress,
  });

  return {
    success: true,
    consent: {
      id: consent.id,
      purpose: consent.purpose,
      expires_at: consent.expires_at.toISOString(),
      created_at: consent.created_at.toISOString(),
      records,
    },
  };
}

/**
 * Revoke an existing consent
 */
export async function revokeConsent(
  userId: string,
  consentId: string,
  ipAddress?: string | null
): Promise<RevokeConsentResponse> {
  // Verify consent belongs to user
  const consentResult = await pool.query<Consent>(
    `SELECT id, user_id FROM consents WHERE id = $1 AND user_id = $2`,
    [consentId, userId]
  );

  if (consentResult.rows.length === 0) {
    return {
      success: false,
      message: 'Consent not found or not authorized',
    };
  }

  // Update status to revoked
  await pool.query(
    `UPDATE consents SET status = 'revoked' WHERE id = $1`,
    [consentId]
  );

  // Audit log
  await createAuditLog({
    user_id: userId,
    action_type: 'consent_revoked',
    resource_type: 'consent',
    resource_id: consentId,
    metadata: {},
    ip_address: ipAddress,
  });

  return {
    success: true,
    message: 'Consent revoked successfully',
  };
}

/**
 * List consents for a user
 */
export async function listConsents(
  userId: string,
  statusFilter: 'active' | 'expired' | 'revoked' | 'all' = 'all',
  page: number = 1,
  limit: number = 20
): Promise<ListConsentsResponse> {
  const offset = (page - 1) * limit;

  // Build query based on status filter
  let statusCondition = '';
  const params: (string | number)[] = [userId];
  let paramIndex = 2;

  if (statusFilter !== 'all') {
    if (statusFilter === 'active') {
      statusCondition = `AND c.status = 'active' AND c.expires_at > NOW()`;
    } else if (statusFilter === 'expired') {
      statusCondition = `AND (c.status = 'active' AND c.expires_at <= NOW())`;
    } else if (statusFilter === 'revoked') {
      statusCondition = `AND c.status = 'revoked'`;
    }
  }

  // Get consents with record count
  const consentsResult = await pool.query<{
    id: string;
    purpose: string;
    share_token: string;
    expires_at: Date;
    created_at: Date;
    status: string;
    access_pin_hash: string | null;
    record_count: string;
  }>(
    `SELECT c.id, c.purpose, c.share_token, c.expires_at, c.created_at, 
            c.status, c.access_pin_hash,
            COUNT(cr.record_id)::text as record_count
     FROM consents c
     LEFT JOIN consent_records cr ON c.id = cr.consent_id
     WHERE c.user_id = $1 ${statusCondition}
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  // Get total count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM consents c WHERE user_id = $1 ${statusCondition}`,
    params
  );

  const consents: ConsentListItem[] = consentsResult.rows.map((row) => ({
    id: row.id,
    purpose: row.purpose,
    share_token: row.share_token,
    expires_at: row.expires_at.toISOString(),
    created_at: row.created_at.toISOString(),
    status: getConsentStatus({ status: row.status, expires_at: row.expires_at }),
    record_count: parseInt(row.record_count, 10),
    access_pin_required: !!row.access_pin_hash,
  }));

  return {
    success: true,
    consents,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Get a single consent by ID (for owner)
 */
export async function getConsentById(
  userId: string,
  consentId: string
): Promise<{ success: boolean; consent?: ConsentListItem; message?: string }> {
  const result = await pool.query<{
    id: string;
    purpose: string;
    share_token: string;
    expires_at: Date;
    created_at: Date;
    status: string;
    access_pin_hash: string | null;
    record_count: string;
  }>(
    `SELECT c.id, c.purpose, c.share_token, c.expires_at, c.created_at, 
            c.status, c.access_pin_hash,
            COUNT(cr.record_id)::text as record_count
     FROM consents c
     LEFT JOIN consent_records cr ON c.id = cr.consent_id
     WHERE c.id = $1 AND c.user_id = $2
     GROUP BY c.id`,
    [consentId, userId]
  );

  if (result.rows.length === 0) {
    return { success: false, message: 'Consent not found' };
  }

  const row = result.rows[0];
  return {
    success: true,
    consent: {
      id: row.id,
      purpose: row.purpose,
      share_token: row.share_token,
      expires_at: row.expires_at.toISOString(),
      created_at: row.created_at.toISOString(),
      status: getConsentStatus({ status: row.status, expires_at: row.expires_at }),
      record_count: parseInt(row.record_count, 10),
      access_pin_required: !!row.access_pin_hash,
    },
  };
}
