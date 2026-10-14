import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env and local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import profileRoutes from './routes/profile';
import encounterRoutes from './routes/encounters';
import reportRoutes from './routes/reports';
import providerRoutes from './routes/providers';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notifications';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' }));

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
        service: 'ai-med-app-backend'
    });
});

// API Routes
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/encounters', encounterRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV !== 'test') {
        console.error(err.stack);
    }
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

export default app;
export { app };
