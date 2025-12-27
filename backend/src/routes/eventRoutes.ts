import { Router } from 'express';
import {
    createEvent,
    getEvents,
    getActiveEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    toggleEventActive,
    toggleGuestCheckin,
} from '../controllers/eventController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Public routes (authenticated users)
router.get('/', asyncHandler(getEvents));
router.get('/active', asyncHandler(getActiveEvents));
router.get('/:id', asyncHandler(getEventById));

// Manager-only routes
router.post('/', authorize('FELLOWSHIP_MANAGER'), asyncHandler(createEvent));
router.put('/:id', authorize('FELLOWSHIP_MANAGER'), asyncHandler(updateEvent));
router.delete('/:id', authorize('FELLOWSHIP_MANAGER'), asyncHandler(deleteEvent));
router.patch('/:id/toggle-active', authorize('FELLOWSHIP_MANAGER'), asyncHandler(toggleEventActive));
router.patch('/:id/toggle-guest-checkin', authorize('FELLOWSHIP_MANAGER'), asyncHandler(toggleGuestCheckin));

export default router;

