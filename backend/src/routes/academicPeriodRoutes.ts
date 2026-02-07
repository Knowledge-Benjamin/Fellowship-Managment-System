import express from 'express';
import {
    getAllPeriods,
    getCurrentPeriod,
    createPeriod,
    updatePeriod,
    deletePeriod,
} from '../controllers/academicPeriodController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Get all academic periods
router.get('/', protect, getAllPeriods);

// Get current active period
router.get('/current', protect, getCurrentPeriod);

// Create new academic period (Manager only)
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), createPeriod);

// Update academic period (Manager only)
router.put('/:id', protect, authorize('FELLOWSHIP_MANAGER'), updatePeriod);

// Delete academic period (Manager only)
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), deletePeriod);

export default router;
