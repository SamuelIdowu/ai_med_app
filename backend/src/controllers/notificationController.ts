import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';

export const registerToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { token } = req.body;

        if (!token) {
            res.status(400).json({ error: 'Token is required' });
            return;
        }

        await notificationService.registerToken(userId, token);
        res.json({ success: true, message: 'Token registered successfully' });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to register notification token');
        }
        res.status(500).json({ error: 'Failed to register notification token' });
    }
};

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const notifications = await notificationService.getUserNotifications(userId);
        res.json(notifications);
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to fetch notifications');
        }
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        await notificationService.markAsRead(id, userId);
        res.json({ success: true });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to mark notification as read');
        }
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Test endpoint to trigger a notification (for development/verification)
export const testNotification = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, message, type } = req.body;

        await notificationService.sendNotification(userId, title, message, type || 'info');
        res.json({ success: true, message: 'Notification sent' });
    } catch (error: any) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to send notification');
        }
        res.status(500).json({ error: 'Failed to send notification' });
    }
};
