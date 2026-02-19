import { Router } from 'express';
import { getMembers, createMember, getMemberAcademicStatus, softDeleteMember, bulkSoftDeleteMembers } from '../controllers/memberController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Create new member (manager only)
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), createMember);

// Get all members (with optional search filter)
router.get('/', protect, getMembers);

// Get member's academic status
router.get('/:id/academic-status', protect, getMemberAcademicStatus);

// Soft delete member (manager only)
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), softDeleteMember);

// Bulk soft delete members (manager only)
router.post('/bulk-delete', protect, authorize('FELLOWSHIP_MANAGER'), bulkSoftDeleteMembers);

export default router;
