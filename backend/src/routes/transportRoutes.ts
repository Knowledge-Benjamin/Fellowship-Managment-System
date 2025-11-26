import { Router } from 'express';
import { bookTransport, getTransportList } from '../controllers/transportController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All transport routes require authentication
router.use(protect);

router.post('/book', asyncHandler(bookTransport));
router.get('/event/:eventId', asyncHandler(getTransportList));

export default router;
