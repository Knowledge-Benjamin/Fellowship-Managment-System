import { Router } from 'express';
import {
    getEventReport,
    getComparativeReport,
    getDashboardStats,
    getCustomReport,
    exportEventReportPDF,
    exportEventReportExcel,
    exportCustomReportPDF,
    exportCustomReportExcel,
    publishEventReport,
    unpublishEventReport,
    getReportStatus,
    getPublishedReports
} from '../controllers/reportController';
import { asyncHandler } from '../utils/asyncHandler';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Dashboard and reports accessible to all authenticated users (scoped by role)
router.get('/published', asyncHandler(getPublishedReports));
router.get('/dashboard', asyncHandler(getDashboardStats));
router.get('/custom', asyncHandler(getCustomReport));
router.get('/custom/export/pdf', asyncHandler(exportCustomReportPDF));
router.get('/custom/export/excel', asyncHandler(exportCustomReportExcel));
router.get('/:eventId', asyncHandler(getEventReport));
router.get('/:eventId/compare', asyncHandler(getComparativeReport));
router.get('/:eventId/export/pdf', asyncHandler(exportEventReportPDF));
router.get('/:eventId/export/excel', asyncHandler(exportEventReportExcel));
router.get('/:eventId/status', asyncHandler(getReportStatus));

// Publishing controls - Fellowship Managers only
router.post('/:eventId/publish', authorize('FELLOWSHIP_MANAGER'), asyncHandler(publishEventReport));
router.post('/:eventId/unpublish', authorize('FELLOWSHIP_MANAGER'), asyncHandler(unpublishEventReport));

export default router;
