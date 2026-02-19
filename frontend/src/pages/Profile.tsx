import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import api from '../api';
import QRCode from 'react-qr-code';
import { User, Mail, Hash, Shield, Tag as TagIcon, Loader2, BookOpen, GraduationCap, Download } from 'lucide-react';
import TagBadge from '../components/TagBadge';

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

const Profile = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loadingTags, setLoadingTags] = useState(true);
    const [academicStatus, setAcademicStatus] = useState<AcademicStatus | null>(null);
    const [loadingAcademic, setLoadingAcademic] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchUserTags();
            fetchAcademicStatus();
        }
    }, [user?.id]);

    const fetchUserTags = async () => {
        try {
            setLoadingTags(true);
            const response = await api.get(`/tags/members/${user?.id}/history`);
            // Filter only active tags
            const activeTags = response.data
                .filter((mt: any) => mt.isActive)
                .map((mt: any) => mt.tag);
            setTags(activeTags);
        } catch (error) {
            console.error('Failed to fetch user tags:', error);
            // Don't show error toast - tags are optional
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
            // Don't show error - this is optional info
        } finally {
            setLoadingAcademic(false);
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
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${user.fullName.replace(/\s+/g, '-')}-QR.png`;
            link.href = pngFile;
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">My Profile</h1>

            <div className="grid md:grid-cols-3 gap-8">
                {/* User Info Card */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: '#e9f5e1', color: '#48A111', outline: '1.5px solid #c5e3b0' }}>
                                {user.fullName.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{user.fullName}</h2>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mt-2" style={{ backgroundColor: '#e9f5e1', color: '#48A111', borderColor: '#c5e3b0' }}>
                                    {user.role.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <Mail style={{ color: '#48A111' }} size={24} />
                                <div>
                                    <p className="text-sm text-slate-500">Email Address</p>
                                    <p className="text-slate-900 font-medium">{user.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <Hash style={{ color: '#48A111' }} size={24} />
                                <div>
                                    <p className="text-sm text-slate-500">Fellowship Number</p>
                                    <p className="text-slate-900 font-medium font-mono">{user.fellowshipNumber}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <Shield style={{ color: '#48A111' }} size={24} />
                                <div>
                                    <p className="text-sm text-slate-500">Account Role</p>
                                    <p className="text-slate-900 font-medium">{user.role.replace('_', ' ')}</p>
                                </div>
                            </div>

                            {/* Academic Status Section */}
                            {loadingAcademic ? (
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <Loader2 className="animate-spin" style={{ color: '#48A111' }} size={24} />
                                    <div>
                                        <p className="text-sm text-slate-500">Loading academic status...</p>
                                    </div>
                                </div>
                            ) : academicStatus && academicStatus.currentYear !== null ? (
                                <>
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <GraduationCap style={{ color: '#48A111' }} size={24} />
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-500">Current Academic Standing</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-slate-900 font-medium text-lg">
                                                    Year {academicStatus.currentYear}, Semester {academicStatus.currentSemester}
                                                </p>
                                                {academicStatus.isFinalist && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                        Finalist
                                                    </span>
                                                )}
                                                {academicStatus.isAlumni && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                        Alumni
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {academicStatus.course && (
                                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <BookOpen style={{ color: '#48A111' }} size={24} />
                                            <div>
                                                <p className="text-sm text-slate-500">Course</p>
                                                <p className="text-slate-900 font-medium">{academicStatus.course.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">{academicStatus.course.durationYears} years</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : null}

                            {/* Tags Section */}
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <TagIcon className="mt-1" style={{ color: '#48A111' }} size={24} />
                                <div className="flex-1">
                                    <p className="text-sm text-slate-500 mb-3">Member Tags</p>
                                    {loadingTags ? (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-sm">Loading tags...</span>
                                        </div>
                                    ) : tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {tags.map((tag) => (
                                                <TagBadge key={tag.id} tag={tag} size="sm" />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No tags assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QR Code Card */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                        <div className="mb-6">
                            <QRCode
                                id="profile-qr-code"
                                value={user.qrCode}
                                size={200}
                            />
                        </div>
                        <h3 className="text-slate-900 font-bold text-xl mb-2">Your Check-in QR</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Show this code at the entrance to check in to events
                        </p>
                        <button
                            onClick={downloadQRCode}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold w-full justify-center shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                        >
                            <Download className="w-4 h-4" />
                            Download QR Code
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
