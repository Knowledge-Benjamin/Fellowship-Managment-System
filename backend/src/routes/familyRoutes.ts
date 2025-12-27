import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import * as familyController from '../controllers/familyController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Family head dashboard - must be before /:id to avoid conflict
router.get('/my-family', familyController.getMyFamily);

// Family CRUD
router.get('/', authorize('FELLOWSHIP_MANAGER', 'REGIONAL_HEAD'), familyController.getAllFamilies);
router.post('/', authorize('FELLOWSHIP_MANAGER'), familyController.createFamily);
router.get('/:id', authorize('FELLOWSHIP_MANAGER', 'REGIONAL_HEAD'), familyController.getFamilyById);
router.put('/:id', authorize('FELLOWSHIP_MANAGER'), familyController.updateFamily);
router.delete('/:id', authorize('FELLOWSHIP_MANAGER'), familyController.deleteFamily);

// Family head management
router.post('/:id/assign-head', authorize('FELLOWSHIP_MANAGER'), familyController.assignFamilyHead);
router.delete('/:id/remove-head', authorize('FELLOWSHIP_MANAGER'), familyController.removeFamilyHead);

// Family member management
router.post('/:id/members', authorize('FELLOWSHIP_MANAGER', 'REGIONAL_HEAD'), familyController.addFamilyMember);
router.delete('/:id/members/:memberId', authorize('FELLOWSHIP_MANAGER', 'REGIONAL_HEAD'), familyController.removeFamilyMember);

export default router;
