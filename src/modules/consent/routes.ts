import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import {
  createConsentSchema,
  accessConsentSchema,
  revokeConsentSchema,
  listConsentsQuerySchema,
} from './validation';
import {
  createConsent,
  accessConsent,
  revokeConsent,
  listConsents,
  getConsentById,
} from './service';

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
 * POST /api/consent/create
 * Create a new consent for sharing records
 * Requires authentication
 */
router.post(
  '/create',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      // Validate request body
      const parseResult = createConsentSchema.safeParse(req.body);
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

      const clientIp = getClientIp(req);
      const result = await createConsent(req.user.id, parseResult.data, clientIp);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/consent
 * List consents for the authenticated user
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      // Validate query params
      const parseResult = listConsentsQuerySchema.safeParse(req.query);
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

      const { status, page, limit } = parseResult.data;
      const result = await listConsents(req.user.id, status, page, limit);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/consent/:id
 * Get a specific consent by ID (for owner)
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({ success: false, error: { message: 'Invalid consent ID format' } });
        return;
      }

      const result = await getConsentById(req.user.id, id);

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

/**
 * POST /api/consent/revoke
 * Revoke an existing consent
 */
router.post(
  '/revoke',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      // Validate request body
      const parseResult = revokeConsentSchema.safeParse(req.body);
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

      const { consent_id } = parseResult.data;
      const clientIp = getClientIp(req);

      const result = await revokeConsent(req.user.id, consent_id, clientIp);

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
 * POST /api/consent/access/:token
 * Access shared records via consent token (public endpoint, no auth required)
 * This is what the doctor/recipient uses to view shared records
 */
router.post(
  '/access/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;

      // Validate token format (64 hex characters)
      if (!/^[0-9a-f]{64}$/i.test(token)) {
        res.status(400).json({ success: false, error: { message: 'Invalid share token format' } });
        return;
      }

      // Validate request body (optional PIN)
      const parseResult = accessConsentSchema.safeParse(req.body);
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

      const { access_pin } = parseResult.data;
      const clientIp = getClientIp(req);

      const result = await accessConsent(token, access_pin, clientIp);

      if (result.success) {
        res.status(200).json(result);
      } else if (result.requires_pin) {
        res.status(401).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/consent/access/:token
 * Check if consent is valid and if PIN is required (public endpoint)
 */
router.get(
  '/access/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;

      // Validate token format
      if (!/^[0-9a-f]{64}$/i.test(token)) {
        res.status(400).json({ success: false, error: { message: 'Invalid share token format' } });
        return;
      }

      // Try to access without PIN to check if it's required
      const result = await accessConsent(token, undefined, getClientIp(req));

      if (result.success) {
        // No PIN required, return the data
        res.status(200).json(result);
      } else if (result.requires_pin) {
        // PIN required, return status without data
        res.status(200).json({
          success: true,
          requires_pin: true,
          message: 'Access PIN required to view records',
        });
      } else {
        // Invalid or expired
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
