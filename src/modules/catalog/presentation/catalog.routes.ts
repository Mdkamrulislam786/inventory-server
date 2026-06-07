import { Router } from "express";
import * as CatalogController from "./catalog.controller";
import { protect, restrictTo } from "../../../core/middleware/auth.middleware";

const router = Router();

// Employee route: These are used daily for searching and organizing
router.get("/search", protect, CatalogController.getMedicines);
router.post("/match-shelf", protect, CatalogController.matchShelf);

 // Master data setup (Manufacturers, Shelves, and Medicines)
router.use(...[protect, restrictTo("admin")]);
router.post("/medicine", CatalogController.createMedicine);
router.post("/manufacturer", CatalogController.createManufacturer);
router.post("/shelf", CatalogController.createShelf);

export default router;
