import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { requestTransfer, getTransfers, reviewOrigin, reviewDestination } from '../controllers/familyTransferController';

const router = Router();

router.use(protect);

router.post('/', requestTransfer);
router.get('/', getTransfers);
router.patch('/:id/origin', reviewOrigin);
router.patch('/:id/destination', reviewDestination);

export default router;
