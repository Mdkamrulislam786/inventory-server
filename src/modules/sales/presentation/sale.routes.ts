import { Router } from "express";
import * as SaleController from "./sale.controller";
import { protect, restrictTo } from "../../../core/middleware/auth.middleware";
import { setTenantContext } from "../../../core/middleware/tenant.middleware";

const router = Router();

router.use(protect, setTenantContext);
router.post("/checkout", SaleController.checkout);
router.get("/history", restrictTo("admin"), SaleController.getSalesHistory);
router.get("/:id", SaleController.getSaleDetail);

export default router;
