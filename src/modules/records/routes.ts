import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadRecordSchema, listRecordsQuerySchema, recordIdSchema } from './validation';
import {
  createRecord,
  getRecordByIdForUser,
  listRecordsForUser,
  deleteRecord,
} from './service';
import { logRecordUploaded, logRecordViewed } from '../audit/service';
import {
  UploadRecordResponse,
  GetRecordResponse,
  ListRecordsResponse,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  RecordType,
} from './types';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

/**
 * Multer configuration for file uploads
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
  },
});

/**
 * Helper to get client IP address
 */
function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || null;
}

/**
 * POST /api/records/upload
 * Upload a new medical record
 * Requires authentication
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { message: 'No file uploaded' },
        });
        return;
      }

      // Validate metadata
      const parseResult = uploadRecordSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      const { record_type, record_date, source } = parseResult.data;
      const userId = req.user!.id;
      const clientIp = getClientIp(req);

      // Create record
      const result = await createRecord(
        userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        record_type as RecordType,
        new Date(record_date),
        source
      );

      if (!result.success || !result.record) {
        res.status(500).json({
          success: false,
          error: { message: result.error || 'Failed to upload record' },
        });
        return;
      }

      // Log upload
      await logRecordUploaded(
        userId,
        result.record.id,
        record_type,
        req.file.originalname,
        clientIp
      );

      const response: UploadRecordResponse = {
        success: true,
        message: 'Record uploaded successfully',
        record: result.record,
      };

      res.status(201).json(response);
    } catch (error) {
      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            error: { message: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          });
          return;
        }
      }
      next(error);
    }
  }
);

/**
 * GET /api/records
 * List user's records (timeline view)
 * Requires authentication
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters
      const parseResult = listRecordsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      const userId = req.user!.id;
      const query = parseResult.data;

      const { records, total } = await listRecordsForUser(userId, query);

      const response: ListRecordsResponse = {
        success: true,
        records,
        total,
        page: query.page,
        limit: query.limit,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/records/:id
 * Get a specific record
 * Requires authentication
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate record ID
      const idResult = recordIdSchema.safeParse(req.params.id);
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid record ID' },
        });
        return;
      }

      const userId = req.user!.id;
      const recordId = idResult.data;
      const clientIp = getClientIp(req);

      // Get record with ownership check
      const record = await getRecordByIdForUser(recordId, userId);

      if (!record) {
        res.status(404).json({
          success: false,
          error: { message: 'Record not found' },
        });
        return;
      }

      // Log view
      await logRecordViewed(userId, recordId, clientIp);

      const response: GetRecordResponse = {
        success: true,
        record,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/records/:id
 * Delete a record
 * Requires authentication
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate record ID
      const idResult = recordIdSchema.safeParse(req.params.id);
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid record ID' },
        });
        return;
      }

      const userId = req.user!.id;
      const recordId = idResult.data;

      // Delete record with ownership check
      const deleted = await deleteRecord(recordId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { message: 'Record not found or already deleted' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
