import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    getEmailQueue,
    getEmailStats,
    previewEmail,
    retryEmail,
    deleteEmail,
    composeEmail,
    getRecipientOptions,
    getEmailSettings,
    updateEmailSettings,
} from '../controllers/emailController';

const router = Router();

// All email management routes require FM role
router.use(protect, authorize('FELLOWSHIP_MANAGER'));

router.get('/queue', getEmailQueue);
router.get('/stats', getEmailStats);
router.get('/queue/:id/preview', previewEmail);
router.post('/queue/:id/retry', retryEmail);
router.delete('/queue/:id', deleteEmail);

router.post('/compose', composeEmail);
router.get('/recipients', getRecipientOptions);

router.get('/settings', getEmailSettings);
router.put('/settings', updateEmailSettings);

export default router;
