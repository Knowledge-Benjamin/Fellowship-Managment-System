import React, { useState, useEffect } from 'react';
import api from '../api';
import QRCode from 'react-qr-code';
import { useToast } from '../components/ToastProvider';
import { UserPlus, CheckCircle, Download, RotateCcw, Sparkles, Copy, Mail, MapPin, GraduationCap, Tag as TagIcon, BookOpen, Plus, Loader2, Building, Users, ArrowRight } from 'lucide-react';
import type { E164Number } from 'libphonenumber-js/core';
import PhoneInput from '../components/PhoneInput';
import '../styles/phoneInput.css';
import AddCollegeModal from '../components/AddCollegeModal';
import AddCourseModal from '../components/AddCourseModal';
import AddResidenceModal from '../components/AddResidenceModal';
import RegistrationModeSelector from '../components/RegistrationModeSelector';
import CustomSelect from '../components/CustomSelect';

interface Region {
    id: string;
    name: string;
}

interface Tag {
    id: string;
    name: string;
    description: string;
    color: string;
    isSystem: boolean;
    showOnRegistration: boolean;
}

interface College {
    id: string;
    name: string;
    code?: string;
}

interface Course {
    id: string;
    name: string;
    code: string;
    durationYears?: number;
    collegeId?: string;
    college?: College;
}

interface Residence {
    id: string;
    name: string;
    type: string;
}

interface Family {
    id: string;
    name: string;
    familyHead: { fullName: string } | null;
    memberCount: number;
}

