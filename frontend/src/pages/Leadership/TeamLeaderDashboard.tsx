import React, { useState, useEffect } from 'react';
import { Users, Calendar, Mail, Phone, Hash, Loader2, User2, AlertCircle, Award } from 'lucide-react';
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

interface TeamData {
    id: string;
    name: string;
    description: string | null;
    leader: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    assistant?: {
        id: string;
        fullName: string;
    } | null;
    leaderTagName: string;
    memberTagName: string;
    members: Member[];
    stats: {
        totalMembers: number;
        maleCount: number;
        femaleCount: number;
    };
}

const TeamLeaderDashboard = () => {
    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMyTeam();
    }, []);

    const fetchMyTeam = async () => {
        try {
            setLoading(true);
            const response = await api.get('/teams/my-team');
            setTeam(response.data);
            setError(null);
        } catch (error: any) {
            console.error('Failed to fetch team:', error);
            if (error.response?.status === 404) {
                setError('You are not assigned as a team leader');
            } else {
                setError('Failed to load team data');
                toast.error('Failed to load team data');
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
                    <p className="text-gray-400">Loading your team...</p>
                </div>
            </div>
        );
    }

    if (error || !team) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card p-12 text-center">
                        <AlertCircle className="text-yellow-500 mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-white mb-2">No Team Assigned</h2>
                        <p className="text-gray-400 mb-6">
                            {error || 'You are not currently assigned as a team leader'}
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

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">My Team Dashboard</h1>
                    <p className="text-gray-400">
                        {team.name}
                    </p>
                    {team.description && (
                        <p className="text-gray-500 text-sm mt-1">{team.description}</p>
                    )}
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
                        <p className="text-3xl font-bold text-white">{team.stats.totalMembers}</p>
                        <p className="text-gray-400 text-sm">Total Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <User2 className="text-blue-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{team.stats.maleCount}</p>
                        <p className="text-gray-400 text-sm">Male Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                                <User2 className="text-pink-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{team.stats.femaleCount}</p>
                        <p className="text-gray-400 text-sm">Female Members</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Team Leader Info */}
                    <div className="glass-card p-6">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Award className="text-teal-400" size={24} />
                            Team Leader
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                                <p className="text-teal-400 text-sm font-medium mb-2">You are leading this team</p>
                                <p className="text-white font-bold text-lg mb-4">{team.leader.fullName}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Mail size={16} />
                                        <span className="text-sm">{team.leader.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Phone size={16} />
                                        <span className="text-sm">{team.leader.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                            {team.assistant && (
                                <div className="p-4 bg-gray-800/30 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Assistant</p>
                                    <p className="text-white font-medium">{team.assistant.fullName}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team Tags */}
                    <div className="glass-card p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">Team Tags</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <p className="text-gray-400 text-sm mb-1">Leader Tag</p>
                                <code className="text-purple-400 font-mono text-sm">{team.leaderTagName}</code>
                            </div>
                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                                <p className="text-gray-400 text-sm mb-1">Member Tag</p>
                                <code className="text-cyan-400 font-mono text-sm">{team.memberTagName}</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        Team Members ({team.members.length})
                    </h2>
                    {team.members.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {team.members.map((member) => (
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
                            <p>No members in this team yet</p>
                        </div>
                    )}
                </div>

                {/* Upcoming Services */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar className="text-teal-400" size={24} />
                        Upcoming Services
                    </h2>
                    <div className="space-y-3">
                        <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                            <p className="text-teal-400 font-medium">Sunday Service</p>
                            <p className="text-gray-400 text-sm mt-1">Next: This Sunday, 9:00 AM</p>
                            <p className="text-gray-500 text-xs mt-2">
                                {team.members.length} team members available
                            </p>
                        </div>
                        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <p className="text-purple-400 font-medium">Mid-Week Service</p>
                            <p className="text-gray-400 text-sm mt-1">Next: Wednesday, 6:00 PM</p>
                            <p className="text-gray-500 text-xs mt-2">
                                {team.members.length} team members available
                            </p>
                        </div>
                    </div>
                </div>

                {/* Gender Distribution */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Member Distribution</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-400">Male</span>
                                <span className="text-sm text-white font-medium">
                                    {team.stats.maleCount} ({Math.round((team.stats.maleCount / team.stats.totalMembers) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(team.stats.maleCount / team.stats.totalMembers) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-400">Female</span>
                                <span className="text-sm text-white font-medium">
                                    {team.stats.femaleCount} ({Math.round((team.stats.femaleCount / team.stats.totalMembers) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${(team.stats.femaleCount / team.stats.totalMembers) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamLeaderDashboard;
