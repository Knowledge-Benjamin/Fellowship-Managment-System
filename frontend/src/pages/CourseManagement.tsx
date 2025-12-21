import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import { BookOpen, Plus, Trash2, Search, X, Loader2, Edit2, GraduationCap } from 'lucide-react';
import EmptyState from '../components/EmptyState';

interface Course {
    id: string;
    name: string;
    code: string;
    memberCount: number;
}

const CourseManagement = () => {
    const { showToast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/courses');
            setCourses(response.data);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            showToast('error', 'Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (course?: Course) => {
        if (course) {
            setEditingCourse(course);
            setFormData({ name: course.name, code: course.code });
        } else {
            setEditingCourse(null);
            setFormData({ name: '', code: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
        setFormData({ name: '', code: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) return;

        try {
            setSubmitting(true);
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase()
            };

            if (editingCourse) {
                const response = await api.patch(`/courses/${editingCourse.id}`, payload);
                setCourses(courses.map(c => c.id === editingCourse.id ? { ...response.data, memberCount: c.memberCount } : c));
                showToast('success', 'Course updated successfully');
            } else {
                const response = await api.post('/courses', payload);
                setCourses([...courses, { ...response.data, memberCount: 0 }]);
                showToast('success', 'Course created successfully');
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Failed to save course:', error);
            showToast('error', error.response?.data?.error || 'Failed to save course');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (course: Course) => {
        if (!confirm(`Are you sure you want to delete "${course.code} - ${course.name}"?`)) return;

        try {
            await api.delete(`/courses/${course.id}`);
            setCourses(courses.filter(c => c.id !== course.id));
            showToast('success', 'Course deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete course:', error);
            showToast('error', error.response?.data?.error || 'Failed to delete course');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                            Course Management
                        </h1>
                        <p className="text-slate-400 mt-2">Manage university courses and codes</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 bg-teal-600 hover:bg-teal-700 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-teal-500/30"
                    >
                        <Plus size={20} />
                        Add Course
                    </button>
                </div>

                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search courses by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#151d30] rounded-xl border border-slate-800 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title={searchQuery ? "No courses found" : "No courses yet"}
                        description={searchQuery ? "Try a different search term" : "Add courses to the system for student registration"}
                        action={!searchQuery ? { label: "Add Course", onClick: () => handleOpenModal() } : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <div key={course.id} className="glass-card p-6 group hover:border-teal-500/50 transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                                                {course.code}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(course)}
                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 h-14">
                                    {course.name}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-slate-400 border-t border-slate-800 pt-4 mt-2">
                                    <GraduationCap size={16} />
                                    <span>{course.memberCount} students enrolled</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-[#151d30] rounded-2xl p-8 max-w-md w-full border border-slate-800 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingCourse ? 'Edit Course' : 'Add New Course'}
                                </h2>
                                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Course Code <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. BSCS"
                                        className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white font-mono placeholder-slate-600 transition-colors"
                                        maxLength={10}
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Short identifier for the course</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Course Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Bachelor of Science in Computer Science"
                                        className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-600 transition-colors"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded-xl font-medium transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            editingCourse ? 'Update Course' : 'Create Course'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseManagement;
