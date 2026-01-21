import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractAuthenticatedUser } from '../../modules/auth/service';
import { AuthenticatedUser } from '../../modules/auth/types';

/**
 * Extend Express Request to include authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: { message: 'Authorization header is required' },
    });
    return;
  }

  // Expect format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid authorization format. Use: Bearer <token>' },
    });
    return;
  }

  const token = parts[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' },
    });
    return;
  }

  // Attach user to request
  req.user = extractAuthenticatedUser(payload);
  next();
}

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't require it
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    const payload = verifyToken(token);

    if (payload) {
      req.user = extractAuthenticatedUser(payload);
    }
  }

  next();
}
