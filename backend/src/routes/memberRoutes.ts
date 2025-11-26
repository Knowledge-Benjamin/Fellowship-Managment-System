import { Router } from 'express';
import { getMembers } from '../controllers/memberController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Get all members (with optional search filter)
router.get('/', protect, getMembers);

export default router;
