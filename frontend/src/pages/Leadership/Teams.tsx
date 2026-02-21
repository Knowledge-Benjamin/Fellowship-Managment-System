import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import TeamCard from '../../components/Leadership/TeamCard';
import CreateTeamModal from '../../components/Leadership/CreateTeamModal';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Team {
    id: string;
    name: string;
    description?: string | null;
    leader?: { id: string; fullName: string; email: string } | null;
    _count: { members: number };
}

const TeamsManagement = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => { fetchTeams(); }, []);

    const fetchTeams = async () => {
        try {
            const response = await api.get('/teams');
            setTeams(response.data);
        } catch {
            toast.error('Failed to load teams');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        if (!confirm(`Delete "${team.name}"? This will remove all members and deactivate team tags.`)) return;
        try {
            await api.delete(`/teams/${teamId}`);
            toast.success(`${team.name} deleted`);
            fetchTeams();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete team');
        }
    };

    if (loading) return <LoadingSpinner message="Loading teams..." />;

    const totalMembers = teams.reduce((s, t) => s + t._count.members, 0);
    const teamsWithLeaders = teams.filter(t => t.leader).length;

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ministry Teams</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage fellowship-wide service teams</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: '#48A111' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#48A111')}
                >
                    <Plus size={18} />
                    Create Team
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Total Teams', value: teams.length, icon: Shield, bg: 'bg-purple-50', color: 'text-purple-500' },
                    { label: 'With Leaders', value: teamsWithLeaders, icon: UserCheck, bg: 'bg-[#e9f5e1]', color: 'text-[#48A111]' },
                    { label: 'Total Members', value: totalMembers, icon: Users, bg: 'bg-blue-50', color: 'text-blue-500' },
                ].map(({ label, value, icon: Icon, bg, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                            <Icon size={22} className={color} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Teams Yet</h3>
                    <p className="text-slate-500 mb-6 text-sm">Create your first ministry team to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: '#48A111' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#48A111')}
                    >
                        <Plus size={18} />
                        Create First Team
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {teams.map(team => (
                        <TeamCard key={team.id} team={team} onDelete={handleDeleteTeam} />
                    ))}
                </div>
            )}

            <CreateTeamModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchTeams}
            />
        </div>
    );
};

export default TeamsManagement;
