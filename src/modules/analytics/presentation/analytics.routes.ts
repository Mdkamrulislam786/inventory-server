import { Router } from 'express';
import * as AnalyticsController from './analytics.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';

const router = Router();

// Stats and Profit are usually Admin only
router.get('/daily-profit', protect, restrictTo('admin'), AnalyticsController.getDailyStats);
// Expiry and Stock alerts can be viewed by both to help with inventory management
router.get('/expiry-alerts', protect, AnalyticsController.getExpiryReports);
router.get('/low-stock', protect, AnalyticsController.getStockAlerts);

export default router;