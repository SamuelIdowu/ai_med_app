import express from 'express';
import { authenticateUser } from '../middleware/auth';
import * as notificationController from '../controllers/notificationController';

const router = express.Router();

router.use(authenticateUser);

router.post('/register-token', notificationController.registerToken);
router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/test', notificationController.testNotification);

export default router;
