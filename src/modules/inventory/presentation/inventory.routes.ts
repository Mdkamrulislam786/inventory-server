import { Router } from 'express';
import * as InventoryController from './inventory.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';
import { setTenantContext } from "../../../core/middleware/tenant.middleware";

const router = Router();

router.use(protect, setTenantContext);
// Only Admin can add stock
router.post("/stock-in", restrictTo("admin"), InventoryController.addStock);
// Both can process sales, but usually, this is the employee's main task
router.post("/sell", InventoryController.sellItems);
router.get("/status/:medicineId", InventoryController.getStockStatus);
router.get("/list", InventoryController.getStockList);
router.get("/search", InventoryController.getSearchForSale);

export default router;