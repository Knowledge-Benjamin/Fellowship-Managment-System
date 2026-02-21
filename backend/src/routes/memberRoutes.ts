import { Router } from 'express';
import { getMembers, createMember, getMemberAcademicStatus, softDeleteMember, bulkSoftDeleteMembers } from '../controllers/memberController';
import { getMyProfile, submitEditRequest, getEditRequests, reviewEditRequest, updateMyProfile } from '../controllers/profileEditController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Create new member (manager only)
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), createMember);

// Get all members (with optional search filter)
router.get('/', protect, getMembers);

// ── Own profile routes (any authenticated user) ─────────────────────────────
// Get own full profile (phone, region, family, pending edit request)
router.get('/me', protect, getMyProfile);

// Submit a profile edit request
router.post('/me/edit-request', protect, submitEditRequest);

// FM-only: direct self-edit (no approval workflow)
router.patch('/me', protect, authorize('FELLOWSHIP_MANAGER'), updateMyProfile);

// ── Edit request review routes (Regional Head or FM) ────────────────────────
// List edit requests (scoped to RH's region or all for FM)
router.get('/edit-requests', protect, getEditRequests);

// Approve or reject an edit request
router.patch('/edit-requests/:id', protect, reviewEditRequest);

// Get member's academic status
router.get('/:id/academic-status', protect, getMemberAcademicStatus);

// Soft delete member (manager only)
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), softDeleteMember);

// Bulk soft delete members (manager only)
router.post('/bulk-delete', protect, authorize('FELLOWSHIP_MANAGER'), bulkSoftDeleteMembers);

export default router;
