import { Router } from 'express';
import * as ProcurementController from './procurement.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';

const router = Router();

router.use(protect, restrictTo('admin')); // Only Admin handles Procurement

router.post('/suppliers', ProcurementController.createSupplier);
router.get('/suppliers', protect, ProcurementController.getSuppliers);
router.post('/purchase', protect, ProcurementController.createPurchase);
router.post('/pay', ProcurementController.paySupplier);
router.post('/return', ProcurementController.returnItems);
// Financial History for a Supplier
router.get('/supplier-ledger/:id', protect, ProcurementController.getLedger);

export default router;