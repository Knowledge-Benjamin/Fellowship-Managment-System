import { Router } from 'express';
import { createMember, getMemberByQr } from '../controllers/memberController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', asyncHandler(createMember));
router.get('/qr/:qrCode', asyncHandler(getMemberByQr));

export default router;
