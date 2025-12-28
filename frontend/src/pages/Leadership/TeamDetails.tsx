import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Trash2, Loader, UserCheck, Mail, Phone } from 'lucide-react';
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">Loading team details...</p>
                </div>
            </div>
        );
    }

    if (!team) {
        return null;
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/leadership/teams"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Teams
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-teal-400 mb-2">{team.name}</h1>
                        {team.description && (
                            <p className="text-gray-400">{team.description}</p>
                        )}
                    </div>
                    {isFellowshipManager && (
                        <button
                            onClick={handleDeleteTeam}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Team Leader</h2>
                            {isFellowshipManager && (
                                <button
                                    onClick={() => setShowAssignLeaderModal(true)}
                                    className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                >
                                    {team.leader ? 'Change' : 'Assign'}
                                </button>
                            )}
                        </div>
                        {team.leader ? (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                <p className="text-green-400 font-medium mb-2">{team.leader.fullName}</p>
                                <div className="space-y-1 text-sm text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} />
                                        <span>{team.leader.email}</span>
                                    </div>
                                    {team.leader.phoneNumber && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} />
                                            <span>{team.leader.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                                {isFellowshipManager && (
                                    <button
                                        onClick={handleRemoveLeader}
                                        className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Remove Leader
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No team leader assigned</p>
                        )}
                    </div>

                    {/* Statistics */}
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Team Statistics</h2>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-400">Total Members</span>
                                    <span className="text-sm text-white font-medium">{team.stats.totalMembers}</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-400">Male</span>
                                    <span className="text-sm text-white font-medium">
                                        {team.stats.maleCount} ({team.stats.totalMembers > 0 ? Math.round((team.stats.maleCount / team.stats.totalMembers) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${team.stats.totalMembers > 0 ? (team.stats.maleCount / team.stats.totalMembers) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-400">Female</span>
                                    <span className="text-sm text-white font-medium">
                                        {team.stats.femaleCount} ({team.stats.totalMembers > 0 ? Math.round((team.stats.femaleCount / team.stats.totalMembers) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
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
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Users className="text-teal-400" size={24} />
                                <h2 className="text-2xl font-bold text-white">Members ({team.members.length})</h2>
                            </div>
                            {isFellowshipManager && (
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all"
                                >
                                    <UserPlus size={18} />
                                    Add Member
                                </button>
                            )}
                        </div>

                        {team.members.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="text-gray-600 mx-auto mb-4" size={48} />
                                <p className="text-gray-500 mb-4">No members in this team yet</p>
                                {isFellowshipManager && (
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                                    >
                                        Add Your First Member
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {team.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-white font-medium mb-1">
                                                    {member.fullName}
                                                    {team.leader?.id === member.id && (
                                                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                                            Leader
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Mail size={14} />
                                                        {member.email}
                                                    </span>
                                                    {member.phoneNumber && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={14} />
                                                            {member.phoneNumber}
                                                        </span>
                                                    )}
                                                    <span>#{member.fellowshipNumber}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {isFellowshipManager && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id, member.fullName)}
                                                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
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
