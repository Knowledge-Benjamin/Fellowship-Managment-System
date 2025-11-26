import { Router } from 'express';
import { checkIn, guestCheckIn, getEventAttendance } from '../controllers/attendanceController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';
import { checkInPermission } from '../middleware/checkInPermission';

const router = Router();

// Member check-in: Managers and assigned volunteers
router.post('/check-in', protect, checkInPermission, asyncHandler(checkIn));

// Guest check-in: Managers only
router.post('/guest-check-in', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(guestCheckIn));

// View attendance: Managers only
router.get('/event/:eventId', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(getEventAttendance));

export default router;
