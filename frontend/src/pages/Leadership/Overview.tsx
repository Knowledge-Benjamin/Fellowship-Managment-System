import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Building2, UserCheck, Loader, UserPlus, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api';
import AssignRegionalHeadModal from '../../components/Leadership/AssignRegionalHeadModal';

interface Region {
    id: string;
    name: string;
    regionalHead?: {
        id: string;
        fullName: string;
    } | null;
    families: Array<{
        id: string;
        name: string;
        familyHead?: {
            id: string;
            fullName: string;
        } | null;
        _count: {
            members: number;
        };
    }>;
    _count: {
        members: number;
    };
}

interface MinistryTeam {
    id: string;
    name: string;
    leader?: {
        id: string;
        fullName: string;
    } | null;
    _count: {
        members: number;
    };
}

interface Stats {
    totalMembers: number;
    totalRegions: number;
    totalFamilies: number;
    totalTeams: number;
}

const LeadershipOverview = () => {
    const [regions, setRegions] = useState<Region[]>([]);
    const [ministryTeams, setMinistryTeams] = useState<MinistryTeam[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalMembers: 0,
        totalRegions: 0,
        totalFamilies: 0,
        totalTeams: 0,
    });
    const [loading, setLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => {
        fetchOrgStructure();
    }, []);

    const fetchOrgStructure = async () => {
        try {
            const response = await api.get('/leadership/structure');
            setRegions(response.data.regions);
            setMinistryTeams(response.data.ministryTeams);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch org structure:', error);
            toast.error('Failed to load organizational structure');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveRegionalHead = async (regionId: string) => {
        if (!confirm('Remove this regional head?')) return;

        try {
            await api.delete(`/leadership/regional-heads/${regionId}/remove`);
            toast.success('Regional head removed successfully');
            fetchOrgStructure();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove regional head');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">Loading structure...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header with Quick Actions */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-teal-400 mb-2">Leadership Structure</h1>
                        <p className="text-gray-400">Organizational hierarchy and team overview</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to="/leadership/teams"
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                            Manage Teams
                        </Link>
                        <Link
                            to="/leadership/families"
                            className="px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                        >
                            Manage Families
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Cards - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                            <Users className="text-teal-400" size={24} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalMembers}</p>
                    <p className="text-gray-400 text-sm">Total Members</p>
                </div>

                <Link to="/regions" className="glass-card p-6 hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <Building2 className="text-cyan-400" size={24} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalRegions}</p>
                    <p className="text-gray-400 text-sm">Regions</p>
                </Link>

                <Link to="/leadership/families" className="glass-card p-6 hover:border-green-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            <UserCheck className="text-green-400" size={24} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalFamilies}</p>
                    <p className="text-gray-400 text-sm">Families</p>
                </Link>

                <Link to="/leadership/teams" className="glass-card p-6 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <TrendingUp className="text-purple-400" size={24} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalTeams}</p>
                    <p className="text-gray-400 text-sm">Ministry Teams</p>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pastoral Structure */}
                <div className="glass-card p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Pastoral Structure</h2>
                    <div className="space-y-4">
                        {regions.map((region) => (
                            <div key={region.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-bold text-white">{region.name}</h3>
                                    <span className="text-gray-400 text-sm">
                                        {region._count.members} members
                                    </span>
                                </div>

                                {region.regionalHead ? (
                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded px-3 py-2 mb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-400">Regional Head</p>
                                                <p className="text-sm text-purple-400 font-medium">
                                                    {region.regionalHead.fullName}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRegion(region);
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                                                    title="Change Regional Head"
                                                >
                                                    Change
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveRegionalHead(region.id)}
                                                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                                    title="Remove Regional Head"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-700/30 border border-gray-600 rounded px-3 py-2 mb-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-500 italic">No regional head assigned</p>
                                            <button
                                                onClick={() => {
                                                    setSelectedRegion(region);
                                                    setShowAssignModal(true);
                                                }}
                                                className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                                            >
                                                <UserPlus size={14} />
                                                Assign Head
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Families List */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Families ({region.families.length})
                                    </p>
                                    {region.families.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {region.families.map(family => (
                                                <div key={family.id} className="p-2 bg-gray-800/40 rounded">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-white text-sm font-medium">{family.name}</span>
                                                        <span className="text-xs text-gray-500">{family._count.members} members</span>
                                                    </div>
                                                    {family.familyHead && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            Head: {family.familyHead.fullName}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">No families yet</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ministry Teams */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Ministry Teams</h2>
                        <Link
                            to="/leadership/teams"
                            className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                        >
                            Manage Teams →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {ministryTeams.length > 0 ? (
                            ministryTeams.map((team) => (
                                <div
                                    key={team.id}
                                    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 hover:border-teal-500/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-white font-medium mb-1">{team.name}</h3>
                                            {team.leader ? (
                                                <p className="text-sm text-gray-400">
                                                    Leader: {team.leader.fullName}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No leader assigned</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-teal-400">
                                                {team._count.members}
                                            </p>
                                            <p className="text-xs text-gray-500">members</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-gray-800/20 rounded-lg p-8 text-center">
                                <Users className="text-gray-600 mx-auto mb-3" size={32} />
                                <p className="text-gray-500 text-sm">No ministry teams yet</p>
                                <Link
                                    to="/leadership/teams"
                                    className="text-teal-400 hover:text-teal-300 text-sm mt-2 inline-block"
                                >
                                    Create your first team →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assign Regional Head Modal */}
            {selectedRegion && (
                <AssignRegionalHeadModal
                    isOpen={showAssignModal}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedRegion(null);
                    }}
                    onSuccess={() => {
                        fetchOrgStructure();
                    }}
                    region={selectedRegion}
                />
            )}
        </div>
    );
};

export default LeadershipOverview;
