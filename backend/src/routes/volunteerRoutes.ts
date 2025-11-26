import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    assignVolunteer,
    removeVolunteer,
    getEventVolunteers,
    checkPermission,
} from '../controllers/volunteerController';

const router = express.Router();

// Check permission (accessible to any authenticated user to check their own status)
router.get('/:eventId/check-permission', protect, checkPermission);

// Manager only routes
router.post('/:eventId/volunteers', protect, authorize('FELLOWSHIP_MANAGER'), assignVolunteer);
router.delete('/:eventId/volunteers/:memberId', protect, authorize('FELLOWSHIP_MANAGER'), removeVolunteer);
router.get('/:eventId/volunteers', protect, authorize('FELLOWSHIP_MANAGER'), getEventVolunteers);

export default router;
