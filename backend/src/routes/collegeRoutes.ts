import { Router } from 'express';
import {
    getColleges,
    createCollege,
    updateCollege,
    deleteCollege
} from '../controllers/collegeController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Public routes (e.g. registration dropdowns)
router.get('/', asyncHandler(getColleges));

// Manager-only routes
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(createCollege));
router.patch('/:id', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(updateCollege));
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(deleteCollege));

export default router;
