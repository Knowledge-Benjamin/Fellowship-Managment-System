import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
    createToken,
    listTokens,
    revokeToken,
    validateToken,
    submitSelfReg,
    listPendingMembers,
    updatePendingMember,
    approvePendingMember,
    rejectPendingMember,
    getPendingStats,
} from '../controllers/selfRegController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// Public: stricter rate limit for spam protection (5 req / 10 min per IP)
const selfRegLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { error: 'Too many submissions from this IP. Please try again in 10 minutes.' },
});

// ── Public endpoints (no auth) ───────────────────────────────────────────────
router.get('/register/validate', validateToken);
router.post('/register', selfRegLimiter, submitSelfReg);

// ── FM-only: Token management ─────────────────────────────────────────────────
router.post('/reg-tokens', protect, authorize('FELLOWSHIP_MANAGER'), createToken);
router.get('/reg-tokens', protect, authorize('FELLOWSHIP_MANAGER'), listTokens);
router.patch('/reg-tokens/:id/revoke', protect, authorize('FELLOWSHIP_MANAGER'), revokeToken);

// ── FM-only: Pending member approval queue ────────────────────────────────────
router.get('/pending-members/stats', protect, authorize('FELLOWSHIP_MANAGER'), getPendingStats);
router.get('/pending-members', protect, authorize('FELLOWSHIP_MANAGER'), listPendingMembers);
router.patch('/pending-members/:id', protect, authorize('FELLOWSHIP_MANAGER'), updatePendingMember);
router.post('/pending-members/:id/approve', protect, authorize('FELLOWSHIP_MANAGER'), approvePendingMember);
router.post('/pending-members/:id/reject', protect, authorize('FELLOWSHIP_MANAGER'), rejectPendingMember);

export default router;
