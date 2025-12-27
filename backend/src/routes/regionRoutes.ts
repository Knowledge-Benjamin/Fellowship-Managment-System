import { Router } from 'express';
import { getRegions, createRegion, deleteRegion, getMyRegion } from '../controllers/regionController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Regional Head dashboard - must be before /:id to avoid conflict
router.get('/my-region', getMyRegion);

// Get all regions (any authenticated user)
router.get('/', getRegions);

// Create region (manager only)
router.post('/', authorize('FELLOWSHIP_MANAGER'), createRegion);

// Delete region (manager only)
router.delete('/:id', authorize('FELLOWSHIP_MANAGER'), deleteRegion);

export default router;
