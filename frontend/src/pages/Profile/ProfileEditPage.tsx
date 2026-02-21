import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { E164Number } from 'libphonenumber-js/core';
import api from '../../api';
import { useToast } from '../../components/ToastProvider';
import {
    User, Mail, Phone, Building, BookOpen, GraduationCap,
    MapPin, Plus, Loader2, ArrowLeft, Save,
} from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import CustomSelect from '../../components/CustomSelect';
import AddCollegeModal from '../../components/AddCollegeModal';
import AddCourseModal from '../../components/AddCourseModal';
import AddResidenceModal from '../../components/AddResidenceModal';
import '../../styles/phoneInput.css';

interface College { id: string; name: string; code?: string; }
interface Course { id: string; name: string; durationYears?: number; }
interface Residence { id: string; name: string; type: string; }

const ProfileEditPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Reference data
    const [colleges, setColleges] = useState<College[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [residences, setResidences] = useState<Residence[]>([]);

    // Sub-modals
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
    const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '' as E164Number | '',
        collegeId: '',
        courseId: '',
        initialYearOfStudy: 1,
        initialSemester: 1,
        residenceId: '',
        hostelName: '',
    });

    // Region info (from profile, read-only — FM region change is admin-level)
    const [regionName, setRegionName] = useState('');

    // Load profile + reference data
    useEffect(() => {
        const init = async () => {
            try {
                const [profileRes, collegesRes, residencesRes] = await Promise.all([
                    api.get('/members/me'),
                    api.get('/colleges'),
                    api.get('/residences'),
                ]);

                const p = profileRes.data;
                setRegionName(p.region?.name ?? '');
                setColleges(collegesRes.data);
                setResidences(residencesRes.data);

                setFormData({
                    fullName: p.fullName ?? '',
                    email: p.email ?? '',
                    phoneNumber: (p.phoneNumber || '') as E164Number | '',
                    collegeId: p.academic?.collegeId || '',
                    courseId: p.academic?.courseId || '',
                    initialYearOfStudy: p.academic?.currentYear || 1,
                    initialSemester: p.academic?.currentSemester || 1,
                    residenceId: p.residence?.id || '',
                    hostelName: p.hostelName || '',
                });

                // Load courses for existing college
                if (p.academic?.collegeId) {
                    const coursesRes = await api.get(`/courses?collegeId=${p.academic.collegeId}`);
                    setCourses(coursesRes.data);
                }
            } catch {
                showToast('error', 'Failed to load profile data.');
            } finally {
                setLoadingProfile(false);
            }
        };
        init();
    }, []);

    // Reload courses when college changes
    useEffect(() => {
        if (!formData.collegeId) { setCourses([]); return; }
        api.get(`/courses?collegeId=${formData.collegeId}`)
            .then(r => setCourses(r.data))
            .catch(() => showToast('error', 'Failed to load courses.'));
    }, [formData.collegeId]);

    const handleCollegeChange = (value: string) => {
        if (value === 'NEW_COLLEGE') { setIsCollegeModalOpen(true); return; }
        setFormData(prev => ({ ...prev, collegeId: value, courseId: '' }));
    };

    const handleCourseChange = (value: string) => {
        if (value === 'NEW_COURSE') { setIsCourseModalOpen(true); return; }
        const selected = courses.find(c => c.id === value);
        let year = formData.initialYearOfStudy;
        if (selected?.durationYears && year > selected.durationYears) year = 1;
        setFormData(prev => ({ ...prev, courseId: value, initialYearOfStudy: year }));
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

    // Region-based residence logic (same as registration)
    const upperRegion = regionName.toUpperCase();
    const isCentralRegion = upperRegion === 'CENTRAL';
    const isNonResident = upperRegion === 'NON-RESIDENT';
    const showResidenceField = isCentralRegion;
    const showHostelField = !isCentralRegion && !isNonResident;

    // Year options from selected course
    const selectedCourse = courses.find(c => c.id === formData.courseId);
    const maxYears = selectedCourse?.durationYears || 5;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: Record<string, any> = {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: String(formData.phoneNumber || ''),
            };
            if (formData.courseId) payload.courseId = formData.courseId;
            if (formData.initialYearOfStudy) payload.initialYearOfStudy = formData.initialYearOfStudy;
            if (formData.initialSemester) payload.initialSemester = formData.initialSemester;
            if (formData.residenceId) payload.residenceId = formData.residenceId;
            if (formData.hostelName) payload.hostelName = formData.hostelName;

            await api.patch('/members/me', payload);
            showToast('success', 'Profile updated successfully!');
            navigate('/profile');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to update profile.';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="w-[90%] mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />

                <div className="relative">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <button
                            onClick={() => navigate('/profile')}
                            className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#e9f5e1', color: '#48A111', outline: '1.5px solid #c5e3b0' }}>
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Edit My Profile</h2>
                            <p className="text-slate-500">Changes are applied immediately — no approval required</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* ── Personal & Contact ─────────────────────────── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Full Name */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input transition-smooth"
                                    value={formData.fullName}
                                    onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                                    placeholder="Your full name"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Mail className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    className="input transition-smooth"
                                    value={formData.email}
                                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Phone className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <PhoneInput
                                    value={formData.phoneNumber as E164Number | undefined}
                                    onChange={val => setFormData(p => ({ ...p, phoneNumber: val || '' }))}
                                    required
                                    placeholder="700 123 456"
                                />
                            </div>
                        </div>

                        {/* ── Academic Information ───────────────────────── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* College */}
                            <div className="space-y-2">
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
                            <div className="space-y-2">
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
                                        ...courses.map(c => ({ value: c.id, label: c.name.length > 50 ? `${c.name.substring(0, 50)}...` : c.name })),
                                        ...(courses.length > 0 ? [{ value: '__sep_c__', label: '──────────', disabled: true }] : []),
                                        { value: 'NEW_COURSE', label: '+ Add New Course...', className: 'font-semibold' },
                                    ]}
                                />
                                {!formData.collegeId && (
                                    <p className="text-xs text-slate-500">Please select a college first</p>
                                )}
                            </div>

                            {/* Year of Study */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Year of Study
                                </label>
                                <CustomSelect
                                    value={String(formData.initialYearOfStudy)}
                                    onChange={v => setFormData(p => ({ ...p, initialYearOfStudy: parseInt(v) }))}
                                    placeholder="Select year"
                                    options={[
                                        { value: '', label: 'Select year', disabled: true },
                                        ...Array.from({ length: maxYears }, (_, i) => i + 1).map(yr => ({
                                            value: String(yr), label: `Year ${yr}`,
                                        })),
                                    ]}
                                />
                            </div>

                            {/* Semester */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Current Semester</label>
                                <CustomSelect
                                    value={String(formData.initialSemester)}
                                    onChange={v => setFormData(p => ({ ...p, initialSemester: parseInt(v) }))}
                                    placeholder="Select semester"
                                    options={[
                                        { value: '', label: 'Select semester', disabled: true },
                                        { value: '1', label: 'Semester 1' },
                                        { value: '2', label: 'Semester 2' },
                                    ]}
                                />
                            </div>

                            {/* Residence (region-conditional) */}
                            {showResidenceField && (
                                <div className="space-y-2">
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
                                        onChange={v => setFormData(p => ({ ...p, residenceId: v }))}
                                        placeholder="Select Hall"
                                        options={[
                                            { value: '', label: 'Select Hall', disabled: true },
                                            ...residences.filter(r => r.type === 'HALL').map(r => ({ value: r.id, label: r.name })),
                                        ]}
                                    />
                                </div>
                            )}

                            {showHostelField && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" style={{ color: '#48A111' }} />
                                        Hostel Name
                                    </label>
                                    <input
                                        type="text"
                                        className="input transition-smooth"
                                        value={formData.hostelName}
                                        onChange={e => setFormData(p => ({ ...p, hostelName: e.target.value }))}
                                        placeholder="e.g. Olympia, Dream Land"
                                    />
                                    <p className="text-xs text-slate-500">Enter the hostel where you reside</p>
                                </div>
                            )}
                        </div>

                        {/* ── Submit ─────────────────────────────────────── */}
                        <div className="pt-4 flex justify-center">
                            <div className="w-full max-w-md">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                    onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#48A111')}
                                >
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Saving Changes...</>
                                    ) : (
                                        <><Save className="w-5 h-5" /> Save Changes</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sub-modals */}
            <AddCollegeModal isOpen={isCollegeModalOpen} onClose={() => setIsCollegeModalOpen(false)} onSuccess={handleCollegeSaved} />
            <AddCourseModal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} onSuccess={handleCourseSaved} preSelectedCollegeId={formData.collegeId} />
            <AddResidenceModal isOpen={isResidenceModalOpen} onClose={() => setIsResidenceModalOpen(false)} onSuccess={handleResidenceSaved} />
        </div>
    );
};

export default ProfileEditPage;
