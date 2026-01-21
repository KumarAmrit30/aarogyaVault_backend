import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { triggerOCRSchema } from './validation';
import { triggerOCRExtraction, getExtraction } from './service';

const router = Router();

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
 * POST /api/ocr/extract
 * Trigger OCR extraction for a medical record.
 * The extraction is mock/simulated and always labeled as AI-assisted.
 */
router.post(
  '/extract',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      // Validate request body
      const parseResult = triggerOCRSchema.safeParse(req.body);
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

      const { record_id } = parseResult.data;
      const clientIp = getClientIp(req);

      const result = await triggerOCRExtraction(req.user.id, record_id, clientIp);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ocr/extraction/:record_id
 * Get the AI extraction for a specific record.
 * Response always includes is_ai_assisted: true label.
 */
router.get(
  '/extraction/:record_id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      const { record_id } = req.params;
      const clientIp = getClientIp(req);

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(record_id)) {
        res.status(400).json({ success: false, error: { message: 'Invalid record ID format' } });
        return;
      }

      const result = await getExtraction(req.user.id, record_id, clientIp);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
