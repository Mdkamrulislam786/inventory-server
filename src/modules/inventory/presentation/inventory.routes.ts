import { Router } from 'express';
import * as InventoryController from './inventory.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';

const router = Router();

// Only Admin can add stock
router.post('/stock-in', protect, restrictTo('admin'), InventoryController.addStock);

// Both can process sales, but usually, this is the employee's main task
router.post('/sell', protect, InventoryController.sellItems);

export default router;