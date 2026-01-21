import { Router, Request, Response, NextFunction } from 'express';
import { initiateLinkSchema, verifyLinkSchema } from './validation';
import {
  initiateAbhaLink,
  verifyAbhaLink,
  getUserAbhaLink,
} from './service';
import { logAbhaLinked } from '../audit/service';
import {
  InitiateLinkResponse,
  VerifyLinkResponse,
  GetLinkStatusResponse,
} from './types';
import { config } from '../../shared/config';
import { authenticate } from '../../shared/middleware/auth';

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
 * POST /api/abha/initiate-link
 * Step 1: Initiate ABHA linking by providing ABHA number
 * Requires authentication
 */
router.post(
  '/initiate-link',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = initiateLinkSchema.safeParse(req.body);
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

      const { abha_number } = parseResult.data;
      const userId = req.user!.id;

      // Initiate linking
      const result = await initiateAbhaLink(userId, abha_number);

      const response: InitiateLinkResponse = {
        success: result.success,
        message: result.message,
        link_id: result.linkId,
        // Include OTP in development mode for testing
        ...(config.NODE_ENV === 'development' && result.otp && { otp: result.otp }),
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/abha/verify-link
 * Step 2: Verify ABHA linking with OTP
 * Requires authentication
 */
router.post(
  '/verify-link',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = verifyLinkSchema.safeParse(req.body);
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

      const { link_id, otp } = parseResult.data;
      const userId = req.user!.id;
      const clientIp = getClientIp(req);

      // Verify linking
      const result = await verifyAbhaLink(link_id, otp);

      // Log successful linking
      if (result.success && result.abhaLink) {
        await logAbhaLinked(
          userId,
          result.abhaLink.id,
          result.abhaLink.abha_number,
          clientIp
        );
      }

      const response: VerifyLinkResponse = {
        success: result.success,
        message: result.message,
        abha_link: result.abhaLink,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/abha/status
 * Get current ABHA link status
 * Requires authentication
 */
router.get(
  '/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Get user's ABHA link
      const abhaLink = await getUserAbhaLink(userId);

      const response: GetLinkStatusResponse = {
        success: true,
        linked: abhaLink !== null,
        abha_link: abhaLink || undefined,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
