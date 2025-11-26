import { Router } from 'express';
import { getMembers, createMember } from '../controllers/memberController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Create new member (manager only)
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), createMember);

// Get all members (with optional search filter)
router.get('/', protect, getMembers);

export default router;
