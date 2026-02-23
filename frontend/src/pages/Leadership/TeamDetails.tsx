import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Trash2, Loader, UserCheck, UserX, Mail, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '../../api';
import AssignTeamLeaderModal from '../../components/Leadership/AssignTeamLeaderModal';
import AddTeamMemberModal from '../../components/Leadership/AddTeamMemberModal';
import { useAuth } from '../../context/AuthContext';

interface TeamMember {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    fellowshipNumber: string;
    gender: 'MALE' | 'FEMALE';
    joinedAt: string;
}

interface TeamDetails {
    id: string;
    name: string;
    description?: string | null;
    leader?: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    } | null;
    assistant?: {
        id: string;
        fullName: string;
    } | null;
    leaderTagName: string;
    memberTagName: string;
    members: TeamMember[];
    stats: {
        totalMembers: number;
        maleCount: number;
        femaleCount: number;
    };
}

const TeamDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [team, setTeam] = useState<TeamDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    const isFellowshipManager = user?.role === 'FELLOWSHIP_MANAGER';

    useEffect(() => {
        if (id) {
            fetchTeamDetails();
        }
    }, [id]);

    const fetchTeamDetails = async () => {
        try {
            const response = await api.get(`/teams/${id}`);
            setTeam(response.data);
        } catch (error) {
            console.error('Failed to fetch team:', error);
            toast.error('Failed to load team details');
            navigate('/leadership/teams');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLeader = async () => {
        if (!team?.leader) return;

        if (!confirm(`Remove ${team.leader.fullName} as team leader?\n\nThis will deactivate their team leader tag.`)) {
            return;
        }

        try {
            await api.delete(`/teams/${id}/remove-leader`);
            toast.success('Team leader removed');
            fetchTeamDetails();
        } catch (error: any) {
            console.error('Error removing leader:', error);
            toast.error(error.response?.data?.message || 'Failed to remove leader');
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName} from ${team?.name}?\n\nThis will deactivate their team member tag.`)) {
            return;
        }

        try {
            await api.delete(`/teams/${id}/members/${memberId}`);
            toast.success(`${memberName} removed from team`);
            fetchTeamDetails();
        } catch (error: any) {
            console.error('Error removing member:', error);
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleDeleteTeam = async () => {
        if (!team) return;

        if (!confirm(`Are you sure you want to delete "${team.name}"?\n\nThis will:\n- Remove all members\n- Deactivate team tags\n- Preserve history for auditing`)) {
            return;
        }

        try {
            await api.delete(`/teams/${id}`);
            toast.success(`${team.name} deleted successfully`);
            navigate('/leadership/teams');
        } catch (error: any) {
            console.error('Error deleting team:', error);
            toast.error(error.response?.data?.message || 'Failed to delete team');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <Loader className="animate-spin mx-auto mb-4" style={{ color: '#48A111' }} size={40} />
                    <p className="text-slate-500">Loading team details...</p>
                </div>
            </div>
        );
    }

    if (!team) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/leadership/teams"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Teams
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{team.name}</h1>
                        {team.description && (
                            <p className="text-slate-500">{team.description}</p>
                        )}
                    </div>
                    {isFellowshipManager && (
                        <button
                            onClick={handleDeleteTeam}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm"
                        >
                            Delete Team
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Info & Stats */}
                <div className="space-y-6">
                    {/* Team Leader */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Team Leader</h2>
                            {isFellowshipManager && (
                                <button
                                    onClick={() => setShowAssignLeaderModal(true)}
                                    className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    {team.leader ? 'Change' : 'Assign'}
                                </button>
                            )}
                        </div>
                        {team.leader ? (
                            <div className="bg-[#e9f5e1] border border-[#c5e3b0] rounded-xl p-4">
                                <p className="font-bold text-slate-900 mb-2">{team.leader.fullName}</p>
                                <div className="space-y-1.5 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        <span>{team.leader.email}</span>
                                    </div>
                                    {team.leader.phoneNumber && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400" />
                                            <span>{team.leader.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                                {isFellowshipManager && (
                                    <button
                                        onClick={handleRemoveLeader}
                                        className="mt-3 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        Remove Leader
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <UserX size={20} className="text-slate-400" />
                                <span className="text-slate-500 italic text-sm">No team leader assigned</span>
                            </div>
                        )}
                    </div>

                    {/* Statistics */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-5">Team Statistics</h2>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-500">Total Members</span>
                                    <span className="text-sm text-slate-900 font-bold">{team.stats.totalMembers}</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-500">Male</span>
                                    <span className="text-sm text-slate-900 font-bold">
                                        {team.stats.maleCount} ({team.stats.totalMembers > 0 ? Math.round((team.stats.maleCount / team.stats.totalMembers) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${team.stats.totalMembers > 0 ? (team.stats.maleCount / team.stats.totalMembers) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-500">Female</span>
                                    <span className="text-sm text-slate-900 font-bold">
                                        {team.stats.femaleCount} ({team.stats.totalMembers > 0 ? Math.round((team.stats.femaleCount / team.stats.totalMembers) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-pink-500 transition-all duration-500"
                                        style={{ width: `${team.stats.totalMembers > 0 ? (team.stats.femaleCount / team.stats.totalMembers) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Members */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-[#e9f5e1]">
                                    <Users size={20} style={{ color: '#48A111' }} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Members <span className="text-slate-400 font-normal">({team.members.length})</span></h2>
                            </div>
                            {isFellowshipManager && (
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow-md transition-all hover:scale-[1.02] text-sm"
                                    style={{ backgroundColor: '#48A111' }}
                                >
                                    <UserPlus size={16} />
                                    Add Member
                                </button>
                            )}
                        </div>

                        {team.members.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-2xl">
                                <Users className="text-slate-400 mx-auto mb-4" size={48} />
                                <p className="text-slate-500 mb-4">No members in this team yet</p>
                                {isFellowshipManager && (
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
                                    >
                                        Add Your First Member
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {team.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-slate-900 font-bold mb-1.5 text-lg group-hover:text-[#48A111] transition-colors">
                                                    {member.fullName}
                                                    {team.leader?.id === member.id && (
                                                        <span className="ml-2.5 text-xs px-2.5 py-1 bg-[#e9f5e1] text-[#48A111] border border-[#48A111]/20 rounded-full font-semibold align-middle">
                                                            Leader
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 mb-2">
                                                    <span className="flex items-center gap-1.5">
                                                        <Mail size={14} className="text-slate-400" />
                                                        {member.email}
                                                    </span>
                                                    {member.phoneNumber && (
                                                        <span className="flex items-center gap-1.5">
                                                            <Phone size={14} className="text-slate-400" />
                                                            {member.phoneNumber}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-400">#{member.fellowshipNumber}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-400">
                                                    Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {isFellowshipManager && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id, member.fullName)}
                                                    className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                                                    title="Remove from team"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isFellowshipManager && (
                <>
                    <AssignTeamLeaderModal
                        isOpen={showAssignLeaderModal}
                        onClose={() => setShowAssignLeaderModal(false)}
                        onSuccess={fetchTeamDetails}
                        team={team}
                    />
                    <AddTeamMemberModal
                        isOpen={showAddMemberModal}
                        onClose={() => setShowAddMemberModal(false)}
                        onSuccess={fetchTeamDetails}
                        team={team}
                    />
                </>
            )}
        </div>
    );
};

export default TeamDetails;
