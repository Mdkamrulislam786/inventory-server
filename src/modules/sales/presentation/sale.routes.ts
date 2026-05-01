import { Router } from 'express';
import * as SaleController from './sale.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';

const router = Router();

router.post('/checkout', protect, SaleController.checkout);
router.get('/report', protect, restrictTo('admin'), SaleController.getHistory);

export default router;