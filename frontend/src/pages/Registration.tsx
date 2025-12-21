import React, { useState, useEffect } from 'react';
import api from '../api';
import QRCode from 'react-qr-code';
import { useToast } from '../components/ToastProvider';
import { UserPlus, CheckCircle, Download, RotateCcw, Sparkles, Copy, Mail, MapPin, GraduationCap, Tag as TagIcon, BookOpen, Plus, Loader2, Building } from 'lucide-react';
import AddCollegeModal from '../components/AddCollegeModal';
import AddCourseModal from '../components/AddCourseModal';
import AddResidenceModal from '../components/AddResidenceModal';

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
    collegeId?: string;
    college?: College;
}

interface Residence {
    id: string;
    name: string;
    type: string;
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

    // Modal states
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
    const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        gender: 'MALE',
        isMakerereStudent: true,
        regionId: '',
        classificationTagId: '',
        additionalTagIds: [] as string[],
        collegeId: '',
        courseId: '',
        yearOfStudy: 1,
        residenceId: '',
        hostelName: '',
    });
    const [createdMember, setCreatedMember] = useState<{ fullName: string; fellowshipNumber: string; defaultPassword?: string; qrCode: string; region?: { name: string } } | null>(null);

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

    const handleCollegeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'NEW_COLLEGE') {
            setIsCollegeModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, collegeId: value, courseId: '' }));
        }
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'NEW_COURSE') {
            setIsCourseModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, courseId: value }));
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
        setLoading(true);

        try {
            // Sanitize payload: valid UUIDs or undefined, no empty strings
            const payload = {
                ...formData,
                classificationTagId: formData.classificationTagId || undefined,
                courseId: formData.courseId || undefined,
                regionId: formData.regionId || undefined, // Must be UUID if present, but required by schema
                residenceId: formData.residenceId || undefined,
                hostelName: formData.hostelName || undefined,
            };

            const response = await api.post('/members', payload);
            setCreatedMember(response.data);
            showToast('success', 'Member registered successfully!');
        } catch (error: any) {
            console.error('Registration error:', error);
            const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCreatedMember(null);
        setFormData({
            fullName: '',
            email: '',
            phoneNumber: '',
            gender: 'MALE',
            isMakerereStudent: true,
            regionId: '',
            classificationTagId: '',
            additionalTagIds: [],
            collegeId: '',
            courseId: '',
            yearOfStudy: 1,
            residenceId: '',
            hostelName: '',
        });
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/10 text-teal-400 mb-4 ring-1 ring-teal-500/20">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-teal-200 to-teal-400 bg-clip-text text-transparent">
                        Registration Successful!
                    </h2>
                    <p className="text-slate-400">
                        Member has been added to the fellowship database.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Member Details Card */}
                    <div className="glass-card p-6 space-y-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-teal-400" />
                                Account Details
                            </h3>

                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</label>
                                    <p className="text-slate-200 font-medium">{createdMember.fullName}</p>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fellowship Number</label>
                                    <p className="text-teal-400 font-mono font-bold text-lg">{createdMember.fellowshipNumber}</p>
                                </div>

                                {createdMember.region && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Region</label>
                                        <p className="text-slate-200">{createdMember.region.name}</p>
                                    </div>
                                )}

                                {createdMember.defaultPassword && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Default Password</label>
                                        <div className="flex items-center justify-between">
                                            <p className="text-slate-200 font-mono">{createdMember.defaultPassword}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(createdMember.defaultPassword!);
                                                    showToast('success', 'Password copied!');
                                                }}
                                                className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-slate-400 hover:text-white"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                                <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>A confirmation email has been sent to the member with these details.</p>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Card */}
                    <div className="glass-card p-6 flex flex-col items-center justify-center space-y-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative w-full flex flex-col items-center space-y-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 self-start">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Member QR Code
                            </h3>

                            <div className="p-4 bg-white rounded-xl shadow-lg shadow-black/20">
                                <QRCode
                                    id="qr-code"
                                    value={createdMember.qrCode}
                                    size={200}
                                    level="H"
                                />
                            </div>

                            <button
                                onClick={downloadQRCode}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 hover:border-slate-600 w-full justify-center"
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
        <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Register New Member</h2>
                            <p className="text-slate-400">Enter member details to generate fellowship number and QR code</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
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

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                Email Address
                                <span className="text-red-400">*</span>
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

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    Phone Number
                                    <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="+256 700 000 000"
                                    className="input transition-smooth"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    Gender
                                    <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="input transition-smooth cursor-pointer"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>
                        </div>

                        {/* Makerere Student Toggle */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-teal-400" />
                                Is this person a Makerere student?
                                <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isMakerereStudent: true })}
                                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${formData.isMakerereStudent
                                        ? 'bg-teal-600 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    Yes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isMakerereStudent: false })}
                                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${!formData.isMakerereStudent
                                        ? 'bg-teal-600 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    No
                                </button>
                            </div>
                        </div>

                        {/* Classification Tag - Only for non-Makerere students */}
                        {!formData.isMakerereStudent && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    Classification
                                    <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="input transition-smooth cursor-pointer"
                                    value={formData.classificationTagId}
                                    onChange={(e) => setFormData({ ...formData, classificationTagId: e.target.value })}
                                    required={!formData.isMakerereStudent}
                                >
                                    <option value="">Select classification</option>
                                    {classificationTags.map((tag) => (
                                        <option key={tag.id} value={tag.id}>
                                            {tag.name.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Region */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-teal-400" />
                                Region
                                <span className="text-red-400">*</span>
                            </label>
                            <select
                                className="input transition-smooth cursor-pointer"
                                value={formData.regionId}
                                onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                                required
                                disabled={!formData.isMakerereStudent}
                            >
                                <option value="">Select a region</option>
                                {regions.filter(r => formData.isMakerereStudent ? r.name !== 'Non-Resident' : r.name === 'Non-Resident').map((region) => (
                                    <option key={region.id} value={region.id}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>
                            {!formData.isMakerereStudent && (
                                <p className="text-xs text-amber-400 mt-1">
                                    Non-resident members are auto-assigned to Non-Resident region
                                </p>
                            )}
                        </div>

                        {/* Residence/Hostel - Based on Region */}
                        {formData.regionId && formData.isMakerereStudent && (() => {
                            const selectedRegion = regions.find(r => r.id === formData.regionId);
                            const isCentral = selectedRegion?.name === 'Central';
                            const isNonResident = selectedRegion?.name === 'Non-Resident';

                            if (isCentral) {
                                return (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-teal-400" />
                                                Hall / Residence
                                                <span className="text-red-400">*</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsResidenceModalOpen(true)}
                                                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add New Hall
                                            </button>
                                        </label>
                                        <select
                                            className="input transition-smooth cursor-pointer"
                                            value={formData.residenceId}
                                            onChange={(e) => setFormData({ ...formData, residenceId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Hall</option>
                                            {residences.filter(r => r.type === 'HALL').map((residence) => (
                                                <option key={residence.id} value={residence.id}>
                                                    {residence.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            } else if (!isNonResident) {
                                return (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-teal-400" />
                                            Hostel Name (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Olympia, Dream Land"
                                            className="input transition-smooth"
                                            value={formData.hostelName}
                                            onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                                        />
                                        <p className="text-xs text-slate-500">Enter the hostel where they reside</p>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* College - Only for Makerere students */}
                        {formData.isMakerereStudent && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Building className="w-4 h-4 text-teal-400" />
                                        College (Optional)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsCollegeModalOpen(true)}
                                        className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add New
                                    </button>
                                </label>
                                <select
                                    className="input transition-smooth cursor-pointer"
                                    value={formData.collegeId}
                                    onChange={handleCollegeChange}
                                >
                                    <option value="">Select College</option>
                                    {colleges.map((college) => (
                                        <option key={college.id} value={college.id}>
                                            {college.code ? `${college.code} - ${college.name}` : college.name}
                                        </option>
                                    ))}
                                    {colleges.length > 0 && <option disabled>──────────</option>}
                                    <option value="NEW_COLLEGE" className="font-bold text-teal-400">
                                        + Add New College...
                                    </option>
                                </select>
                            </div>
                        )}

                        {/* Course and Year - Conditional */}
                        {showCourseAndYear && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Course */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
                                        <span>Course (Optional)</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsCourseModalOpen(true)}
                                            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Add New
                                        </button>
                                    </label>
                                    <select
                                        className="input transition-smooth cursor-pointer"
                                        value={formData.courseId}
                                        onChange={handleCourseChange}
                                        disabled={formData.isMakerereStudent && !formData.collegeId && courses.length === 0}
                                    >
                                        <option value="">Select Course</option>
                                        {courses.map((course) => (
                                            <option key={course.id} value={course.id}>
                                                {course.code}
                                            </option>
                                        ))}
                                        {courses.length > 0 && <option disabled>──────────</option>}
                                        <option value="NEW_COURSE" className="font-bold text-teal-400">
                                            + Add New Course...
                                        </option>
                                    </select>
                                    {formData.isMakerereStudent && !formData.collegeId && (
                                        <p className="text-xs text-amber-400 mt-1">
                                            Please select a college first
                                        </p>
                                    )}
                                </div>

                                {/* Year of Study */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Year of Study (Optional)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="7"
                                        className="input transition-smooth"
                                        value={formData.yearOfStudy}
                                        onChange={(e) => setFormData({ ...formData, yearOfStudy: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Additional Tags */}
                        {additionalTags.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <TagIcon className="w-4 h-4 text-purple-400" />
                                    Additional Tags (Optional)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {additionalTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleAdditionalTag(tag.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.additionalTagIds.includes(tag.id)
                                                ? 'text-white shadow-lg'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            style={formData.additionalTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                                        >
                                            {tag.name.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-8 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Register Member
                                </>
                            )}
                        </button>
                    </form>
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
        </div>
    );
};

export default Registration;
