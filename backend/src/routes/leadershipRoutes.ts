import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import * as leadershipController from '../controllers/leadershipController';

const router = express.Router();

router.use(protect);

// Org structure - accessible to all authenticated users (FM sees all, RH sees their region)
router.get('/structure', leadershipController.getOrgStructure);

// Stats - FM only for now
router.get('/stats', authorize('FELLOWSHIP_MANAGER'), leadershipController.getLeadershipStats);

// Regional head management - FM only
router.post('/regional-heads/assign', authorize('FELLOWSHIP_MANAGER'), leadershipController.assignRegionalHead);
router.delete('/regional-heads/:regionId/remove', authorize('FELLOWSHIP_MANAGER'), leadershipController.removeRegionalHead);

export default router;
