import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import api from '../api';
import QRCode from 'react-qr-code';
import {
    User, Mail, Hash, Shield, Tag as TagIcon, Loader2,
    BookOpen, GraduationCap, Download, Phone, MapPin, Users,
    Clock, Edit2, Briefcase, Camera, Building, Calendar, Flag
} from 'lucide-react';
import TagBadge from '../components/TagBadge';
import EditRequestModal from '../components/EditRequestModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import CampaignTab from './Profile/CampaignTab';

interface Tag {
    id: string;
    name: string;
    color: string;
    type: 'SYSTEM' | 'CUSTOM';
    isSystem: boolean;
}

interface AcademicStatus {
    currentYear: number | null;
    currentSemester: number | null;
    isFinalist: boolean;
    isAlumni: boolean;
    course: {
        id: string;
        name: string;
        durationYears: number;
    } | null;
}

interface PendingEditRequest {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    changes: Array<{ field: string; oldValue: string; newValue: string }>;
    reason: string;
    createdAt: string;
}

interface ExtendedProfile {
    phoneNumber: string;
    gender: string | null;
    hostelName: string | null;
    region: { id: string; name: string } | null;
    family: { id: string; name: string } | null;
    teams: Array<{ id: string; name: string }>;
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
    pendingEditRequest: PendingEditRequest | null;
}

