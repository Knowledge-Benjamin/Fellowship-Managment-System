import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import * as familyController from '../controllers/familyController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Family head dashboard - must be before /:id to avoid conflict
router.get('/my-family', familyController.getMyFamily);

// Family member access - finds family where user is a member
router.get('/my-family-member', familyController.getMyFamilyAsMember);

// Family CRUD - FM only (Regional Heads use controller-level filtering)
router.get('/', authorize('FELLOWSHIP_MANAGER'), familyController.getAllFamilies);
// Public route for registration - fetch families by region
router.get('/region/:regionId', familyController.getFamiliesByRegion);
router.post('/', authorize('FELLOWSHIP_MANAGER'), familyController.createFamily);
router.get('/:id', familyController.getFamilyById); // Allow all authenticated users to view
router.put('/:id', authorize('FELLOWSHIP_MANAGER'), familyController.updateFamily);
router.delete('/:id', authorize('FELLOWSHIP_MANAGER'), familyController.deleteFamily);

// Family head management
router.post('/:id/assign-head', authorize('FELLOWSHIP_MANAGER'), familyController.assignFamilyHead);
router.delete('/:id/remove-head', authorize('FELLOWSHIP_MANAGER'), familyController.removeFamilyHead);

// Family member management - FM only
router.post('/:id/members', authorize('FELLOWSHIP_MANAGER'), familyController.addFamilyMember);
router.delete('/:id/members/:memberId', authorize('FELLOWSHIP_MANAGER'), familyController.removeFamilyMember);

export default router;
