import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ error: 'Authorization header is missing' });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Token is missing' });
        return;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Auth error:', error);
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Unexpected auth error:', err);
        res.status(500).json({ error: 'Authentication service failed' });
        return;
    }
};
