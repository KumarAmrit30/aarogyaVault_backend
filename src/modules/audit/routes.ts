import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { listAuditLogsQuerySchema } from './validation';
import { listAuditLogs, getAuditStats } from './service';

const router = Router();

/**
 * GET /api/audit/logs
 * List audit logs for the authenticated user
 * Supports filtering by action_type, resource_type, and date range
 */
router.get(
  '/logs',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      // Validate query params
      const parseResult = listAuditLogsQuerySchema.safeParse(req.query);
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

      const { logs, total } = await listAuditLogs(req.user.id, parseResult.data);

      res.status(200).json({
        success: true,
        logs,
        total,
        page: parseResult.data.page || 1,
        limit: parseResult.data.limit || 50,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/audit/stats
 * Get audit statistics for the authenticated user
 * Provides summary of all actions, counts by type, and recent activity
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
        return;
      }

      const stats = await getAuditStats(req.user.id);

      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
