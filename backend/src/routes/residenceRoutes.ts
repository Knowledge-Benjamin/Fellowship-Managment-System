import { Router } from 'express';
import {
    getResidences,
    createResidence,
    updateResidence,
    deleteResidence
} from '../controllers/residenceController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Public routes for registration dropdowns
router.get('/', asyncHandler(getResidences));

// Manager-only routes
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(createResidence));
router.patch('/:id', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(updateResidence));
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(deleteResidence));

export default router;
