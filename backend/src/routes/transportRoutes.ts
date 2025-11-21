import { Router } from 'express';
import { bookTransport, getTransportList } from '../controllers/transportController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/book', asyncHandler(bookTransport));
router.get('/service/:serviceId', asyncHandler(getTransportList));

export default router;
