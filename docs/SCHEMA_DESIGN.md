# Database Schema Design

## Overview

This document describes the database schema for AarogyaVault backend. All tables use UUIDs as primary keys and include timestamps for audit purposes.

## Tables

### 1. users

Stores patient user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| mobile_number | VARCHAR(15) | NOT NULL, UNIQUE | User's mobile number (E.164 format) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_mobile_number` on `mobile_number` (for login lookups)

**Triggers:**
- `update_updated_at` trigger to automatically update `updated_at` on row changes

---

### 2. abha_links

Stores ABHA number linkages for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique link identifier |
| user_id | UUID | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Reference to user |
| abha_number | VARCHAR(20) | NOT NULL, UNIQUE | ABHA number (format: XXXX-XXXX-XXXX) |
| linked_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Linkage timestamp |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Status: 'pending', 'linked', 'failed' |

**Indexes:**
- `idx_abha_links_user_id` on `user_id` (for user lookups)
- `idx_abha_links_abha_number` on `abha_number` (for ABHA lookups)

**Constraints:**
- CHECK constraint on `status` to ensure valid values

---

### 3. records

Stores uploaded medical records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique record identifier |
| user_id | UUID | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Record owner |
| record_type | VARCHAR(100) | NOT NULL | Type: 'lab_report', 'prescription', 'xray', etc. |
| file_url | TEXT | NOT NULL | S3 URL to the file |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| record_date | DATE | NOT NULL | Date of the medical record |
| source | VARCHAR(255) | NOT NULL | Source: 'hospital_name', 'clinic_name', etc. |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'uploaded' | Status: 'uploaded', 'ai_extracted', 'verified' |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Upload timestamp |

**Indexes:**
- `idx_records_user_id` on `user_id` (for user's records)
- `idx_records_record_date` on `record_date` (for timeline sorting)
- `idx_records_status` on `status` (for status filtering)
- Composite index: `idx_records_user_date` on `(user_id, record_date DESC)` (for timeline queries)

**Constraints:**
- CHECK constraint on `status` to ensure valid values

---

### 4. ai_extractions

Stores AI/OCR extracted data from records (non-authoritative).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique extraction identifier |
| record_id | UUID | NOT NULL, FOREIGN KEY → records(id) ON DELETE CASCADE | Reference to record |
| extracted_data | JSONB | NOT NULL | Extracted fields as JSON |
| confidence_score | DECIMAL(5,4) | NOT NULL, CHECK (0 <= confidence_score <= 1) | Confidence score (0-1) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Extraction timestamp |

**Indexes:**
- `idx_ai_extractions_record_id` on `record_id` (for record lookups)
- GIN index on `extracted_data` for JSON queries: `idx_ai_extractions_data` on `extracted_data`

**Constraints:**
- One extraction per record (UNIQUE constraint on `record_id`)

---

### 5. consents

Stores time-bound consent records for sharing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique consent identifier |
| user_id | UUID | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Consent owner |
| purpose | TEXT | NOT NULL | Purpose of sharing |
| expires_at | TIMESTAMP | NOT NULL | Expiry timestamp |
| share_token | VARCHAR(64) | NOT NULL, UNIQUE | Secure token for share link |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Consent creation timestamp |

**Indexes:**
- `idx_consents_user_id` on `user_id` (for user's consents)
- `idx_consents_share_token` on `share_token` (for token lookups - critical for performance)
- `idx_consents_expires_at` on `expires_at` (for expiry checks)

**Constraints:**
- CHECK constraint: `expires_at > created_at`

---

### 6. consent_records

Junction table linking consents to specific records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| consent_id | UUID | NOT NULL, FOREIGN KEY → consents(id) ON DELETE CASCADE | Reference to consent |
| record_id | UUID | NOT NULL, FOREIGN KEY → records(id) ON DELETE CASCADE | Reference to record |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Link creation timestamp |

**Indexes:**
- `idx_consent_records_consent_id` on `consent_id` (for consent lookups)
- `idx_consent_records_record_id` on `record_id` (for record lookups)
- Composite PRIMARY KEY on `(consent_id, record_id)` to prevent duplicates

---

### 7. audit_logs

Immutable append-only log of all system actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique log identifier |
| user_id | UUID | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | User who performed action (null for anonymous) |
| action_type | VARCHAR(50) | NOT NULL | Action: 'user_created', 'record_uploaded', etc. |
| resource_type | VARCHAR(50) | NOT NULL | Resource: 'user', 'record', 'consent', etc. |
| resource_id | UUID | NULL | ID of affected resource (null if not applicable) |
| metadata | JSONB | NULL | Additional context as JSON |
| ip_address | INET | NULL | IP address of requester |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Action timestamp |

**Indexes:**
- `idx_audit_logs_user_id` on `user_id` (for user activity)
- `idx_audit_logs_action_type` on `action_type` (for action filtering)
- `idx_audit_logs_resource` on `(resource_type, resource_id)` (for resource history)
- `idx_audit_logs_created_at` on `created_at DESC` (for chronological queries)
- Composite index: `idx_audit_logs_user_date` on `(user_id, created_at DESC)` (for user timeline)

**Constraints:**
- Table is append-only (no UPDATE or DELETE operations allowed via application)
- CHECK constraint on `action_type` to ensure valid values
- CHECK constraint on `resource_type` to ensure valid values

---

## Relationships

```
users (1) ──< (N) abha_links
users (1) ──< (N) records
users (1) ──< (N) consents
users (1) ──< (N) audit_logs

records (1) ──< (1) ai_extractions
records (N) ──< (N) consent_records ──> (N) consents
```

## Migration Strategy

1. Create tables in dependency order:
   - users (no dependencies)
   - abha_links, records, consents, audit_logs (depend on users)
   - ai_extractions (depends on records)
   - consent_records (depends on consents and records)

2. Create indexes after table creation for better performance

3. Add triggers for `updated_at` after table creation

## Security Considerations

- All foreign keys use CASCADE or SET NULL appropriately
- Audit logs are immutable (enforced at application level)
- Share tokens are unique and indexed for fast lookups
- Sensitive data (file URLs) stored securely in S3, only references in DB

## Performance Considerations

- Indexes on all foreign keys for join performance
- Composite indexes for common query patterns (user + date, resource type + ID)
- GIN index on JSONB columns for efficient JSON queries
- Partitioning audit_logs by date may be needed at scale (future consideration)
