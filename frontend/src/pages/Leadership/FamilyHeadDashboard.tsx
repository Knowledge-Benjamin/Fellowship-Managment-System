import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, MapPin, Mail, Phone, Hash, Loader2, User2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

interface Member {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    fellowshipNumber: string;
    gender: 'MALE' | 'FEMALE';
    joinedAt: string;
}

interface FamilyData {
    id: string;
    name: string;
    region: {
        id: string;
        name: string;
    };
    familyHead: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    meetingDay: string | null;
    meetingTime: string | null;
    meetingVenue: string | null;
    members: Member[];
    stats: {
        totalMembers: number;
        maleCount: number;
        femaleCount: number;
    };
}

const FamilyHeadDashboard = () => {
    const navigate = useNavigate();
    const { hasTag, hasFamilyMemberTag } = useAuth();
    const [family, setFamily] = useState<FamilyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFamilyData();
    }, []);

    const fetchFamilyData = async () => {
        try {
            setLoading(true);

            // Check if user is a family head or just a member
            if (hasTag('FAMILY_HEAD')) {
                // Head - fetch from head dashboard endpoint
                const response = await api.get('/families/my-family');
                setFamily(response.data);
                setError(null);
            } else if (hasFamilyMemberTag()) {
                // Regular member - fetch from member endpoint and redirect to detail page
                const response = await api.get('/families/my-family-member');
                const familyData = response.data;
                // Redirect to family detail page
                navigate(`/leadership/families/${familyData.id}`, { replace: true });
                return;
            } else {
                // Not assigned to any family
                setError('You are not currently assigned to any family');
            }
        } catch (error: any) {
            console.error('Failed to fetch family:', error);
            if (error.response?.status === 404) {
                setError('You are not assigned as a family head');
            } else {
                setError('Failed to load family data');
                toast.error('Failed to load family data');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">Loading your family...</p>
                </div>
            </div>
        );
    }

    if (error || !family) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
                        <AlertCircle className="text-amber-500 mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Family Assigned</h2>
                        <p className="text-slate-500 mb-6">
                            {error || 'You are not currently assigned as a family head'}
                        </p>
                        <Link
                            to="/profile"
                            className="inline-block px-6 py-3 rounded-xl text-white font-semibold shadow-md transition-all hover:scale-[1.02]"
                            style={{ backgroundColor: '#48A111' }}
                        >
                            Go to Profile
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const formatDay = (day: string | null) => {
        if (!day) return 'Not set';
        return day.charAt(0) + day.slice(1).toLowerCase();
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">My Family Dashboard</h1>
                    <p className="text-slate-600 font-medium text-lg">
                        {family.name} • {family.region.name}
                    </p>
                    <p className="text-slate-400 text-xs mt-1.5">
                        Last updated: {new Date().toLocaleTimeString()}
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#e9f5e1] flex items-center justify-center">
                                <Users size={24} style={{ color: '#48A111' }} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{family.stats.totalMembers}</p>
                        <p className="text-slate-500 font-medium text-sm mt-1">Total Members</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <User2 className="text-blue-500" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{family.stats.maleCount}</p>
                        <p className="text-slate-500 font-medium text-sm mt-1">Male Members</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                                <User2 className="text-pink-500" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{family.stats.femaleCount}</p>
                        <p className="text-slate-500 font-medium text-sm mt-1">Female Members</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Meeting Schedule */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Calendar size={24} style={{ color: '#48A111' }} />
                            Meeting Schedule
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <Calendar className="text-slate-400 mt-1" size={20} />
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Day</p>
                                    <p className="text-slate-900 font-bold">{formatDay(family.meetingDay)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <Calendar className="text-slate-400 mt-1" size={20} />
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Time</p>
                                    <p className="text-slate-900 font-bold">{family.meetingTime || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <MapPin className="text-slate-400 mt-1" size={20} />
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Venue</p>
                                    <p className="text-slate-900 font-bold">{family.meetingVenue || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Family Head Info */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Users size={24} style={{ color: '#48A111' }} />
                            Family Head
                        </h2>
                        <div className="space-y-4">
                            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: '#48A111' }}></div>
                                <p className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: '#48A111' }}>You are the head of this family</p>
                                <p className="text-slate-900 font-bold text-lg mb-4">{family.familyHead.fullName}</p>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-slate-500">
                                        <Mail size={16} />
                                        <span className="text-sm font-medium">{family.familyHead.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-slate-500">
                                        <Phone size={16} />
                                        <span className="text-sm font-medium">{family.familyHead.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                        Family Members <span className="text-slate-400 font-normal">({family.members.length})</span>
                    </h2>
                    {family.members.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {family.members.map((member) => (
                                <div
                                    key={member.id}
                                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <Link
                                                to={`/members/${member.id}`}
                                                className="text-slate-900 font-bold group-hover:text-[#48A111] transition-colors"
                                            >
                                                {member.fullName}
                                            </Link>
                                            <p className="text-slate-400 text-xs mt-0.5">#{member.fellowshipNumber}</p>
                                            <p className="text-slate-400 text-xs mt-1.5">
                                                Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${member.gender === 'MALE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
                                            }`}>
                                            {member.gender}
                                        </span>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2.5 text-slate-500 text-sm">
                                            <Mail size={14} className="text-slate-400" />
                                            <span className="truncate">{member.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-slate-500 text-sm">
                                            <Phone size={14} className="text-slate-400" />
                                            <span>{member.phoneNumber}</span>
                                        </div>
                                    </div>
                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                        <a
                                            href={`tel:${member.phoneNumber}`}
                                            className="flex-1 text-center text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                                        >
                                            📞 Call
                                        </a>
                                        <a
                                            href={`mailto:${member.email}`}
                                            className="flex-1 text-center text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                                        >
                                            ✉️ Email
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
                            <Users className="mx-auto mb-4 text-slate-400" size={48} />
                            <p className="text-slate-500">No members in this family yet</p>
                        </div>
                    )}
                </div>

                {/* Gender Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Member Distribution</h2>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-500">Male</span>
                                <span className="text-sm text-slate-900 font-bold">
                                    {family.stats.maleCount} ({Math.round((family.stats.maleCount / family.stats.totalMembers) * 100) || 0}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(family.stats.maleCount / family.stats.totalMembers) * 100 || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-500">Female</span>
                                <span className="text-sm text-slate-900 font-bold">
                                    {family.stats.femaleCount} ({Math.round((family.stats.femaleCount / family.stats.totalMembers) * 100) || 0}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${(family.stats.femaleCount / family.stats.totalMembers) * 100 || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FamilyHeadDashboard;
