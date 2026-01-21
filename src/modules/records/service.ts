import { pool } from '../../shared/database/connection';
import { uploadFile, deleteFile } from '../../shared/services/storage';
import { Record, RecordStatus } from '../../shared/types';
import { RecordType, ListRecordsQuery } from './types';

/**
 * Create a new medical record
 */
export async function createRecord(
  userId: string,
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string,
  recordType: RecordType,
  recordDate: Date,
  source: string
): Promise<{ success: boolean; record?: Record; error?: string }> {
  // Upload file to storage
  const uploadResult = await uploadFile(userId, fileBuffer, originalFileName, mimeType);
  
  if (!uploadResult.success || !uploadResult.fileUrl) {
    return {
      success: false,
      error: uploadResult.error || 'Failed to upload file',
    };
  }
  
  try {
    // Create record in database
    const result = await pool.query<Record>(
      `INSERT INTO records (user_id, record_type, file_url, file_name, record_date, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'uploaded')
       RETURNING id, user_id, record_type, file_url, file_name, record_date, source, status, created_at`,
      [userId, recordType, uploadResult.fileUrl, uploadResult.fileName, recordDate, source]
    );
    
    return {
      success: true,
      record: result.rows[0],
    };
  } catch (error) {
    // Cleanup uploaded file on database error
    await deleteFile(uploadResult.fileUrl);
    console.error('Create record error:', error);
    return {
      success: false,
      error: 'Failed to create record',
    };
  }
}

/**
 * Get a record by ID
 */
export async function getRecordById(recordId: string): Promise<Record | null> {
  const result = await pool.query<Record>(
    `SELECT id, user_id, record_type, file_url, file_name, record_date, source, status, created_at
     FROM records
     WHERE id = $1`,
    [recordId]
  );
  
  return result.rows[0] || null;
}

/**
 * Get a record by ID with ownership check
 */
export async function getRecordByIdForUser(
  recordId: string,
  userId: string
): Promise<Record | null> {
  const result = await pool.query<Record>(
    `SELECT id, user_id, record_type, file_url, file_name, record_date, source, status, created_at
     FROM records
     WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  
  return result.rows[0] || null;
}

/**
 * List records for a user (timeline view)
 */
export async function listRecordsForUser(
  userId: string,
  query: ListRecordsQuery
): Promise<{ records: Record[]; total: number }> {
  const {
    page = 1,
    limit = 20,
    record_type,
    status,
    from_date,
    to_date,
  } = query;
  
  const offset = (page - 1) * limit;
  
  // Build dynamic WHERE clause
  const conditions: string[] = ['user_id = $1'];
  const params: (string | number | Date)[] = [userId];
  let paramIndex = 2;
  
  if (record_type) {
    conditions.push(`record_type = $${paramIndex}`);
    params.push(record_type);
    paramIndex++;
  }
  
  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (from_date) {
    conditions.push(`record_date >= $${paramIndex}`);
    params.push(new Date(from_date));
    paramIndex++;
  }
  
  if (to_date) {
    conditions.push(`record_date <= $${paramIndex}`);
    params.push(new Date(to_date));
    paramIndex++;
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM records WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  
  // Get records
  const recordsResult = await pool.query<Record>(
    `SELECT id, user_id, record_type, file_url, file_name, record_date, source, status, created_at
     FROM records
     WHERE ${whereClause}
     ORDER BY record_date DESC, created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );
  
  return {
    records: recordsResult.rows,
    total,
  };
}

/**
 * Update record status
 */
export async function updateRecordStatus(
  recordId: string,
  status: RecordStatus
): Promise<Record | null> {
  const result = await pool.query<Record>(
    `UPDATE records
     SET status = $1
     WHERE id = $2
     RETURNING id, user_id, record_type, file_url, file_name, record_date, source, status, created_at`,
    [status, recordId]
  );
  
  return result.rows[0] || null;
}

/**
 * Delete a record
 */
export async function deleteRecord(
  recordId: string,
  userId: string
): Promise<boolean> {
  // Get record first to check ownership and get file URL
  const record = await getRecordByIdForUser(recordId, userId);
  if (!record) {
    return false;
  }
  
  // Delete from database
  const result = await pool.query(
    `DELETE FROM records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  
  if ((result.rowCount ?? 0) > 0) {
    // Delete file from storage
    await deleteFile(record.file_url);
    return true;
  }
  
  return false;
}

/**
 * Get records count for user
 */
export async function getRecordsCountForUser(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM records WHERE user_id = $1`,
    [userId]
  );
  
  return parseInt(result.rows[0].count, 10);
}
