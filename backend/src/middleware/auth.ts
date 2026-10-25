import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Extend Express Request to include user
declare module 'express-serve-static-core' {
    interface Request {
        user?: any;
    }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        if (process.env.NODE_ENV !== 'test') {
            console.log('Auth Middleware: Authorization header is missing');
        }
        res.status(401).json({
            error: 'Authorization header is missing',
            code: 'AUTH_MISSING',
            userMessage: 'Please sign in to continue.',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        if (process.env.NODE_ENV !== 'test') {
            console.log('Auth Middleware: Token is missing from header');
        }
        res.status(401).json({
            error: 'Token is missing',
            code: 'AUTH_MISSING',
            userMessage: 'Please sign in to continue.',
        });
        return;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            if (process.env.NODE_ENV !== 'test') {
                console.warn('Auth Middleware: Invalid or expired token', error?.code ?? 'unknown');
            }
                res.status(401).json({
                    error: 'Invalid or expired token',
                    code: 'AUTH_INVALID',
                    userMessage: 'Your session has expired. Please sign in again.',
                });
            return;
        }

        req.user = user;
        next();
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Unexpected auth error:', err);
        }
        res.status(500).json({
            error: 'Authentication service failed',
            code: 'AUTH_UNAVAILABLE',
            userMessage: 'Authentication is temporarily unavailable. Please try again.',
        });
        return;
    }
};

export const optionalAuthenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
            req.user = user;
        }
        next();
    } catch {
        next();
    }
};

