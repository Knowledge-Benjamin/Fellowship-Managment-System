import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { getAllCourses, createCourse, updateCourse, deleteCourse } from '../controllers/courseController';

const router = Router();

// Public route for fetching courses (needed for registration)
router.get('/', getAllCourses);

// Protected routes for management
router.use(protect, authorize('FELLOWSHIP_MANAGER'));
router.post('/', createCourse);
router.patch('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
