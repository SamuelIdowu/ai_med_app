import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';
import { validatePushToken, validateUuidParam } from '../validation/index';

export const registerToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tokenResult = validatePushToken(req.body.token);

    if (!tokenResult.ok) {
      res.status(400).json({ error: tokenResult.error });
      return;
    }

    await notificationService.registerToken(userId, tokenResult.value);
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
    const idResult = validateUuidParam(req.params.id);

    if (!idResult.ok) {
      res.status(400).json({ error: idResult.error });
      return;
    }

    await notificationService.markAsRead(idResult.value, userId);
    res.json({ success: true });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to mark notification as read');
    }
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Test endpoint to trigger a notification (development/verification only —
// not mounted in production)
export const testNotification = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    const userId = (req as any).user.id;
    const { title, message, type } = req.body;

    if (
      typeof title !== 'string' ||
      title.length === 0 ||
      title.length > 120 ||
      typeof message !== 'string' ||
      message.length === 0 ||
      message.length > 2000
    ) {
      res.status(400).json({ error: 'Valid title and message are required' });
      return;
    }

    await notificationService.sendNotification(userId, title, message, type || 'info');
    res.json({ success: true, message: 'Notification sent' });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to send notification');
    }
    res.status(500).json({ error: 'Failed to send notification' });
  }
};
