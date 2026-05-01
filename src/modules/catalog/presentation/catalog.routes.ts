import { Router } from 'express';
import * as CatalogController from './catalog.controller';
import { protect, restrictTo } from '../../../core/middleware/auth.middleware';

const router = Router();

// Public/Employee Search
router.get('/search', protect, CatalogController.getMedicines);

// OCR Shelf Match
router.post('/match-shelf', protect, CatalogController.matchShelf);

// Admin Only: Setup Catalog
router.post('/medicine', protect, restrictTo('admin'), CatalogController.postMedicine);

export default router;