const Profile = () => {
    const { user, isManager } = useAuth();
    const navigate = useNavigate();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loadingTags, setLoadingTags] = useState(true);
    const [academicStatus, setAcademicStatus] = useState<AcademicStatus | null>(null);
    const [loadingAcademic, setLoadingAcademic] = useState(true);
    const [extProfile, setExtProfile] = useState<ExtendedProfile | null>(null);
    const [loadingExtProfile, setLoadingExtProfile] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'fellowship' | 'academic' | 'security' | 'campaigns'>('personal');

    useEffect(() => {
        if (user?.id) {
            fetchUserTags();
            fetchAcademicStatus();
            fetchExtProfile();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchUserTags = async () => {
        try {
            setLoadingTags(true);
            const response = await api.get(`/tags/members/${user?.id}/history`);
            const activeTags = response.data
                .filter((mt: { isActive: boolean; tag: Tag }) => mt.isActive)
                .map((mt: { isActive: boolean; tag: Tag }) => mt.tag);
            setTags(activeTags);
        } catch (error) {
            console.error('Failed to fetch user tags:', error);
        } finally {
            setLoadingTags(false);
        }
    };

    const fetchAcademicStatus = async () => {
        try {
            setLoadingAcademic(true);
            const response = await api.get(`/members/${user?.id}/academic-status`);
            setAcademicStatus(response.data);
        } catch (error) {
            console.error('Failed to fetch academic status:', error);
        } finally {
            setLoadingAcademic(false);
        }
    };

    const fetchExtProfile = async () => {
        try {
            setLoadingExtProfile(true);
            const response = await api.get('/members/me');
            setExtProfile({ ...response.data, teams: response.data.teams || [] });
        } catch (error) {
            console.error('Failed to fetch extended profile:', error);
        } finally {
            setLoadingExtProfile(false);
        }
    };

    if (!user) return null;

    const downloadQRCode = () => {
        const svg = document.getElementById('profile-qr-code');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            const padding = 30;
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, padding, padding);
            }
            const pngFile = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${user.fullName.replace(/\s+/g, '-')}-QR.png`;
            link.href = pngFile;
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    const pendingRequest = extProfile?.pendingEditRequest;

    const renderEditRequestStatus = () => {
        if (loadingExtProfile) return null;

        if (isManager) {
            return (
                <button
                    onClick={() => navigate('/profile/edit')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                >
                    <Edit2 size={15} />
                    Edit Profile
                </button>
            );
        }

        if (!pendingRequest) {
            return (
                <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                >
                    <Edit2 size={15} />
                    Request Edit
                </button>
            );
        }
        
        if (pendingRequest.status === 'PENDING') {
            return (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium shadow-sm">
                    <Clock size={15} />
                    Edit pending
                </div>
            );
        }
        return null;
    };

    const tabs = [
        { id: 'personal', label: 'Personal Details', icon: User },
        { id: 'fellowship', label: 'Fellowship Life', icon: Briefcase },
        { id: 'academic', label: 'Academic & Housing', icon: GraduationCap },
        { id: 'campaigns', label: 'Bring 1 Campaign', icon: Flag },
        { id: 'security', label: 'Security', icon: Shield }
    ] as const;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
            {/* Header Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-[#48A111] shadow-xl">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-[#48A111]"></div>
                <div className="relative px-8 py-10 md:py-14 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white shadow-lg flex items-center justify-center text-4xl font-bold text-[#48A111] relative group overflow-hidden border-4 border-[#e9f5e1]/30">
                            {user.fullName.charAt(0)}
                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white drop-shadow-md" />
                            </div>
                        </div>
                        <div className="text-center md:text-left text-white mt-3">
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{user.fullName}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#F2B50B] text-slate-900 shadow-sm uppercase tracking-wider">
                                    {user.role.replace('_', ' ')}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm shadow-sm font-mono tracking-wide">
                                    <Hash size={12} className="mr-1" /> {user.fellowshipNumber}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 mt-4 md:mt-0">
                        {renderEditRequestStatus()}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Left Sidebar: Nav & QR */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Navigation Tabs */}
                    <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200">
                        <nav className="flex flex-col space-y-1">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as 'personal' | 'fellowship' | 'academic' | 'security' | 'campaigns')}
                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                                            isActive 
                                            ? 'bg-[#e9f5e1] text-[#48A111] translate-x-1 shadow-sm' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-[#48A111]' : 'text-slate-400'} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* QR Code Card */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center flex flex-col items-center">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 inline-block hover:shadow-md transition-shadow">
                            <QRCode
                                id="profile-qr-code"
                                value={user.qrCode}
                                size={140}
                                level="M"
                            />
                        </div>
                        <h3 className="text-slate-900 font-bold text-lg mb-1">Check-in Pass</h3>
                        <p className="text-slate-500 text-xs mb-5 px-4 leading-relaxed">
                            Present this QR code at events for quick check-in.
                        </p>
                        <button
                            onClick={downloadQRCode}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold w-full justify-center shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
                            style={{ backgroundColor: '#48A111' }}
                        >
                            <Download size={16} />
                            Save Image
                        </button>
                    </div>
                </div>

                {/* Right Content Space */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                        
                        {/* Personal Tab */}
                        {activeTab === 'personal' && (
                            <div className="p-8 animate-fade-in space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <User className="text-[#48A111]" size={24} /> Personal Details
                                    </h2>
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:border-[#c5e3b0]">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</p>
                                            <div className="flex items-center gap-2 text-slate-900 font-medium break-all mt-2">
                                                <Mail size={18} className="text-[#48A111]" /> {user.email}
                                            </div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:border-[#c5e3b0]">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</p>
                                            <div className="flex items-center gap-2 text-slate-900 font-medium mt-2">
                                                <Phone size={18} className="text-[#48A111]" /> 
                                                {loadingExtProfile ? <Loader2 size={14} className="animate-spin text-slate-400" /> : extProfile?.phoneNumber || '—'}
                                            </div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:border-[#c5e3b0]">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</p>
                                            <div className="flex items-center gap-2 text-slate-900 font-medium capitalize mt-2">
                                                <User size={18} className="text-[#48A111]" /> 
                                                {loadingExtProfile ? <Loader2 size={14} className="animate-spin text-slate-400" /> : extProfile?.gender?.toLowerCase() || '—'}
                                            </div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:border-[#c5e3b0]">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account Role</p>
                                            <div className="flex items-center gap-2 text-slate-900 font-medium capitalize mt-2">
                                                <Shield size={18} className="text-[#48A111]" /> {user.role.replace('_', ' ').toLowerCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {pendingRequest && (
                                    <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                                        <p className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
                                            <Clock size={16} /> Pending Edit Request Overview
                                        </p>
                                        <div className="space-y-2">
                                            {pendingRequest.changes.map((c, i) => (
                                                <div key={i} className="flex items-center gap-3 text-sm bg-white p-3 rounded-xl border border-amber-100">
                                                    <span className="font-semibold text-amber-900 capitalize w-32 shrink-0">
                                                        {c.field.replace(/([A-Z])/g, ' $1')}:
                                                    </span>
                                                    <span className="text-slate-400 line-through truncate">{c.oldValue}</span>
                                                    <span className="text-amber-700 font-bold">→</span>
                                                    <span className="text-emerald-700 font-bold truncate">{c.newValue}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fellowship Life Tab */}
                        {activeTab === 'fellowship' && (
                            <div className="p-8 animate-fade-in space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Briefcase className="text-[#48A111]" size={24} /> Fellowship Life
                                    </h2>
                                    <div className="grid md:grid-cols-2 gap-5 mb-8">
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#e9f5e1] to-white border border-[#c5e3b0] shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-bold text-[#48A111] uppercase tracking-wider">Region</p>
                                                <div className="p-2 bg-white rounded-lg opacity-80 shadow-sm"><MapPin size={18} className="text-[#48A111]" /></div>
                                            </div>
                                            <p className="text-slate-900 font-bold text-xl">
                                                {loadingExtProfile ? <Loader2 size={18} className="animate-spin text-slate-400" /> : extProfile?.region?.name || 'Unassigned'}
                                            </p>
                                        </div>
                                        
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#e9f5e1] to-white border border-[#c5e3b0] shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-bold text-[#48A111] uppercase tracking-wider">Family Group</p>
                                                <div className="p-2 bg-white rounded-lg opacity-80 shadow-sm"><Users size={18} className="text-[#48A111]" /></div>
                                            </div>
                                            <p className="text-slate-900 font-bold text-xl">
                                                {loadingExtProfile ? <Loader2 size={18} className="animate-spin text-slate-400" /> : extProfile?.family?.name || 'Unassigned'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-5 rounded-3xl border border-slate-200 shadow-sm bg-white">
                                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                                                <User className="text-[#48A111]" size={20} />
                                                <h3 className="text-lg font-bold text-slate-900">Ministry Teams</h3>
                                            </div>
                                            {loadingExtProfile ? (
                                                <div className="flex gap-2 text-slate-400 py-3">
                                                    <Loader2 size={18} className="animate-spin" /> Fetching teams...
                                                </div>
                                            ) : extProfile?.teams?.length ? (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {extProfile.teams.map(t => (
                                                        <span key={t.id} className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200">
                                                            {t.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center rounded-xl bg-slate-50 border border-slate-100 border-dashed">
                                                    <p className="text-slate-500 font-medium">Not serving in any ministry team currently.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5 rounded-3xl border border-slate-200 shadow-sm bg-white">
                                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                                                <TagIcon className="text-[#48A111]" size={20} />
                                                <h3 className="text-lg font-bold text-slate-900">Special Tags</h3>
                                            </div>
                                            {loadingTags ? (
                                                <div className="flex gap-2 text-slate-400 py-3">
                                                    <Loader2 size={18} className="animate-spin" /> Fetching tags...
                                                </div>
                                            ) : tags.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {tags.map((tag) => (
                                                        <TagBadge key={tag.id} tag={tag} size="md" />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center rounded-xl bg-slate-50 border border-slate-100 border-dashed">
                                                    <p className="text-slate-500 font-medium">No special tags assigned.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Academic & Residence Tab */}
                        {activeTab === 'academic' && (
                            <div className="p-8 animate-fade-in space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <GraduationCap className="text-[#48A111]" size={24} /> Education & Housing
                                    </h2>
                                    
                                    {loadingAcademic || loadingExtProfile ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 size={32} className="text-[#48A111] animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row gap-5 md:items-center justify-between shadow-sm">
                                                <div className="flex gap-5 items-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#c5e3b0] flex items-center justify-center shrink-0 shadow-sm">
                                                        <Building className="text-[#48A111]" size={26} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Institution</p>
                                                        <p className="text-slate-900 font-extrabold text-lg">{academicStatus?.course?.durationYears ? extProfile?.academic?.collegeName || 'Unknown College' : 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row gap-5 md:items-center justify-between shadow-sm">
                                                <div className="flex gap-5 items-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#c5e3b0] flex items-center justify-center shrink-0 shadow-sm">
                                                        <BookOpen className="text-[#48A111]" size={26} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Course of Study</p>
                                                        <p className="text-slate-900 font-extrabold text-lg">{academicStatus?.course?.name || 'Not filled'}</p>
                                                        {academicStatus?.course?.durationYears && (
                                                            <p className="text-sm font-medium text-slate-500 mt-1">{academicStatus.course.durationYears} Year Program</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-5 pt-2">
                                                <div className="flex-1 p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-4 shadow-sm">
                                                    <Calendar className="text-[#48A111] shrink-0 mt-1" size={22} />
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Standing</p>
                                                        <p className="text-slate-900 font-bold text-lg">
                                                            {academicStatus?.currentYear ? `Year ${academicStatus.currentYear}` : '—'}
                                                        </p>
                                                        <div className="flex gap-2 mt-3">
                                                            {academicStatus?.isFinalist && (
                                                                <span className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#F2B50B]/20 text-yellow-900 border border-[#F2B50B]/40 uppercase tracking-wider">Finalist</span>
                                                            )}
                                                            {academicStatus?.isAlumni && (
                                                                <span className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#48A111]/10 text-[#48A111] border border-[#48A111]/30 uppercase tracking-wider">Alumni</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-4 shadow-sm">
                                                    <MapPin className="text-[#48A111] shrink-0 mt-1" size={22} />
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Residence</p>
                                                        <p className="text-slate-900 font-bold text-lg">
                                                            {extProfile?.residence?.name || extProfile?.hostelName || 'Not filled'}
                                                        </p>
                                                        {extProfile?.residence && (
                                                            <p className="text-sm font-medium text-slate-500 mt-1 capitalize">{extProfile.residence.type.toLowerCase()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="p-8 animate-fade-in space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Shield className="text-[#48A111]" size={24} /> Security Settings
                                    </h2>
                                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg">Account Password</p>
                                            <p className="text-sm font-medium text-slate-500 mt-1">Ensure your account uses a strong, unique password.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowPasswordModal(true)}
                                            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm whitespace-nowrap"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'campaigns' && <CampaignTab />}
                </div>

            </div>

            {/* Modals */}
            {showEditModal && !isManager && extProfile && (
                <EditRequestModal
                    isOpen={showEditModal}
                    currentProfile={{
                        fullName: user!.fullName,
                        email: user!.email,
                        phoneNumber: extProfile.phoneNumber,
                        hostelName: extProfile.hostelName,
                        region: extProfile.region,
                        residence: extProfile.residence,
                        academic: extProfile.academic,
                    }}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={fetchExtProfile}
                />
            )}

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </div>
    );
};

export default Profile;
