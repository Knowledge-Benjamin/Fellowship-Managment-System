import { Router } from 'express';
import {
    createSalvation,
    getAllSalvations,
    getSalvationById,
    updateSalvation,
    deleteSalvation,
    getSalvationStats,
} from '../controllers/salvationController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// All salvation routes require authentication and manager role
router.use(protect, authorize('FELLOWSHIP_MANAGER'));

// Statistics endpoint (before :id to avoid route conflict)
router.get('/stats', asyncHandler(getSalvationStats));

// CRUD operations
router.post('/', asyncHandler(createSalvation));
router.get('/', asyncHandler(getAllSalvations));
router.get('/:id', asyncHandler(getSalvationById));
router.put('/:id', asyncHandler(updateSalvation));
router.delete('/:id', asyncHandler(deleteSalvation));

export default router;
