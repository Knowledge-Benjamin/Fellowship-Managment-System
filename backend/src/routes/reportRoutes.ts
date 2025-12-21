import { Router } from 'express';
import {
    getEventReport,
    getComparativeReport,
    getDashboardStats,
    getCustomReport,
    exportEventReportPDF,
    exportEventReportExcel,
    exportCustomReportPDF,
    exportCustomReportExcel
} from '../controllers/reportController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// All report routes require authentication and manager role
router.use(protect, authorize('FELLOWSHIP_MANAGER'));

router.get('/dashboard', asyncHandler(getDashboardStats));
router.get('/custom', asyncHandler(getCustomReport));
router.get('/custom/export/pdf', asyncHandler(exportCustomReportPDF));
router.get('/custom/export/excel', asyncHandler(exportCustomReportExcel));
router.get('/:eventId', asyncHandler(getEventReport));
router.get('/:eventId/compare', asyncHandler(getComparativeReport));
router.get('/:eventId/export/pdf', asyncHandler(exportEventReportPDF));
router.get('/:eventId/export/excel', asyncHandler(exportEventReportExcel));

export default router;
