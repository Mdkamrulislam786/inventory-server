import { Router } from 'express';
import * as authController from './user.controller';
import { protect, restrictTo } from "../../../core/middleware/auth.middleware";
import { setTenantContext } from "../../../core/middleware/tenant.middleware";

const router = Router();

router.post("/register-admin", authController.registerAdmin);
// router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.use(protect, setTenantContext);
router.post("/add-employee", restrictTo("admin"), authController.addEmployee);

export default router;