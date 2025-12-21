import { Router } from 'express';
import {
    getAllTags,
    createTag,
    deleteTag,
    updateTagRegistrationVisibility,
    getMembersWithTag,
    assignTagToMember,
    removeTagFromMember,
    bulkAssignTags,
    bulkRemoveTags,
    getMemberTagHistory,
} from '../controllers/tagController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();


// Tag management
router.get('/', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(getAllTags));
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(createTag));
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(deleteTag));
router.patch('/:id/registration-visibility', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(updateTagRegistrationVisibility));
router.get('/:id/members', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(getMembersWithTag));

// Member tag operations
// Member tag operations
router.post('/members/:id/tags', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(assignTagToMember));
router.delete('/members/:id/tags/:tagId', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(removeTagFromMember));
router.post('/members/bulk-assign', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(bulkAssignTags));
router.post('/members/bulk-remove', protect, authorize('FELLOWSHIP_MANAGER'), asyncHandler(bulkRemoveTags));

// Get member tag history - Allow self-access or manager access
router.get('/members/:id/history', protect, asyncHandler(getMemberTagHistory));

export default router;