const Registration = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [regions, setRegions] = useState<Region[]>([]);
    const [classificationTags, setClassificationTags] = useState<Tag[]>([]);
    const [additionalTags, setAdditionalTags] = useState<Tag[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [residences, setResidences] = useState<Residence[]>([]);
    const [families, setFamilies] = useState<Family[]>([]);
    const [loadingFamilies, setLoadingFamilies] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitor online/offline status
    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    // Modal states
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
    const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '' as E164Number | '',
        gender: 'MALE',
        isMakerereStudent: true,
        regionId: '',
        classificationTagId: '',
        additionalTagIds: [] as string[],
        collegeId: '',
        courseId: '',
        initialYearOfStudy: 1,
        initialSemester: 1,
        residenceId: '',
        hostelName: '',
        familyId: '', // Family assignment
        registrationMode: 'NEW_MEMBER' as 'NEW_MEMBER' | 'LEGACY_IMPORT' | 'TRANSFER' | 'READMISSION',
        assignFirstTimerTag: undefined as boolean | undefined, // undefined = use mode default
    });
    // Member data from successful registration
    const [createdMember, setCreatedMember] = useState<{
        id: string;
        fullName: string;
        fellowshipNumber: string;
        defaultPassword?: string;
        qrCode: string;
        email: string;
        region?: { name: string };
        tags?: any[];
    } | null>(null);

    useEffect(() => {
        fetchRegions();
        fetchTags();
        fetchColleges();
        fetchCourses();
        fetchResidences();
    }, []);

    // Auto-set Non-Resident region when isMakerereStudent changes to false
    useEffect(() => {
        if (!formData.isMakerereStudent) {
            const nonResident = regions.find(r => r.name === 'Non-Resident');
            if (nonResident) {
                setFormData(prev => ({ ...prev, regionId: nonResident.id, collegeId: '', courseId: '' }));
            }
        } else {
            // Clear regionId when switching to Makerere student
            setFormData(prev => ({ ...prev, regionId: '', classificationTagId: '', collegeId: '', courseId: '' }));
        }
    }, [formData.isMakerereStudent, regions]);

    // Auto-fetch courses when college changes (for Makerere students)
    useEffect(() => {
        if (formData.isMakerereStudent && formData.collegeId) {
            fetchCoursesByCollege(formData.collegeId);
        } else if (!formData.isMakerereStudent) {
            fetchCourses();
        }
    }, [formData.collegeId, formData.isMakerereStudent]);

    const fetchRegions = async () => {
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            console.error('Failed to fetch regions:', error);
            showToast('error', 'Failed to load regions. Please refresh the page.');
        }
    };

    const fetchTags = async () => {
        try {
            const response = await api.get('/tags');
            const allTags: Tag[] = response.data;

            // Filter tags with showOnRegistration enabled
            const registrationTags = allTags.filter(tag => tag.showOnRegistration);

            // Separate classification tags from additional tags
            const classificationTagNames = ['ALUMNI', 'OTHER_CAMPUS_STUDENT', 'OTHER'];
            const classification = registrationTags.filter(tag => classificationTagNames.includes(tag.name));
            const additional = registrationTags.filter(tag => !classificationTagNames.includes(tag.name) && tag.name !== 'MAKERERE_STUDENT');

            setClassificationTags(classification);
            setAdditionalTags(additional);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            showToast('error', 'Failed to load tags.');
        }
    };

    const fetchColleges = async () => {
        try {
            const response = await api.get('/colleges');
            setColleges(response.data);
        } catch (error) {
            console.error('Failed to fetch colleges:', error);
            showToast('error', 'Failed to load colleges.');
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses');
            setCourses(response.data);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            showToast('error', 'Failed to load courses.');
        }
    };

    const fetchCoursesByCollege = async (collegeId: string) => {
        try {
            const response = await api.get(`/courses?collegeId=${collegeId}`);
            setCourses(response.data);
        } catch (error) {
            console.error('Failed to fetch courses by college:', error);
            showToast('error', 'Failed to load courses.');
        }
    };

    const fetchResidences = async () => {
        try {
            const response = await api.get('/residences');
            setResidences(response.data);
        } catch (error) {
            console.error('Failed to fetch residences:', error);
            showToast('error', 'Failed to load residences.');
        }
    };

    const fetchFamiliesByRegion = async (regionId: string) => {
        if (!regionId) {
            setFamilies([]);
            return;
        }

        try {
            setLoadingFamilies(true);
            const response = await api.get(`/families/region/${regionId}`);
            setFamilies(response.data);
        } catch (error) {
            console.error('Failed to fetch families:', error);
            showToast('error', 'Failed to load families for this region.');
            setFamilies([]);
        } finally {
            setLoadingFamilies(false);
        }
    };

    // Fetch families when region changes
    useEffect(() => {
        if (formData.regionId && formData.isMakerereStudent) {
            fetchFamiliesByRegion(formData.regionId);
            // Reset family selection when region changes
            setFormData(prev => ({ ...prev, familyId: '' }));
        } else {
            setFamilies([]);
            setFormData(prev => ({ ...prev, familyId: '' }));
        }
    }, [formData.regionId, formData.isMakerereStudent]);

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
            const selectedCourse = courses.find(c => c.id === value);
            let newYearOfStudy = formData.initialYearOfStudy;

            // Reset year if it exceeds the new course's duration
            if (selectedCourse?.durationYears && formData.initialYearOfStudy > selectedCourse.durationYears) {
                newYearOfStudy = 1;
                showToast('info', `Year of study reset to 1 as ${selectedCourse.name} is a ${selectedCourse.durationYears}-year course.`);
            }

            setFormData(prev => ({
                ...prev,
                courseId: value,
                initialYearOfStudy: newYearOfStudy
            }));
        }
    };

    const handleCollegeSaved = (college: College) => {
        setColleges(prev => [...prev, college].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, collegeId: college.id }));
    };

    const handleCourseSaved = (course: Course) => {
        setCourses(prev => [...prev, course].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, courseId: course.id }));
    };

    const handleResidenceSaved = (residence: Residence) => {
        setResidences(prev => [...prev, residence].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, residenceId: residence.id }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isOnline) {
            showToast('error', 'Cannot register while offline. Please check your internet connection.');
            return;
        }

        setLoading(true);

        // For non-Makerere students the region dropdown is disabled and never set,
        // so resolve the Non-Resident region from the loaded list at submit time.
        const resolvedRegionId = formData.isMakerereStudent
            ? formData.regionId
            : (regions.find(r => r.name.toUpperCase() === 'NON-RESIDENT')?.id ?? formData.regionId);

        try {
            // Build clean payload - remove UI-only fields and empty values
            const payload: any = {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                gender: formData.gender,
                regionId: resolvedRegionId,
            };

            // Add optional fields only if they have values
            if (formData.classificationTagId) payload.classificationTagId = formData.classificationTagId;
            if (formData.additionalTagIds?.length > 0) payload.additionalTagIds = formData.additionalTagIds;
            if (formData.courseId) payload.courseId = formData.courseId;
            if (formData.initialYearOfStudy) payload.initialYearOfStudy = formData.initialYearOfStudy;
            if (formData.initialSemester) payload.initialSemester = formData.initialSemester;
            if (formData.residenceId) payload.residenceId = formData.residenceId;
            if (formData.hostelName) payload.hostelName = formData.hostelName;

            // Add registration mode and tag assignment
            payload.registrationMode = formData.registrationMode;
            if (formData.assignFirstTimerTag !== undefined) {
                payload.assignFirstTimerTag = formData.assignFirstTimerTag;
            }

            // NOTE: isMakerereStudent and familyId are NOT sent - they're UI state only

            // Register the member
            const response = await api.post('/members', payload);

            // Backend returns { message, member: {...}, fellowshipNumber }
            const { member, fellowshipNumber } = response.data;

            if (!member || !member.qrCode) {
                throw new Error('Invalid response from server');
            }

            // Handle family assignment separately if selected
            if (formData.familyId && member.id) {
                try {
                    await api.post(`/families/${formData.familyId}/members`, {
                        memberId: member.id,
                    });
                    // Don't show separate success for family - it's part of registration
                } catch (familyError: any) {
                    console.warn('Family assignment failed:', familyError);
                    // Don't fail registration if family assignment fails
                    const familyErrorMsg = familyError.response?.data?.error || 'Could not assign to family';
                    showToast('warning', `Member registered but family assignment failed: ${familyErrorMsg}`);
                }
            }

            // Set member data for success display (include fellowshipNumber at top level)
            setCreatedMember({ ...member, fellowshipNumber });
            showToast('success', 'Member registered successfully!');
        } catch (error: any) {
            console.error('Registration error:', error);

            // Extract meaningful error message
            let errorMessage = 'Registration failed. Please try again.';

            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.details) {
                // Zod validation errors
                const details = error.response.data.details;
                if (Array.isArray(details) && details.length > 0) {
                    errorMessage = details.map((d: any) => d.message).join(', ');
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            fullName: '',
            email: '',
            phoneNumber: '' as E164Number | '',
            gender: 'MALE',
            isMakerereStudent: true,
            regionId: '',
            classificationTagId: '',
            additionalTagIds: [],
            collegeId: '',
            courseId: '',
            initialYearOfStudy: 1,
            initialSemester: 1,
            residenceId: '',
            hostelName: '',
            familyId: '',
            registrationMode: 'NEW_MEMBER' as 'NEW_MEMBER' | 'LEGACY_IMPORT' | 'TRANSFER' | 'READMISSION',
            assignFirstTimerTag: undefined,
        });
        setCreatedMember(null);
    };

    const downloadQRCode = () => {
        const svg = document.getElementById('qr-code');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `${createdMember?.fullName}-QR.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        }
    };

    const toggleAdditionalTag = (tagId: string) => {
        setFormData(prev => ({
            ...prev,
            additionalTagIds: prev.additionalTagIds.includes(tagId)
                ? prev.additionalTagIds.filter(id => id !== tagId)
                : [...prev.additionalTagIds, tagId]
        }));
    };

    if (createdMember) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-50 text-teal-600 mb-4 ring-1 ring-teal-200">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">
                        Registration Successful!
                    </h2>
                    <p className="text-slate-600">
                        Member has been added to the fellowship database.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Member Details Card */}
                    <div className="premium-card p-6 space-y-6 relative overflow-hidden group bg-white shadow-xl border-slate-200">
                        <div className="absolute inset-0 bg-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-teal-600" />
                                Account Details
                            </h3>

                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</label>
                                    <p className="text-slate-900 font-medium">{createdMember.fullName}</p>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fellowship Number</label>
                                    <p className="text-teal-600 font-mono font-bold text-lg">{createdMember.fellowshipNumber}</p>
                                </div>

                                {createdMember.region && (
                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Region</label>
                                        <p className="text-slate-900">{createdMember.region.name}</p>
                                    </div>
                                )}

                                {createdMember.defaultPassword && (
                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Default Password</label>
                                        <div className="flex items-center justify-between">
                                            <p className="text-slate-900 font-mono">{createdMember.defaultPassword}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(createdMember.defaultPassword!);
                                                    showToast('success', 'Password copied!');
                                                }}
                                                className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-slate-700"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
                                <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>A confirmation email has been sent to the member with these details.</p>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Card */}
                    <div className="premium-card p-6 flex flex-col items-center justify-center space-y-6 relative overflow-hidden group bg-white shadow-xl border-slate-200">
                        <div className="absolute inset-0 bg-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative w-full flex flex-col items-center space-y-6">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 self-start">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                Member QR Code
                            </h3>

                            <div className="p-4 bg-white rounded-xl shadow-lg shadow-slate-200 border border-slate-100">
                                <QRCode
                                    id="qr-code"
                                    value={createdMember.qrCode || ''}
                                    size={200}
                                    level="H"
                                />
                            </div>

                            <button
                                onClick={downloadQRCode}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors border border-transparent w-full justify-center shadow-lg shadow-slate-200"
                            >
                                <Download className="w-4 h-4" />
                                Download QR Code
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleReset}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Register Another Member
                    </button>
                </div>
            </div>
        );
    }

    const showCourseAndYear = formData.isMakerereStudent || formData.classificationTagId === classificationTags.find(t => t.name === 'OTHER_CAMPUS_STUDENT')?.id;

    return (
        <div className="w-[90%] mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#e9f5e1', color: '#48A111', outline: '1.5px solid #c5e3b0' }}>
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Register New Member</h2>
                            <p className="text-slate-500">Enter member details to generate fellowship number and QR code</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Registration Mode Selector */}
                        <RegistrationModeSelector
                            value={formData.registrationMode}
                            onChange={(mode) => setFormData({ ...formData, registrationMode: mode, assignFirstTimerTag: undefined })}
                        />

                        {/* Offline Warning Banner */}
                        {!isOnline && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                                    <Loader2 className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-amber-200">You are currently offline</h3>
                                    <p className="text-sm text-amber-200/70 mt-1">
                                        Registration requires an active internet connection.
                                        Please reconnect to submit this form.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Conditional First-Timer Tag Override (only for TRANSFER and READMISSION) */}
                        {(formData.registrationMode === 'TRANSFER' || formData.registrationMode === 'READMISSION') && (
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.assignFirstTimerTag === true}
                                        onChange={(e) => setFormData({ ...formData, assignFirstTimerTag: e.target.checked ? true : false })}
                                        className="mt-1 w-4 h-4 rounded border-slate-300 bg-white text-teal-600 focus:ring-teal-500 transition-colors cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                                            Mark as pending first attendance
                                        </span>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Enable only if this member has never attended any fellowship event.
                                            They will be counted as a first-timer on their first attendance.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Personal & Contact Information - Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Full Name - spans 2 columns */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    Full Name
                                    <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    className="input transition-smooth"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    Gender
                                    <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={formData.gender}
                                    onChange={(v) => setFormData({ ...formData, gender: v })}
                                    required
                                    options={[
                                        { value: 'MALE', label: 'Male' },
                                        { value: 'FEMALE', label: 'Female' },
                                    ]}
                                />
                            </div>

                            {/* Email - spans 2 columns */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    Email Address
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="input transition-smooth"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    Phone Number
                                    <span className="text-red-500">*</span>
                                </label>
                                <PhoneInput
                                    value={formData.phoneNumber as E164Number | undefined}
                                    onChange={(value) => setFormData({ ...formData, phoneNumber: value || '' })}
                                    required
                                    placeholder="700 123 456"
                                />
                            </div>
                        </div>

                        {/* Student Status & Location - Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Makerere Student Toggle - spans 2 columns */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Is this person a Makerere student?
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isMakerereStudent: true })}
                                        className={`flex-1 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${formData.isMakerereStudent
                                            ? 'text-white font-bold shadow-lg'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                                            }`}
                                        style={formData.isMakerereStudent ? { backgroundColor: '#F2B50B' } : {}}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isMakerereStudent: false })}
                                        className={`flex-1 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${!formData.isMakerereStudent
                                            ? 'text-white font-bold shadow-lg'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                                            }`}
                                        style={!formData.isMakerereStudent ? { backgroundColor: '#F2B50B' } : {}}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            {/* Classification Tag - Only for non-Makerere students */}
                            {!formData.isMakerereStudent && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        Classification
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <CustomSelect
                                        value={formData.classificationTagId}
                                        onChange={(v) => setFormData({ ...formData, classificationTagId: v })}
                                        required={!formData.isMakerereStudent}
                                        placeholder="Select classification"
                                        options={[
                                            { value: '', label: 'Select classification', disabled: true },
                                            ...classificationTags.map(tag => ({ value: tag.id, label: tag.name.replace(/_/g, ' ') }))
                                        ]}
                                    />
                                </div>
                            )}

                            {/* Region */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Region
                                    <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={formData.regionId}
                                    onChange={(v) => setFormData({ ...formData, regionId: v })}
                                    required
                                    disabled={!formData.isMakerereStudent}
                                    placeholder="Select a region"
                                    options={[
                                        { value: '', label: 'Select a region', disabled: true },
                                        ...regions
                                            .filter(r => formData.isMakerereStudent ? r.name !== 'Non-Resident' : r.name === 'Non-Resident')
                                            .map(region => ({ value: region.id, label: region.name }))
                                    ]}
                                />
                                {!formData.isMakerereStudent && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Non-resident members are auto-assigned to Non-Resident region
                                    </p>
                                )}
                            </div>

                            {/* Family Assignment - Only for Makerere students with selected region */}
                            {formData.isMakerereStudent && formData.regionId && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Users className="w-4 h-4" style={{ color: '#48A111' }} />
                                        Family Group
                                        <span className="text-red-500">*</span>
                                    </label>

                                    {loadingFamilies ? (
                                        <div className="input flex items-center gap-2 text-slate-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading families...
                                        </div>
                                    ) : families.length === 0 ? (
                                        <div className="input text-slate-500 italic">
                                            No families available in this region yet
                                        </div>
                                    ) : (
                                        <CustomSelect
                                            value={formData.familyId}
                                            onChange={(v) => setFormData({ ...formData, familyId: v })}
                                            required
                                            placeholder="Select a family"
                                            options={[
                                                { value: '', label: 'Select a family', disabled: true },
                                                ...families.map(family => ({
                                                    value: family.id,
                                                    label: `${family.name}${family.familyHead ? ` - ${family.familyHead.fullName}` : ''} (${family.memberCount} member${family.memberCount !== 1 ? 's' : ''})`
                                                }))
                                            ]}
                                        />
                                    )}

                                    <p className="text-xs text-slate-500">
                                        You can assign the member to a family now or later
                                    </p>
                                </div>
                            )}

                            {/* Residence/Hostel - Based on Region */}
                            {formData.regionId && formData.isMakerereStudent && (() => {
                                const selectedRegion = regions.find(r => r.id === formData.regionId);
                                const isCentral = selectedRegion?.name === 'Central';
                                const isNonResident = selectedRegion?.name === 'Non-Resident';

                                if (isCentral) {
                                    return (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Building className="w-4 h-4" style={{ color: '#48A111' }} />
                                                    Hall / Residence
                                                    <span className="text-red-500">*</span>
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
                                                onChange={(v) => setFormData({ ...formData, residenceId: v })}
                                                required
                                                placeholder="Select Hall"
                                                options={[
                                                    { value: '', label: 'Select Hall', disabled: true },
                                                    ...residences.filter(r => r.type === 'HALL').map(r => ({ value: r.id, label: r.name }))
                                                ]}
                                            />
                                        </div>
                                    );
                                } else if (!isNonResident) {
                                    return (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <MapPin className="w-4 h-4" style={{ color: '#48A111' }} />
                                                Hostel Name
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Olympia, Dream Land"
                                                className="input transition-smooth"
                                                value={formData.hostelName}
                                                onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                                                required
                                            />
                                            <p className="text-xs text-slate-500">Enter the hostel where they reside</p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Academic Information - Grid Layout */}
                        {(formData.isMakerereStudent || showCourseAndYear) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* College - Only for Makerere students */}
                                {formData.isMakerereStudent && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Building className="w-4 h-4" style={{ color: '#48A111' }} />
                                                College
                                                <span className="text-red-500">*</span>
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
                                            required
                                            placeholder="Select College"
                                            options={[
                                                { value: '', label: 'Select College', disabled: true },
                                                ...colleges.map(college => ({ value: college.id, label: college.code ? `${college.code} - ${college.name}` : college.name })),
                                                ...(colleges.length > 0 ? [{ value: '__sep__', label: '──────────', disabled: true }] : []),
                                                { value: 'NEW_COLLEGE', label: '+ Add New College...', className: 'font-semibold' },
                                            ]}
                                        />
                                    </div>
                                )}

                                {/* Course - Conditional */}
                                {showCourseAndYear && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                Course
                                                <span className="text-red-500">*</span>
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
                                            disabled={formData.isMakerereStudent && !formData.collegeId && courses.length === 0}
                                            required
                                            placeholder="Select Course"
                                            options={[
                                                { value: '', label: 'Select Course', disabled: true },
                                                ...courses.map(course => ({ value: course.id, label: course.name.length > 50 ? `${course.name.substring(0, 50)}...` : course.name })),
                                                ...(courses.length > 0 ? [{ value: '__sep_course__', label: '──────────', disabled: true }] : []),
                                                { value: 'NEW_COURSE', label: '+ Add New Course...', className: 'font-semibold' },
                                            ]}
                                        />
                                        {formData.isMakerereStudent && !formData.collegeId && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Please select a college first
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Year of Study - Conditional */}
                                {showCourseAndYear && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            Current Year of Study
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <CustomSelect
                                            value={String(formData.initialYearOfStudy)}
                                            onChange={(v) => setFormData({ ...formData, initialYearOfStudy: parseInt(v) })}
                                            required
                                            placeholder="Select year"
                                            options={[
                                                { value: '', label: 'Select year', disabled: true },
                                                ...(() => {
                                                    const selectedCourse = courses.find(c => c.id === formData.courseId);
                                                    const maxYears = selectedCourse?.durationYears || 5;
                                                    return Array.from({ length: maxYears }, (_, i) => i + 1).map(year => ({ value: String(year), label: `Yr ${year}` }));
                                                })()
                                            ]}
                                        />
                                    </div>
                                )}

                                {/* Current Semester - Conditional */}
                                {showCourseAndYear && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            Current Semester
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <CustomSelect
                                            value={String(formData.initialSemester)}
                                            onChange={(v) => setFormData({ ...formData, initialSemester: parseInt(v) })}
                                            required
                                            placeholder="Select semester"
                                            options={[
                                                { value: '', label: 'Select semester', disabled: true },
                                                { value: '1', label: 'Semester 1' },
                                                { value: '2', label: 'Semester 2' },
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Additional Tags */}
                        {additionalTags.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <TagIcon className="w-4 h-4 text-purple-600" />
                                    Additional Tags (Optional)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {additionalTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleAdditionalTag(tag.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.additionalTagIds.includes(tag.id)
                                                ? 'text-white shadow-lg shadow-purple-200'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            style={formData.additionalTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                                        >
                                            {tag.name.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-6 flex justify-center w-full">
                            <div className="w-full max-w-md">
                                <button
                                    type="submit"
                                    disabled={loading || !isOnline}
                                    className="w-full text-white font-semibold py-3 px-6 text-[15px] rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{
                                        backgroundColor: '#48A111',
                                    }}
                                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                    onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#48A111')}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating Member Profile...
                                        </>
                                    ) : !isOnline ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-pulse" />
                                            Waiting for Connection...
                                        </>
                                    ) : (
                                        <>
                                            Register
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs text-slate-500 mt-4">
                                    By registering, you agree to our data collection policies.
                                    A digital ID card will be generated automatically.
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modals */}
            <AddCollegeModal
                isOpen={isCollegeModalOpen}
                onClose={() => setIsCollegeModalOpen(false)}
                onSuccess={handleCollegeSaved}
            />

            <AddCourseModal
                isOpen={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
                onSuccess={handleCourseSaved}
                preSelectedCollegeId={formData.isMakerereStudent ? formData.collegeId : undefined}
            />

            <AddResidenceModal
                isOpen={isResidenceModalOpen}
                onClose={() => setIsResidenceModalOpen(false)}
                onSuccess={handleResidenceSaved}
            />
        </div>
    );
};

export default Registration;