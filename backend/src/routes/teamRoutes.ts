import express from 'express';
import { protect, authorize } from '../middleware/auth';
import * as teamController from '../controllers/teamController';

const router = express.Router();

// All routes require manager authorization
router.use(protect, authorize('FELLOWSHIP_MANAGER'));

// Ministry team routes
router.post('/', teamController.createTeam);
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

// Team member management
router.post('/:id/members', teamController.addTeamMember);
router.delete('/:id/members/:memberId', teamController.removeTeamMember);

export default router;
