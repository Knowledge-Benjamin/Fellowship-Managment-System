import express from 'express';
import { protect, authorize } from '../middleware/auth';
import * as leadershipController from '../controllers/leadershipController';

const router = express.Router();

// All routes require manager authorization
router.use(protect, authorize('FELLOWSHIP_MANAGER'));

// Organizational structure
router.get('/structure', leadershipController.getOrgStructure);
router.get('/stats', leadershipController.getLeadershipStats);

// Regional head management
router.post('/regional-head', leadershipController.assignRegionalHead);
router.delete('/regional-head/:regionId', leadershipController.removeRegionalHead);

export default router;
