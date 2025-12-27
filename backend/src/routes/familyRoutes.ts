import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import * as familyController from '../controllers/familyController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Family CRUD
router.post('/', authorize('FELLOWSHIP_MANAGER'), familyController.createFamily);
router.get('/', familyController.getAllFamilies); // FM sees all, RH filtered by region
router.get('/:id', familyController.getFamilyById);
router.put('/:id', familyController.updateFamily); // FM or RH of that region
router.delete('/:id', authorize('FELLOWSHIP_MANAGER'), familyController.deleteFamily);

// Family head management
router.post('/:id/assign-head', familyController.assignFamilyHead); // FM or RH
router.delete('/:id/remove-head', familyController.removeFamilyHead); // FM or RH

// Family member management
router.post('/:id/members', familyController.addFamilyMember); // FM or RH
router.delete('/:id/members/:memberId', familyController.removeFamilyMember); // FM or RH

export default router;
