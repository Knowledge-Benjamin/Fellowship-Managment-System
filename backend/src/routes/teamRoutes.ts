import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import * as teamController from '../controllers/teamController';

const router = express.Router();
router.use(protect);

// Team leader dashboard - must be before /:id to avoid conflict
router.get('/my-team', teamController.getMyTeam);

// Team member access - finds team where user is a member
router.get('/my-team-member', teamController.getMyTeamAsMember);

// Team CRUD (Fellowship Manager only)
router.post('/', authorize('FELLOWSHIP_MANAGER'), teamController.createTeam);
router.get('/', authorize('FELLOWSHIP_MANAGER'), teamController.getAllTeams);
router.get('/:id', teamController.getTeamById); // Allow all authenticated users to view
router.put('/:id', authorize('FELLOWSHIP_MANAGER'), teamController.updateTeam);
router.delete('/:id', authorize('FELLOWSHIP_MANAGER'), teamController.deleteTeam);

// Team member management
router.post('/:id/members', authorize('FELLOWSHIP_MANAGER'), teamController.addTeamMember);
router.delete('/:id/members/:memberId', authorize('FELLOWSHIP_MANAGER'), teamController.removeTeamMember);

// Team leader management
router.post('/:id/assign-leader', authorize('FELLOWSHIP_MANAGER'), teamController.assignTeamLeader);
router.delete('/:id/remove-leader', authorize('FELLOWSHIP_MANAGER'), teamController.removeTeamLeader);

export default router;
