import { Router } from 'express';
import * as SaleController from './sale.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';

const router = Router();

router.post('/checkout', protect, SaleController.checkout);
router.get('/history', protect, restrictTo('admin'), SaleController.getSalesHistory); // Broad history
router.get('/:id', protect, SaleController.getSaleDetail); // Specific invoice

export default router;