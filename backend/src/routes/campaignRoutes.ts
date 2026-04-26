import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    submitContacts,
    updateContact,
    getCampaignContacts,
    exportCampaign,
    getMobilizationReport,
    getMobilizationMessages,
    sendMobilizationMessage,
    markMobilizationMessagesRead,
} from '../controllers/campaignController';

const router = Router();

// Campaign management
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), createCampaign);
router.get('/', protect, getCampaigns);

// Micro-Chats (Mobilization Contacts)
// IMPORTANT: These MUST be registered before '/:id' routes so Express does not
// swallow '/contacts/:id/...' by matching '/:id' first.
router.get('/contacts/:id/messages', protect, getMobilizationMessages);
router.post('/contacts/:id/messages', protect, sendMobilizationMessage);
router.patch('/contacts/:id/messages/read', protect, markMobilizationMessagesRead);

// /:id wildcard routes — must come AFTER all specific sub-paths
router.get('/:id/report', protect, authorize('FELLOWSHIP_MANAGER'), getMobilizationReport);
router.get('/:id', protect, getCampaignById);
router.patch('/:id', protect, authorize('FELLOWSHIP_MANAGER'), updateCampaign);
router.delete('/:id', protect, authorize('FELLOWSHIP_MANAGER'), deleteCampaign);

// Contact management
router.post('/:id/contacts', protect, submitContacts);
router.get('/:id/contacts', protect, authorize('FELLOWSHIP_MANAGER'), getCampaignContacts);
router.patch('/:id/contacts/:contactId', protect, updateContact); // Members update own contacts; FM updates any

// Export
router.get('/:id/export', protect, authorize('FELLOWSHIP_MANAGER'), exportCampaign);

export default router;
