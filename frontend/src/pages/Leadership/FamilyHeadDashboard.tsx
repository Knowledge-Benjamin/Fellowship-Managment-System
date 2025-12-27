import React, { useState, useEffect } from 'react';
import { Users, Calendar, MapPin, Mail, Phone, Hash, Loader2, User2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '../../api';

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
    const [family, setFamily] = useState<FamilyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMyFamily();
    }, []);

    const fetchMyFamily = async () => {
        try {
            setLoading(true);
            const response = await api.get('/families/my-family');
            setFamily(response.data);
            setError(null);
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
                    <div className="glass-card p-12 text-center">
                        <AlertCircle className="text-yellow-500 mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-white mb-2">No Family Assigned</h2>
                        <p className="text-gray-400 mb-6">
                            {error || 'You are not currently assigned as a family head'}
                        </p>
                        <Link
                            to="/profile"
                            className="inline-block px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-medium"
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
                    <h1 className="text-4xl font-bold text-white mb-2">My Family Dashboard</h1>
                    <p className="text-gray-400">
                        {family.name} • {family.region.name}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                        Last updated: {new Date().toLocaleTimeString()}
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                                <Users className="text-teal-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{family.stats.totalMembers}</p>
                        <p className="text-gray-400 text-sm">Total Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <User2 className="text-blue-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{family.stats.maleCount}</p>
                        <p className="text-gray-400 text-sm">Male Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                                <User2 className="text-pink-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{family.stats.femaleCount}</p>
                        <p className="text-gray-400 text-sm">Female Members</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Meeting Schedule */}
                    <div className="glass-card p-6">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar className="text-teal-400" size={24} />
                            Meeting Schedule
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-lg">
                                <Calendar className="text-cyan-400 mt-1" size={20} />
                                <div>
                                    <p className="text-gray-400 text-sm">Day</p>
                                    <p className="text-white font-medium">{formatDay(family.meetingDay)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-lg">
                                <Calendar className="text-cyan-400 mt-1" size={20} />
                                <div>
                                    <p className="text-gray-400 text-sm">Time</p>
                                    <p className="text-white font-medium">{family.meetingTime || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-lg">
                                <MapPin className="text-cyan-400 mt-1" size={20} />
                                <div>
                                    <p className="text-gray-400 text-sm">Venue</p>
                                    <p className="text-white font-medium">{family.meetingVenue || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Family Head Info */}
                    <div className="glass-card p-6">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Users className="text-teal-400" size={24} />
                            Family Head
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                                <p className="text-teal-400 text-sm font-medium mb-2">You are the head of this family</p>
                                <p className="text-white font-bold text-lg mb-4">{family.familyHead.fullName}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Mail size={16} />
                                        <span className="text-sm">{family.familyHead.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Phone size={16} />
                                        <span className="text-sm">{family.familyHead.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        Family Members ({family.members.length})
                    </h2>
                    {family.members.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {family.members.map((member) => (
                                <div
                                    key={member.id}
                                    className="p-4 bg-gray-800/40 rounded-lg border border-gray-700 hover:border-teal-500/50 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <Link
                                                to={`/members/${member.id}`}
                                                className="text-white font-bold hover:text-teal-400 transition-colors"
                                            >
                                                {member.fullName}
                                            </Link>
                                            <p className="text-gray-500 text-xs">#{member.fellowshipNumber}</p>
                                            <p className="text-gray-600 text-xs mt-1">
                                                Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${member.gender === 'MALE' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                                            }`}>
                                            {member.gender}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Mail size={14} />
                                            <span className="truncate">{member.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Phone size={14} />
                                            <span>{member.phoneNumber}</span>
                                        </div>
                                    </div>
                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`tel:${member.phoneNumber}`}
                                            className="flex-1 text-center text-xs px-3 py-2 bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors"
                                        >
                                            📞 Call
                                        </a>
                                        <a
                                            href={`mailto:${member.email}`}
                                            className="flex-1 text-center text-xs px-3 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                                        >
                                            ✉️ Email
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="mx-auto mb-4 text-gray-600" size={48} />
                            <p>No members in this family yet</p>
                        </div>
                    )}
                </div>

                {/* Gender Distribution */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Member Distribution</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-400">Male</span>
                                <span className="text-sm text-white font-medium">
                                    {family.stats.maleCount} ({Math.round((family.stats.maleCount / family.stats.totalMembers) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(family.stats.maleCount / family.stats.totalMembers) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-400">Female</span>
                                <span className="text-sm text-white font-medium">
                                    {family.stats.femaleCount} ({Math.round((family.stats.femaleCount / family.stats.totalMembers) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${(family.stats.femaleCount / family.stats.totalMembers) * 100}%` }}
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
