import { Router } from 'express';
import {
    getAllTags,
    createTag,
    deleteTag,
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

// All tag routes require manager role
router.use(protect, authorize('FELLOWSHIP_MANAGER'));

// Tag management
router.get('/', asyncHandler(getAllTags));
router.post('/', asyncHandler(createTag));
router.delete('/:id', asyncHandler(deleteTag));
router.get('/:id/members', asyncHandler(getMembersWithTag));

// Member tag operations
router.post('/members/:id/tags', asyncHandler(assignTagToMember));
router.delete('/members/:id/tags/:tagId', asyncHandler(removeTagFromMember));
router.post('/members/bulk-assign', asyncHandler(bulkAssignTags));
router.post('/members/bulk-remove', asyncHandler(bulkRemoveTags));
router.get('/members/:id/history', asyncHandler(getMemberTagHistory));

export default router;
