import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './shared/config';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import { testConnection } from './shared/database/connection';

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

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// API routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/abha', abhaRoutes);
// app.use('/api/records', recordsRoutes);
// app.use('/api/consent', consentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
