import { Router, Request, Response, NextFunction } from 'express';
import { sendOtpSchema, verifyOtpSchema } from './validation';
import { sendOtp, verifyOtp, findOrCreateUser, generateToken, getUserById } from './service';
import { logUserCreated, logUserLogin } from '../audit/service';
import { SendOtpResponse, VerifyOtpResponse } from './types';
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
 * POST /api/auth/send-otp
 * Send OTP to mobile number for authentication
 */
router.post(
  '/send-otp',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = sendOtpSchema.safeParse(req.body);
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

      const { mobile_number } = parseResult.data;

      // Send OTP
      const result = await sendOtp(mobile_number);

      const response: SendOtpResponse = {
        success: result.success,
        message: result.success
          ? 'OTP sent successfully'
          : 'Failed to send OTP',
        // Include OTP in development mode for testing
        ...(config.NODE_ENV === 'development' && result.otp && { otp: result.otp }),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return JWT token
 */
router.post(
  '/verify-otp',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = verifyOtpSchema.safeParse(req.body);
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

      const { mobile_number, otp } = parseResult.data;
      const clientIp = getClientIp(req);

      // Verify OTP
      const otpResult = await verifyOtp(mobile_number, otp);
      if (!otpResult.valid) {
        const response: VerifyOtpResponse = {
          success: false,
          message: otpResult.message,
        };
        res.status(401).json(response);
        return;
      }

      // Find or create user (idempotent)
      const { user, isNew } = await findOrCreateUser(mobile_number);

      // Log audit event
      if (isNew) {
        await logUserCreated(user.id, clientIp);
      }
      await logUserLogin(user.id, clientIp);

      // Generate JWT token
      const token = generateToken(user);

      const response: VerifyOtpResponse = {
        success: true,
        message: isNew ? 'Account created successfully' : 'Login successful',
        token,
        user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await getUserById(req.user!.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
