import React, { useState, useEffect } from 'react';
import type { E164Number } from 'libphonenumber-js/core';
import api from '../api';
import { useToast } from './ToastProvider';
import {
    X, Loader2, Send, User, Mail, Phone, Building,
    BookOpen, GraduationCap, MapPin, Plus, AlertCircle,
} from 'lucide-react';
import PhoneInput from './PhoneInput';
import CustomSelect from './CustomSelect';
import AddCollegeModal from './AddCollegeModal';
import AddCourseModal from './AddCourseModal';
import AddResidenceModal from './AddResidenceModal';
import '../styles/phoneInput.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface College { id: string; name: string; code?: string; }
interface Course { id: string; name: string; durationYears?: number; collegeId?: string; }
interface Residence { id: string; name: string; type: string; }

interface CurrentProfile {
    fullName: string;
    email: string;
    phoneNumber: string;
    hostelName: string | null;
    region: { id: string; name: string } | null;
    residence: { id: string; name: string; type: string } | null;
    academic: {
        courseId: string | null;
        courseName: string | null;
        collegeId: string | null;
        collegeName: string | null;
        durationYears: number | null;
        currentYear: number | null;
        currentSemester: number | null;
    } | null;
}

interface EditRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentProfile: CurrentProfile;
}

// ── Field labels for display ────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
    fullName: 'Full Name',
    email: 'Email Address',
    phoneNumber: 'Phone Number',
    collegeId: 'College',
    courseId: 'Course',
    initialYearOfStudy: 'Year of Study',
    initialSemester: 'Semester',
    residenceId: 'Hall / Residence',
    hostelName: 'Hostel Name',
};

// ── Component ─────────────────────────────────────────────────────────────────

