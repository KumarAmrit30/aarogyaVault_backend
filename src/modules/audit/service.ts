import { pool } from '../../shared/database/connection';
import { AuditLog, CreateAuditLogInput, ResourceType, AuditActionType } from '../../shared/types';
import { ListAuditLogsQuery, AuditLogItem, ACTION_DESCRIPTIONS, AuditStatsResponse } from './types';

/**
 * Create an audit log entry
 * Audit logs are append-only (immutable)
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const result = await pool.query<AuditLog>(
    `INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, action_type, resource_type, resource_id, metadata, ip_address, created_at`,
    [
      input.user_id,
      input.action_type,
      input.resource_type,
      input.resource_id,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.ip_address || null,
    ]
  );

  return result.rows[0];
}

/**
 * Log user creation
 */
export async function logUserCreated(
  userId: string,
  ipAddress?: string | null
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action_type: 'user_created',
    resource_type: 'user',
    resource_id: userId,
    metadata: {},
    ip_address: ipAddress,
  });
}

/**
 * Log user login
 */
export async function logUserLogin(
  userId: string,
  ipAddress?: string | null
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action_type: 'user_login',
    resource_type: 'user',
    resource_id: userId,
    metadata: {},
    ip_address: ipAddress,
  });
}

/**
 * Log ABHA linking
 */
export async function logAbhaLinked(
  userId: string,
  abhaLinkId: string,
  abhaNumber: string,
  ipAddress?: string | null
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action_type: 'abha_linked',
    resource_type: 'abha_link',
    resource_id: abhaLinkId,
    metadata: { abha_number: abhaNumber },
    ip_address: ipAddress,
  });
}

/**
 * Log record upload
 */
export async function logRecordUploaded(
  userId: string,
  recordId: string,
  recordType: string,
  fileName: string,
  ipAddress?: string | null
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action_type: 'record_uploaded',
    resource_type: 'record',
    resource_id: recordId,
    metadata: { record_type: recordType, file_name: fileName },
    ip_address: ipAddress,
  });
}

/**
 * Log record view
 */
export async function logRecordViewed(
  userId: string,
  recordId: string,
  ipAddress?: string | null
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action_type: 'record_viewed',
    resource_type: 'record',
    resource_id: recordId,
    metadata: {},
    ip_address: ipAddress,
  });
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogsForUser(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> {
  const result = await pool.query<AuditLog>(
    `SELECT id, user_id, action_type, resource_type, resource_id, metadata, ip_address, created_at
     FROM audit_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

/**
 * Get audit logs for a specific resource
 */
export async function getAuditLogsForResource(
  resourceType: ResourceType,
  resourceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuditLog[]> {
  const result = await pool.query<AuditLog>(
    `SELECT id, user_id, action_type, resource_type, resource_id, metadata, ip_address, created_at
     FROM audit_logs
     WHERE resource_type = $1 AND resource_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [resourceType, resourceId, limit, offset]
  );

  return result.rows;
}

/**
 * Convert AuditLog to AuditLogItem with human-readable description
 */
function toAuditLogItem(log: AuditLog): AuditLogItem {
  return {
    id: log.id,
    action_type: log.action_type,
    action_description: ACTION_DESCRIPTIONS[log.action_type] || log.action_type,
    resource_type: log.resource_type,
    resource_id: log.resource_id,
    metadata: log.metadata || {},
    ip_address: log.ip_address,
    created_at: log.created_at.toISOString(),
  };
}

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditLogs(
  userId: string,
  query: ListAuditLogsQuery
): Promise<{ logs: AuditLogItem[]; total: number }> {
  const { page = 1, limit = 50, action_type, resource_type, from_date, to_date } = query;
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clause
  const conditions: string[] = ['user_id = $1'];
  const params: (string | number | Date)[] = [userId];
  let paramIndex = 2;

  if (action_type) {
    conditions.push(`action_type = $${paramIndex}`);
    params.push(action_type);
    paramIndex++;
  }

  if (resource_type) {
    conditions.push(`resource_type = $${paramIndex}`);
    params.push(resource_type);
    paramIndex++;
  }

  if (from_date) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(new Date(from_date));
    paramIndex++;
  }

  if (to_date) {
    // Add 1 day to include the entire end date
    const endDate = new Date(to_date);
    endDate.setDate(endDate.getDate() + 1);
    conditions.push(`created_at < $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get logs
  const logsResult = await pool.query<AuditLog>(
    `SELECT id, user_id, action_type, resource_type, resource_id, metadata, ip_address, created_at
     FROM audit_logs
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows.map(toAuditLogItem),
    total,
  };
}

/**
 * Get audit statistics for a user
 */
export async function getAuditStats(userId: string): Promise<AuditStatsResponse['stats']> {
  // Get total count
  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = $1`,
    [userId]
  );
  const totalActions = parseInt(totalResult.rows[0].count, 10);

  // Get counts by action type
  const countsByTypeResult = await pool.query<{ action_type: AuditActionType; count: string }>(
    `SELECT action_type, COUNT(*) as count
     FROM audit_logs
     WHERE user_id = $1
     GROUP BY action_type`,
    [userId]
  );
  
  const actionsByType = {} as Record<AuditActionType, number>;
  for (const row of countsByTypeResult.rows) {
    actionsByType[row.action_type] = parseInt(row.count, 10);
  }

  // Get recent actions (last 5)
  const recentResult = await pool.query<AuditLog>(
    `SELECT id, user_id, action_type, resource_type, resource_id, metadata, ip_address, created_at
     FROM audit_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );
  const recentActions = recentResult.rows.map(toAuditLogItem);

  // Get last login
  const lastLoginResult = await pool.query<{ created_at: Date }>(
    `SELECT created_at
     FROM audit_logs
     WHERE user_id = $1 AND action_type = 'user_login'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  const lastLogin = lastLoginResult.rows[0]?.created_at?.toISOString();

  return {
    total_actions: totalActions,
    actions_by_type: actionsByType,
    recent_actions: recentActions,
    last_login: lastLogin,
    records_uploaded: actionsByType['record_uploaded'] || 0,
    consents_created: actionsByType['consent_created'] || 0,
  };
}
