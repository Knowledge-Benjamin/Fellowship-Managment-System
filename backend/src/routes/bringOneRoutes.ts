import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    createBringOneCampaign,
    getBringOneCampaigns,
    updateBringOneCampaign,
    deleteBringOneCampaign,
    submitPledges,
    getMyPledges,
    deletePledge,
    getEventPledges,
    exportEventPledges,
} from '../controllers/bringOneController';

const router = Router();

// Campaign config (FM only)
router.post('/campaigns', protect, authorize('FELLOWSHIP_MANAGER'), createBringOneCampaign);
router.get('/campaigns', protect, getBringOneCampaigns);
router.patch('/campaigns/:id', protect, authorize('FELLOWSHIP_MANAGER'), updateBringOneCampaign);
router.delete('/campaigns/:id', protect, authorize('FELLOWSHIP_MANAGER'), deleteBringOneCampaign);

// Pledge management (any authenticated member)
router.post('/pledges', protect, submitPledges);
router.get('/my-pledges', protect, getMyPledges);
router.delete('/pledges/:id', protect, deletePledge);

// FM event dashboard
router.get('/event/:eventId', protect, authorize('FELLOWSHIP_MANAGER'), getEventPledges);
router.get('/event/:eventId/export', protect, authorize('FELLOWSHIP_MANAGER'), exportEventPledges);

export default router;
