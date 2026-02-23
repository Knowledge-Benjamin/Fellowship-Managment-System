import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Mail, Phone, Hash, Loader2, User2, AlertCircle, Award } from 'lucide-react';
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
    const navigate = useNavigate();
    const { hasTeamLeaderTag, hasTeamMemberTag } = useAuth();
    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        try {
            setLoading(true);

            // Check if user is a team leader or just a member
            if (hasTeamLeaderTag()) {
                // Leader - fetch from leader dashboard endpoint
                const response = await api.get('/teams/my-team');
                setTeam(response.data);
                setError(null);
            } else if (hasTeamMemberTag()) {
                // Regular member - fetch from member endpoint and redirect to detail page
                const response = await api.get('/teams/my-team-member');
                const teamData = response.data;
                // Redirect to team detail page
                navigate(`/leadership/teams/${teamData.id}`, { replace: true });
                return;
            } else {
                // Not assigned to any team
                setError('You are not currently assigned to any team');
            }
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
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
                        <AlertCircle className="text-amber-500 mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Team Assigned</h2>
                        <p className="text-slate-500 mb-6">
                            {error || 'You are not currently assigned as a team leader'}
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

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">My Team Dashboard</h1>
                    <p className="text-slate-600 font-medium text-lg">
                        {team.name}
                    </p>
                    {team.description && (
                        <p className="text-slate-500 mt-1">{team.description}</p>
                    )}
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
                        <p className="text-3xl font-bold text-slate-900">{team.stats.totalMembers}</p>
                        <p className="text-slate-500 font-medium text-sm mt-1">Total Members</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <User2 className="text-blue-500" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{team.stats.maleCount}</p>
                        <p className="text-slate-500 font-medium text-sm mt-1">Male Members</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                                <User2 className="text-pink-500" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{team.stats.femaleCount}</p>
                        <p className="text-slate-500 font-medium text-sm mt-1">Female Members</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Team Leader Info */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Award size={24} style={{ color: '#48A111' }} />
                            Team Leader
                        </h2>
                        <div className="space-y-4">
                            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: '#48A111' }}></div>
                                <p className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: '#48A111' }}>You are leading this team</p>
                                <p className="text-slate-900 font-bold text-lg mb-4">{team.leader.fullName}</p>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-slate-500">
                                        <Mail size={16} />
                                        <span className="text-sm font-medium">{team.leader.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-slate-500">
                                        <Phone size={16} />
                                        <span className="text-sm font-medium">{team.leader.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                            {team.assistant && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1">Assistant</p>
                                    <p className="text-slate-900 font-bold">{team.assistant.fullName}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team Tags */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Team Tags</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                <p className="text-purple-600/70 text-xs font-bold uppercase tracking-wide mb-1.5">Leader Tag</p>
                                <code className="text-purple-700 font-mono text-sm font-semibold">{team.leaderTagName}</code>
                            </div>
                            <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                                <p className="text-cyan-600/70 text-xs font-bold uppercase tracking-wide mb-1.5">Member Tag</p>
                                <code className="text-cyan-700 font-mono text-sm font-semibold">{team.memberTagName}</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                        Team Members <span className="text-slate-400 font-normal">({team.members.length})</span>
                    </h2>
                    {team.members.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {team.members.map((member) => (
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
                            <p className="text-slate-500">No members in this team yet</p>
                        </div>
                    )}
                </div>

                {/* Upcoming Services */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar size={24} style={{ color: '#48A111' }} />
                        Upcoming Services
                    </h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: '#48A111' }}></div>
                            <p className="font-bold text-slate-900">Sunday Service</p>
                            <p className="text-slate-500 text-sm mt-1">Next: This Sunday, 9:00 AM</p>
                            <p className="text-slate-400 font-medium text-xs mt-2">
                                {team.members.length} team members available
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                            <p className="font-bold text-slate-900">Mid-Week Service</p>
                            <p className="text-slate-500 text-sm mt-1">Next: Wednesday, 6:00 PM</p>
                            <p className="text-slate-400 font-medium text-xs mt-2">
                                {team.members.length} team members available
                            </p>
                        </div>
                    </div>
                </div>

                {/* Gender Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Member Distribution</h2>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-500">Male</span>
                                <span className="text-sm text-slate-900 font-bold">
                                    {team.stats.maleCount} ({Math.round((team.stats.maleCount / team.stats.totalMembers) * 100) || 0}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(team.stats.maleCount / team.stats.totalMembers) * 100 || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-500">Female</span>
                                <span className="text-sm text-slate-900 font-bold">
                                    {team.stats.femaleCount} ({Math.round((team.stats.femaleCount / team.stats.totalMembers) * 100) || 0}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${(team.stats.femaleCount / team.stats.totalMembers) * 100 || 0}%` }}
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
