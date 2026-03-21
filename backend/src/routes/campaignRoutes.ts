import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    submitContacts,
    updateContact,
    getCampaignContacts,
    exportCampaign,
} from '../controllers/campaignController';

const router = Router();

// Campaign management
router.post('/', protect, authorize('FELLOWSHIP_MANAGER'), createCampaign);
router.get('/', protect, getCampaigns);
router.get('/:id', protect, getCampaignById);
router.patch('/:id', protect, authorize('FELLOWSHIP_MANAGER'), updateCampaign);

// Contact management
router.post('/:id/contacts', protect, submitContacts);
router.get('/:id/contacts', protect, authorize('FELLOWSHIP_MANAGER'), getCampaignContacts);
router.patch('/:id/contacts/:contactId', protect, authorize('FELLOWSHIP_MANAGER'), updateContact);

// Export
router.get('/:id/export', protect, authorize('FELLOWSHIP_MANAGER'), exportCampaign);

export default router;
