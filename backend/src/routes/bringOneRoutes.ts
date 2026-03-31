import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    createBringOneCampaign,
    getBringOneCampaigns,
    updateBringOneCampaign,
    deleteBringOneCampaign,
    submitPledges,
    getMyPledges,
    updatePledge,
    deletePledge,
    getEventPledges,
    exportEventPledges,
    getBringOneReport,
    getBringOneMessages,
    sendBringOneMessage,
    markBringOneMessagesRead,
} from '../controllers/bringOneController';

const router = Router();

// Campaign config (FM only)
router.post('/campaigns', protect, authorize('FELLOWSHIP_MANAGER'), createBringOneCampaign);
router.get('/campaigns', protect, getBringOneCampaigns);
router.get('/campaigns/:id/report', protect, authorize('FELLOWSHIP_MANAGER'), getBringOneReport);
router.patch('/campaigns/:id', protect, authorize('FELLOWSHIP_MANAGER'), updateBringOneCampaign);
router.delete('/campaigns/:id', protect, authorize('FELLOWSHIP_MANAGER'), deleteBringOneCampaign);

// Pledge management (any authenticated member)
router.post('/pledges', protect, submitPledges);
router.get('/my-pledges', protect, getMyPledges);
router.patch('/pledges/:id', protect, updatePledge);
router.delete('/pledges/:id', protect, deletePledge);

// Micro-Chats (Pledged Contacts)
router.get('/pledges/:id/messages', protect, getBringOneMessages);
router.post('/pledges/:id/messages', protect, sendBringOneMessage);
router.patch('/pledges/:id/messages/read', protect, markBringOneMessagesRead);

// FM event dashboard
router.get('/event/:eventId', protect, authorize('FELLOWSHIP_MANAGER'), getEventPledges);
router.get('/event/:eventId/export', protect, authorize('FELLOWSHIP_MANAGER'), exportEventPledges);

export default router;
