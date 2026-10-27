import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import profileRoutes from './routes/profile';
import encounterRoutes from './routes/encounters';
import reportRoutes from './routes/reports';
import providerRoutes from './routes/providers';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import { globalApiRateLimiter } from './middleware/rateLimiter';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile applications / server-to-server (no origin) or allowed domains
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());

// Scoped 50MB body limit specifically for image upload and computer vision endpoints
app.use('/api/v1/encounters/:id/wound', express.json({ limit: '50mb' }));
app.use('/api/v1/ai/analyze', express.json({ limit: '50mb' }));

// Standard secure 1MB body limit for all other JSON routes
app.use(express.json({ limit: '1mb' }));

// Request Logger (only in non-test environment to keep test output clean)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
  });
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('AI First Aid App Backend is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'laso-backend',
  });
});

// Baseline rate limit for all API routes (scoped limiters tighten further).
app.use('/api/v1', globalApiRateLimiter);

// API Routes
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/encounters', encounterRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.stack || err);
  }
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    statusCode === 500 && isProduction
      ? 'Internal server error'
      : err.message || 'Something went wrong!';
  res.status(statusCode).json({
    error: message,
    ...(err.code ? { code: err.code } : {}),
    ...(err.userMessage ? { userMessage: err.userMessage } : {}),
  });
});

export default app;
export { app };
