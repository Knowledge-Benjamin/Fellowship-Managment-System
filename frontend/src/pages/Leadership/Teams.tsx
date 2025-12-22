import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import TeamCard from '../../components/Leadership/TeamCard';
import CreateTeamModal from '../../components/Leadership/CreateTeamModal';

interface Team {
    id: string;
    name: string;
    description?: string | null;
    leader?: {
        id: string;
        fullName: string;
        email: string;
    } | null;
    _count: {
        members: number;
    };
}

const TeamsManagement = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const response = await api.get('/teams');
            setTeams(response.data);
        } catch (error) {
            console.error('Failed to fetch teams:', error);
            toast.error('Failed to load teams');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        if (!confirm(`Are you sure you want to delete "${team.name}"?\n\nThis will:\n- Remove all members\n- Deactivate team tags\n- Preserve history for auditing`)) {
            return;
        }

        try {
            await api.delete(`/teams/${teamId}`);
            toast.success(`${team.name} deleted successfully`);
            fetchTeams();
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
                    <p className="text-gray-400">Loading teams...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Ministry Teams</h1>
                        <p className="text-gray-400">
                            Manage fellowship-wide service teams
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-teal-500/50"
                    >
                        <Plus size={20} />
                        Create Team
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Teams</p>
                                <p className="text-3xl font-bold text-white">{teams.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                                <Users className="text-teal-400" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Teams with Leaders</p>
                                <p className="text-3xl font-bold text-white">
                                    {teams.filter(t => t.leader).length}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Users className="text-blue-400" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Members</p>
                                <p className="text-3xl font-bold text-white">
                                    {teams.reduce((sum, t) => sum + t._count.members, 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Users className="text-purple-400" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <AlertCircle className="text-gray-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">No Teams Yet</h3>
                    <p className="text-gray-400 mb-6">
                        Create your first ministry team to get started
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all inline-flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Create Team
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team) => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            onDelete={handleDeleteTeam}
                        />
                    ))}
                </div>
            )}

            {/* Create Team Modal */}
            <CreateTeamModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchTeams}
            />
        </div>
    );
};

export default TeamsManagement;
