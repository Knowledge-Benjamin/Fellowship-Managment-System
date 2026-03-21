import express from 'express';
import { requestTransfer, getTransfers, reviewOrigin, reviewDestination } from '../controllers/transferController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/', requestTransfer);
router.get('/', getTransfers);
router.patch('/:id/origin', reviewOrigin);
router.patch('/:id/destination', reviewDestination);

export default router;
