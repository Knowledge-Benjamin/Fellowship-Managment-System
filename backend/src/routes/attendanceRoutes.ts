import { Router } from 'express';
import { checkIn, getServiceAttendance } from '../controllers/attendanceController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/check-in', asyncHandler(checkIn));
router.get('/service/:serviceId', asyncHandler(getServiceAttendance));

export default router;
