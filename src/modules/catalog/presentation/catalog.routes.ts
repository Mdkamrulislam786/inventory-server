import { Router } from "express";
import * as CatalogController from "./catalog.controller";
import { protect, restrictTo } from "../../../core/middleware/auth.middleware";
import { setTenantContext } from "../../../core/middleware/tenant.middleware"; // Import this!

const router = Router();

router.use(protect, setTenantContext);
router.get("/search", CatalogController.getMedicines);
router.post("/match-shelf", CatalogController.matchShelf);

router.use(restrictTo("admin")); 
router.post("/medicine", CatalogController.createMedicine);
router.post("/manufacturer", CatalogController.createManufacturer);
router.post("/shelf", CatalogController.createShelf);

export default router;