const EditRequestModal: React.FC<EditRequestModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    currentProfile,
}) => {
    const { showToast } = useToast();

    // Reference data
    const [colleges, setColleges] = useState<College[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [residences, setResidences] = useState<Residence[]>([]);

    // Sub-modals for adding new data
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
    const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);

    // Form state — pre-populated from currentProfile
    const [formData, setFormData] = useState({
        fullName: currentProfile.fullName,
        email: currentProfile.email,
        phoneNumber: (currentProfile.phoneNumber || '') as E164Number | '',
        collegeId: currentProfile.academic?.collegeId || '',
        courseId: currentProfile.academic?.courseId || '',
        initialYearOfStudy: currentProfile.academic?.currentYear || 1,
        initialSemester: currentProfile.academic?.currentSemester || 1,
        residenceId: currentProfile.residence?.id || '',
        hostelName: currentProfile.hostelName || '',
    });

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Determine region type for residence fields
    const regionName = currentProfile.region?.name?.toUpperCase() ?? '';
    const isCentralRegion = regionName === 'CENTRAL';
    const isNonResident = regionName === 'NON-RESIDENT';
    const showResidenceField = isCentralRegion;
    const showHostelField = !isCentralRegion && !isNonResident;

    // ── Load reference data ───────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([
            api.get('/colleges'),
            api.get('/residences'),
        ]).then(([collegesRes, residencesRes]) => {
            setColleges(collegesRes.data);
            setResidences(residencesRes.data);
        }).catch(() => {
            showToast('error', 'Failed to load form data.');
        }).finally(() => setLoadingData(false));
    }, [isOpen]);

    // Load courses by college when college changes
    useEffect(() => {
        if (!formData.collegeId) {
            setCourses([]);
            return;
        }
        api.get(`/courses?collegeId=${formData.collegeId}`)
            .then(res => setCourses(res.data))
            .catch(() => showToast('error', 'Failed to load courses.'));
    }, [formData.collegeId]);

    // Reset pre-populate whenever the modal opens with updated profile data
    useEffect(() => {
        if (isOpen) {
            setFormData({
                fullName: currentProfile.fullName,
                email: currentProfile.email,
                phoneNumber: (currentProfile.phoneNumber || '') as E164Number | '',
                collegeId: currentProfile.academic?.collegeId || '',
                courseId: currentProfile.academic?.courseId || '',
                initialYearOfStudy: currentProfile.academic?.currentYear || 1,
                initialSemester: currentProfile.academic?.currentSemester || 1,
                residenceId: currentProfile.residence?.id || '',
                hostelName: currentProfile.hostelName || '',
            });
            setReason('');
        }
    }, [isOpen, currentProfile]);

    // ── Derive changed fields (diff) ──────────────────────────────────────────

    const getChangedFields = () => {
        const original: Record<string, string> = {
            fullName: currentProfile.fullName,
            email: currentProfile.email,
            phoneNumber: currentProfile.phoneNumber || '',
            collegeId: currentProfile.academic?.collegeId || '',
            courseId: currentProfile.academic?.courseId || '',
            initialYearOfStudy: String(currentProfile.academic?.currentYear || ''),
            initialSemester: String(currentProfile.academic?.currentSemester || ''),
            residenceId: currentProfile.residence?.id || '',
            hostelName: currentProfile.hostelName || '',
        };

        const current: Record<string, string> = {
            fullName: formData.fullName,
            email: formData.email,
            phoneNumber: String(formData.phoneNumber || ''),
            collegeId: formData.collegeId,
            courseId: formData.courseId,
            initialYearOfStudy: String(formData.initialYearOfStudy),
            initialSemester: String(formData.initialSemester),
            residenceId: formData.residenceId,
            hostelName: formData.hostelName,
        };

        return Object.entries(current)
            .filter(([key, val]) => val !== original[key] && val !== '')
            .map(([field, newValue]) => ({ field, newValue }));
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const changes = getChangedFields();
        if (changes.length === 0) {
            showToast('info', 'No changes detected. Please modify at least one field.');
            return;
        }
        if (!reason.trim() || reason.trim().length < 10) {
            showToast('error', 'Please enter a reason (at least 10 characters).');
            return;
        }

        setLoading(true);
        try {
            await api.post('/members/me/edit-request', {
                changes,
                reason: reason.trim(),
            });
            showToast('success', 'Edit request submitted! Your Regional Head will review it.');
            onSuccess();
            onClose();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to submit edit request.';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };

    // ── College/Course/Residence add handlers ─────────────────────────────────

    const handleCollegeChange = (value: string) => {
        if (value === 'NEW_COLLEGE') {
            setIsCollegeModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, collegeId: value, courseId: '' }));
        }
    };

    const handleCourseChange = (value: string) => {
        if (value === 'NEW_COURSE') {
            setIsCourseModalOpen(true);
        } else {
            const selected = courses.find(c => c.id === value);
            let year = formData.initialYearOfStudy;
            if (selected?.durationYears && year > selected.durationYears) {
                year = 1;
            }
            setFormData(prev => ({ ...prev, courseId: value, initialYearOfStudy: year }));
        }
    };

    const handleCollegeSaved = (college: College) => {
        setColleges(prev => [...prev, college].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, collegeId: college.id, courseId: '' }));
    };

    const handleCourseSaved = (course: Course) => {
        setCourses(prev => [...prev, course].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, courseId: course.id }));
    };

    const handleResidenceSaved = (residence: Residence) => {
        setResidences(prev => [...prev, residence].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, residenceId: residence.id }));
    };

    // ── Year options (dynamic from selected course) ───────────────────────────

    const selectedCourse = courses.find(c => c.id === formData.courseId);
    const maxYears = selectedCourse?.durationYears || currentProfile.academic?.durationYears || 5;

    if (!isOpen) return null;

    const changedFields = getChangedFields();

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none" />

                    {/* Header */}
                    <div className="relative flex items-center justify-between p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#e9f5e1', color: '#48A111', outline: '1.5px solid #c5e3b0' }}>
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Request Profile Edit</h2>
                                <p className="text-sm text-slate-500">Changes require Regional Head approval</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {loadingData ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="relative p-6 space-y-6">

                            {/* ── Personal Information ────────────────────── */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Full Name */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Full Name</label>
                                        <input
                                            type="text"
                                            className="input transition-smooth"
                                            value={formData.fullName}
                                            onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                            placeholder="Your full name"
                                        />
                                    </div>
                                    {/* Email */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Mail className="w-4 h-4" style={{ color: '#48A111' }} />
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            className="input transition-smooth"
                                            value={formData.email}
                                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                    {/* Phone */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Phone className="w-4 h-4" style={{ color: '#48A111' }} />
                                            Phone Number
                                        </label>
                                        <PhoneInput
                                            value={formData.phoneNumber as E164Number | undefined}
                                            onChange={(val) => setFormData(prev => ({ ...prev, phoneNumber: val || '' }))}
                                            placeholder="700 123 456"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Academic Information ─────────────────────── */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" /> Academic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* College */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Building className="w-4 h-4" style={{ color: '#48A111' }} />
                                                College
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsCollegeModalOpen(true)}
                                                className="text-xs font-semibold flex items-center gap-1 hover:opacity-75 transition-opacity"
                                                style={{ color: '#48A111' }}
                                            >
                                                <Plus size={12} /> Add New
                                            </button>
                                        </label>
                                        <CustomSelect
                                            value={formData.collegeId}
                                            onChange={handleCollegeChange}
                                            placeholder="Select College"
                                            options={[
                                                { value: '', label: 'Select College', disabled: true },
                                                ...colleges.map(c => ({ value: c.id, label: c.code ? `${c.code} – ${c.name}` : c.name })),
                                                ...(colleges.length > 0 ? [{ value: '__sep__', label: '──────────', disabled: true }] : []),
                                                { value: 'NEW_COLLEGE', label: '+ Add New College...', className: 'font-semibold' },
                                            ]}
                                        />
                                    </div>

                                    {/* Course */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4" style={{ color: '#48A111' }} />
                                                Course
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsCourseModalOpen(true)}
                                                className="text-xs font-semibold flex items-center gap-1 hover:opacity-75 transition-opacity"
                                                style={{ color: '#48A111' }}
                                            >
                                                <Plus size={12} /> Add New
                                            </button>
                                        </label>
                                        <CustomSelect
                                            value={formData.courseId}
                                            onChange={handleCourseChange}
                                            disabled={!formData.collegeId && courses.length === 0}
                                            placeholder="Select Course"
                                            options={[
                                                { value: '', label: formData.collegeId ? 'Select Course' : 'Select a college first', disabled: true },
                                                ...courses.map(c => ({
                                                    value: c.id,
                                                    label: c.name.length > 50 ? `${c.name.substring(0, 50)}...` : c.name,
                                                })),
                                                ...(courses.length > 0 ? [{ value: '__sep_c__', label: '──────────', disabled: true }] : []),
                                                { value: 'NEW_COURSE', label: '+ Add New Course...', className: 'font-semibold' },
                                            ]}
                                        />
                                        {!formData.collegeId && (
                                            <p className="text-xs text-slate-400">Please select a college first</p>
                                        )}
                                    </div>

                                    {/* Year of Study — dynamic from course duration */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Year of Study</label>
                                        <CustomSelect
                                            value={String(formData.initialYearOfStudy)}
                                            onChange={v => setFormData(prev => ({ ...prev, initialYearOfStudy: parseInt(v) }))}
                                            placeholder="Select year"
                                            options={[
                                                { value: '', label: 'Select year', disabled: true },
                                                ...Array.from({ length: maxYears }, (_, i) => i + 1).map(yr => ({
                                                    value: String(yr),
                                                    label: `Year ${yr}`,
                                                })),
                                            ]}
                                        />
                                    </div>

                                    {/* Semester */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Semester</label>
                                        <CustomSelect
                                            value={String(formData.initialSemester)}
                                            onChange={v => setFormData(prev => ({ ...prev, initialSemester: parseInt(v) }))}
                                            placeholder="Select semester"
                                            options={[
                                                { value: '', label: 'Select semester', disabled: true },
                                                { value: '1', label: 'Semester 1' },
                                                { value: '2', label: 'Semester 2' },
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Residence (only for Makerere regions) ────── */}
                            {(showResidenceField || showHostelField) && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Residence
                                    </h3>

                                    {showResidenceField && (
                                        <div className="space-y-1.5 max-w-sm">
                                            <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Building className="w-4 h-4" style={{ color: '#48A111' }} />
                                                    Hall / Residence
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsResidenceModalOpen(true)}
                                                    className="text-xs font-semibold flex items-center gap-1 hover:opacity-75 transition-opacity"
                                                    style={{ color: '#48A111' }}
                                                >
                                                    <Plus size={12} /> Add New Hall
                                                </button>
                                            </label>
                                            <CustomSelect
                                                value={formData.residenceId}
                                                onChange={v => setFormData(prev => ({ ...prev, residenceId: v }))}
                                                placeholder="Select Hall"
                                                options={[
                                                    { value: '', label: 'Select Hall', disabled: true },
                                                    ...residences.filter(r => r.type === 'HALL').map(r => ({ value: r.id, label: r.name })),
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {showHostelField && (
                                        <div className="space-y-1.5 max-w-sm">
                                            <label className="text-sm font-semibold text-slate-700">Hostel Name</label>
                                            <input
                                                type="text"
                                                className="input transition-smooth"
                                                value={formData.hostelName}
                                                onChange={e => setFormData(prev => ({ ...prev, hostelName: e.target.value }))}
                                                placeholder="e.g. Olympia, Dream Land"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Changed fields summary ────────────────────── */}
                            {changedFields.length > 0 && (
                                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
                                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                                        Fields you are requesting to change:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {changedFields.map(c => (
                                            <span
                                                key={c.field}
                                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-100 text-teal-800"
                                            >
                                                {FIELD_LABELS[c.field] ?? c.field}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Reason ───────────────────────────────────── */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    Reason for Changes
                                    <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    className="input transition-smooth resize-none w-full"
                                    placeholder="Briefly explain why you need these changes (minimum 10 characters)..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    required
                                    minLength={10}
                                />
                                <p className="text-xs text-slate-400 text-right">{reason.length}/500</p>
                            </div>

                            {/* ── Actions ───────────────────────────────────── */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 btn-secondary"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || changedFields.length === 0 || reason.trim().length < 10}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#3d8e0e')}
                                    onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#48A111')}
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                    ) : (
                                        <><Send className="w-4 h-4" /> Submit Request</>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Sub-modals */}
            <AddCollegeModal
                isOpen={isCollegeModalOpen}
                onClose={() => setIsCollegeModalOpen(false)}
                onSuccess={handleCollegeSaved}
            />
            <AddCourseModal
                isOpen={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
                onSuccess={handleCourseSaved}
                preSelectedCollegeId={formData.collegeId}
            />
            <AddResidenceModal
                isOpen={isResidenceModalOpen}
                onClose={() => setIsResidenceModalOpen(false)}
                onSuccess={handleResidenceSaved}
            />
        </>
    );
};

export default EditRequestModal;
