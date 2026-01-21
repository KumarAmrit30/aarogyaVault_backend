import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './shared/config';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import { testConnection } from './shared/database/connection';

// Import routes
import authRoutes from './modules/auth/routes';
import abhaRoutes from './modules/abha/routes';
import recordsRoutes from './modules/records/routes';
import ocrRoutes from './modules/ocr/routes';
import consentRoutes from './modules/consent/routes';
import auditRoutes from './modules/audit/routes';

const app: Express = express();

// CORS configuration
app.use(
  cors({
    origin: config.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (development only)
if (config.NODE_ENV === 'development') {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await testConnection();

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/abha', abhaRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
