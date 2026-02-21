import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import api from '../api';
import {
    Sparkles, RotateCcw, MapPin, GraduationCap, Building, Loader2,
    ArrowRight, CheckCircle, AlertTriangle, ChevronLeft, BookOpen, Phone, Mail, User
} from 'lucide-react';
import type { E164Number } from 'libphonenumber-js/core';
import PhoneInput from '../components/PhoneInput';
import CustomSelect from '../components/CustomSelect';
import '../styles/phoneInput.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Region { id: string; name: string; }
interface College { id: string; name: string; code?: string; }
interface Course { id: string; name: string; code: string; durationYears?: number; collegeId?: string; }
interface Residence { id: string; name: string; type: string; }

type RegistrationMode = 'NEW_MEMBER' | 'READMISSION';
type Step = 'gate' | 'form' | 'success' | 'invalid';

// ─── Combobox (select + freetext fallback) ────────────────────────────────────
function Combobox({
    value, onChange, suggestionValue, onSuggestionChange,
    options, placeholder, label, required = false,
}: {
    value: string; onChange: (v: string) => void;
    suggestionValue: string; onSuggestionChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder: string; label: string; required?: boolean;
}) {
    const [useCustom, setUseCustom] = useState(false);

    return (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
            {!useCustom ? (
                <>
                    <CustomSelect
                        value={value}
                        onChange={(v) => {
                            if (v === '__custom__') { setUseCustom(true); onChange(''); }
                            else onChange(v);
                        }}
                        placeholder={placeholder}
                        options={[
                            { value: '', label: placeholder, disabled: true },
                            ...options,
                            { value: '__sep__', label: '──────────', disabled: true },
                            { value: '__custom__', label: `+ Not listed — type mine` },
                        ]}
                    />
                </>
            ) : (
                <div className="space-y-1">
                    <input
                        type="text"
                        value={suggestionValue}
                        onChange={e => onSuggestionChange(e.target.value)}
                        placeholder={`Type your ${label.toLowerCase()}…`}
                        className="input transition-smooth"
                        required={required}
                    />
                    <button type="button" onClick={() => { setUseCustom(false); onSuggestionChange(''); }}
                        className="text-xs text-[#48A111] hover:underline flex items-center gap-1">
                        <ChevronLeft size={12} /> Back to list
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const SelfRegistration = () => {
    const [searchParams] = useSearchParams();
    const tokenParam = searchParams.get('token') ?? '';
    const { showToast } = useToast();

    const [step, setStep] = useState<Step>('gate');
    const [invalidReason, setInvalidReason] = useState('');
    const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('NEW_MEMBER');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);

    // Reference data
    const [regions, setRegions] = useState<Region[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [residences, setResidences] = useState<Residence[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '' as E164Number | '',
        gender: 'MALE',
        isMakerereStudent: true,
        regionId: '',
        collegeId: '',
        collegeSuggestion: '',
        courseId: '',
        courseSuggestion: '',
        initialYearOfStudy: 1,
        initialSemester: 1,
        residenceId: '',
        residenceSuggestion: '',
        hostelName: '',
    });

    // ── Validate token on mount ───────────────────────────────────────────────
    useEffect(() => {
        if (!tokenParam) {
            setInvalidReason('No registration link provided.');
            setStep('invalid');
            setValidating(false);
            return;
        }

        // Check session guard (soft block if already submitted)
        if (localStorage.getItem(`reg_submitted_${tokenParam}`)) {
            setStep('success');
            setValidating(false);
            return;
        }

        api.get(`/register/validate?token=${tokenParam}`)
            .then(() => setStep('gate'))
            .catch((err: any) => {
                setInvalidReason(err.response?.data?.reason ?? 'This registration link is invalid or has expired.');
                setStep('invalid');
            })
            .finally(() => setValidating(false));
    }, [tokenParam]);

    // ── Load reference data ───────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            api.get('/regions').then(r => setRegions(r.data)),
            api.get('/colleges').then(r => setColleges(r.data)),
            api.get('/courses').then(r => setCourses(r.data)),
            api.get('/residences').then(r => setResidences(r.data)),
        ]).catch(() => { });
    }, []);

    useEffect(() => {
        if (formData.isMakerereStudent && formData.collegeId) {
            api.get(`/courses?collegeId=${formData.collegeId}`).then(r => setCourses(r.data)).catch(() => { });
        } else if (!formData.isMakerereStudent) {
            api.get('/courses').then(r => setCourses(r.data)).catch(() => { });
        }
    }, [formData.collegeId, formData.isMakerereStudent]);

    // ── Non-makerere auto-region ──────────────────────────────────────────────
    useEffect(() => {
        if (!formData.isMakerereStudent) {
            const nonResident = regions.find(r => r.name === 'Non-Resident');
            if (nonResident) setFormData(p => ({ ...p, regionId: nonResident.id, collegeId: '', courseId: '' }));
        } else {
            setFormData(p => ({ ...p, regionId: '', collegeId: '', courseId: '' }));
        }
    }, [formData.isMakerereStudent, regions]);

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const resolvedRegionId = formData.isMakerereStudent
                ? formData.regionId
                : (regions.find(r => r.name.toUpperCase() === 'NON-RESIDENT')?.id ?? formData.regionId);

            await api.post('/register', {
                token: tokenParam,
                registrationMode,
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                gender: formData.gender,
                isMakerereStudent: formData.isMakerereStudent,
                ...(resolvedRegionId && { regionId: resolvedRegionId }),
                ...(formData.collegeId && { collegeId: formData.collegeId }),
                ...(formData.collegeSuggestion && { collegeSuggestion: formData.collegeSuggestion }),
                ...(formData.courseId && { courseId: formData.courseId }),
                ...(formData.courseSuggestion && { courseSuggestion: formData.courseSuggestion }),
                ...(formData.initialYearOfStudy && { initialYearOfStudy: formData.initialYearOfStudy }),
                ...(formData.initialSemester && { initialSemester: formData.initialSemester }),
                ...(formData.residenceId && { residenceId: formData.residenceId }),
                ...(formData.residenceSuggestion && { residenceSuggestion: formData.residenceSuggestion }),
                ...(formData.hostelName && { hostelName: formData.hostelName }),
            });

            localStorage.setItem(`reg_submitted_${tokenParam}`, '1');
            setStep('success');
        } catch (err: any) {
            showToast('error', err.response?.data?.error ?? 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const showCourseAndYear = formData.isMakerereStudent;
    const selectedRegion = regions.find(r => r.id === formData.regionId);
    const isCentral = selectedRegion?.name === 'Central';
    const isNonResident = selectedRegion?.name === 'Non-Resident';

    // ── Validating ────────────────────────────────────────────────────────────
    if (validating) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 size={36} className="animate-spin text-[#48A111] mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Validating registration link…</p>
                </div>
            </div>
        );
    }

    // ── Invalid link ──────────────────────────────────────────────────────────
    if (step === 'invalid') {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={28} className="text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Link Unavailable</h1>
                    <p className="text-slate-500 text-sm">{invalidReason}</p>
                    <p className="text-xs text-slate-400 mt-4">Contact the fellowship team if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    // ── Success ───────────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#e9f5e1] flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={28} className="text-[#48A111]" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted!</h1>
                    <p className="text-slate-600 text-sm mb-4">
                        Thank you! Our team will review your details. You'll receive an email with your fellowship number and login details once approved.
                    </p>
                    <div className="bg-[#e9f5e1] rounded-xl p-4 text-sm text-[#2d6a04]">
                        <strong>What happens next?</strong><br />
                        The fellowship manager reviews your submission, assigns you to a region/family, and activates your account.
                    </div>
                </div>
            </div>
        );
    }

    // ── Intake Gate ───────────────────────────────────────────────────────────
    if (step === 'gate') {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4 py-8">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-[#e9f5e1] flex items-center justify-center mx-auto mb-4">
                            <Sparkles size={28} className="text-[#48A111]" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Welcome to Manifest!</h1>
                        <p className="text-slate-500 mt-2 text-sm">Help us set up your profile correctly. Are you…</p>
                    </div>

                    <div className="space-y-3">
                        {/* New member */}
                        <button
                            onClick={() => { setRegistrationMode('NEW_MEMBER'); setStep('form'); }}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-left hover:border-[#48A111] hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#e9f5e1] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">🌟</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">Joining Manifest for the first time</p>
                                    <p className="text-sm text-slate-500 mt-0.5">I've never been a registered member before</p>
                                </div>
                                <ArrowRight size={18} className="text-slate-300 ml-auto group-hover:text-[#48A111] transition-colors" />
                            </div>
                        </button>

                        {/* Returning member */}
                        <button
                            onClick={() => { setRegistrationMode('READMISSION'); setStep('form'); }}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-left hover:border-[#F2B50B] hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">🔄</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">I've been part of Manifest before</p>
                                    <p className="text-sm text-slate-500 mt-0.5">Returning, transferring, or was active before the system</p>
                                </div>
                                <ArrowRight size={18} className="text-slate-300 ml-auto group-hover:text-[#F2B50B] transition-colors" />
                            </div>
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-8">Your information is kept private and only accessible to the fellowship management team.</p>
                </div>
            </div>
        );
    }

    // ── Registration Form ─────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep('gate')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            {registrationMode === 'NEW_MEMBER' ? '🌟 New Member Registration' : '🔄 Returning Member Registration'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {registrationMode === 'READMISSION'
                                ? 'Fill in your details below. Our team will verify your history during review.'
                                : 'Fill in your details to complete your registration.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Personal */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <User size={14} /> Personal Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                            <input type="text" className="input transition-smooth" placeholder="e.g. John Doe" required
                                value={formData.fullName} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Gender <span className="text-red-500">*</span></label>
                            <CustomSelect value={formData.gender} onChange={v => setFormData(p => ({ ...p, gender: v }))} required
                                options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} />
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <Phone size={14} /> Contact
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                            <input type="email" className="input transition-smooth" placeholder="your@email.com" required
                                value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                            <PhoneInput
                                value={formData.phoneNumber as E164Number | undefined}
                                onChange={v => setFormData(p => ({ ...p, phoneNumber: v || '' }))}
                                required placeholder="700 123 456"
                            />
                        </div>
                    </div>
                </div>

                {/* Student status & region */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <MapPin size={14} /> Location & Status
                    </h2>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <GraduationCap size={14} className="text-[#48A111]" /> Are you a Makerere University student? <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            {[true, false].map(val => (
                                <button key={String(val)} type="button"
                                    onClick={() => setFormData(p => ({ ...p, isMakerereStudent: val }))}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${formData.isMakerereStudent === val ? 'text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    style={formData.isMakerereStudent === val ? { backgroundColor: '#F2B50B' } : {}}>
                                    {val ? 'Yes' : 'No'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Region — fixed, no custom entry */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Region <span className="text-red-500">*</span></label>
                        <CustomSelect
                            value={formData.regionId}
                            onChange={v => setFormData(p => ({ ...p, regionId: v }))}
                            disabled={!formData.isMakerereStudent}
                            placeholder="Select your region"
                            options={[
                                { value: '', label: 'Select your region', disabled: true },
                                ...regions.filter(r => formData.isMakerereStudent ? r.name !== 'Non-Resident' : r.name === 'Non-Resident')
                                    .map(r => ({ value: r.id, label: r.name }))
                            ]}
                        />
                        {!formData.isMakerereStudent && (
                            <p className="text-xs text-slate-500">Non-residents are automatically assigned to the Non-Resident region.</p>
                        )}
                        {formData.isMakerereStudent && !formData.regionId && (
                            <p className="text-xs text-slate-400">Not sure of your region? The fellowship team will assign you during review.</p>
                        )}
                    </div>

                    {/* Residence — conditional on region */}
                    {formData.regionId && formData.isMakerereStudent && isCentral && (
                        <Combobox label="Hall / Residence" required
                            value={formData.residenceId} onChange={v => setFormData(p => ({ ...p, residenceId: v }))}
                            suggestionValue={formData.residenceSuggestion} onSuggestionChange={v => setFormData(p => ({ ...p, residenceSuggestion: v }))}
                            placeholder="Select your hall"
                            options={residences.filter(r => r.type === 'HALL').map(r => ({ value: r.id, label: r.name }))}
                        />
                    )}
                    {formData.regionId && formData.isMakerereStudent && !isCentral && !isNonResident && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Hostel Name <span className="text-red-500">*</span></label>
                            <input type="text" className="input transition-smooth" placeholder="e.g. Olympia, Dream Land"
                                value={formData.hostelName} required onChange={e => setFormData(p => ({ ...p, hostelName: e.target.value }))} />
                        </div>
                    )}
                </div>

                {/* Academic */}
                {formData.isMakerereStudent && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <BookOpen size={14} /> Academic Information
                        </h2>

                        <Combobox label="College" required={formData.isMakerereStudent}
                            value={formData.collegeId} onChange={v => setFormData(p => ({ ...p, collegeId: v, courseId: '' }))}
                            suggestionValue={formData.collegeSuggestion} onSuggestionChange={v => setFormData(p => ({ ...p, collegeSuggestion: v }))}
                            placeholder="Select your college"
                            options={colleges.map(c => ({ value: c.id, label: c.code ? `${c.code} – ${c.name}` : c.name }))}
                        />

                        {(formData.collegeId || formData.collegeSuggestion) && (
                            <Combobox label="Course" required
                                value={formData.courseId} onChange={v => setFormData(p => ({ ...p, courseId: v }))}
                                suggestionValue={formData.courseSuggestion} onSuggestionChange={v => setFormData(p => ({ ...p, courseSuggestion: v }))}
                                placeholder="Select your course"
                                options={courses.map(c => ({ value: c.id, label: c.name.length > 50 ? `${c.name.substring(0, 50)}…` : c.name }))}
                            />
                        )}

                        {showCourseAndYear && (formData.courseId || formData.courseSuggestion) && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Year of Study <span className="text-red-500">*</span></label>
                                    <CustomSelect value={String(formData.initialYearOfStudy)}
                                        onChange={v => setFormData(p => ({ ...p, initialYearOfStudy: parseInt(v) }))} required
                                        options={Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `Year ${i + 1}` }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Semester <span className="text-red-500">*</span></label>
                                    <CustomSelect value={String(formData.initialSemester)}
                                        onChange={v => setFormData(p => ({ ...p, initialSemester: parseInt(v) }))} required
                                        options={[{ value: '1', label: 'Semester 1' }, { value: '2', label: 'Semester 2' }]} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading}
                    className="w-full text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#48A111' }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#48A111'; }}>
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : <>Submit Registration <ArrowRight size={18} /></>}
                </button>
                <p className="text-center text-xs text-slate-400">By submitting, you agree to our data collection policies. Your data is only accessible to the fellowship management team.</p>
            </form>
        </div>
    );
};

export default SelfRegistration;
