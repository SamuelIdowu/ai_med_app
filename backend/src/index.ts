import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Load from root .env



const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' }));

import { authenticateUser } from './middleware/auth';
import profileRoutes from './routes/profile';
import encounterRoutes from './routes/encounters';
import reportRoutes from './routes/reports';
import providerRoutes from './routes/providers';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notifications';

app.get('/', (req, res) => {
    res.send('AI First Aid App Backend is running');
});

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
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
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server is running on port ${port} at 0.0.0.0`);
});
