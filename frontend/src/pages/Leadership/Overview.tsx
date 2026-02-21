import React, { useState, useEffect } from 'react';
import {
    Users, UserCheck, Building2, TrendingUp, UserPlus, UserMinus,
    ChevronRight, Crown, Shield, Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api';
import AssignRegionalHeadModal from '../../components/Leadership/AssignRegionalHeadModal';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Region {
    id: string;
    name: string;
    regionalHead?: { id: string; fullName: string } | null;
    families: Array<{
        id: string;
        name: string;
        familyHead?: { id: string; fullName: string } | null;
        _count: { members: number };
    }>;
    _count: { members: number };
}

interface MinistryTeam {
    id: string;
    name: string;
    leader?: { id: string; fullName: string } | null;
    _count: { members: number };
}

interface Stats {
    totalMembers: number;
    totalRegions: number;
    totalFamilies: number;
    totalTeams: number;
}

const StatCard = ({
    value, label, icon: Icon, iconBg, iconColor, to
}: {
    value: number; label: string; icon: React.ElementType;
    iconBg: string; iconColor: string; to?: string;
}) => {
    const inner = (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-all">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon size={24} className={iconColor} />
            </div>
            <div>
                <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-sm text-slate-500 mt-1">{label}</p>
            </div>
        </div>
    );
    return to ? <Link to={to} className="group">{inner}</Link> : <div>{inner}</div>;
};

const LeadershipOverview = () => {
    const [regions, setRegions] = useState<Region[]>([]);
    const [ministryTeams, setMinistryTeams] = useState<MinistryTeam[]>([]);
    const [stats, setStats] = useState<Stats>({ totalMembers: 0, totalRegions: 0, totalFamilies: 0, totalTeams: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => { fetchOrgStructure(); }, []);

    const fetchOrgStructure = async () => {
        try {
            const response = await api.get('/leadership/structure');
            setRegions(response.data.regions);
            setMinistryTeams(response.data.ministryTeams);
            setStats(response.data.stats);
        } catch {
            toast.error('Failed to load organizational structure');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveRegionalHead = async (regionId: string) => {
        if (!confirm('Remove this regional head?')) return;
        try {
            await api.delete(`/leadership/regional-heads/${regionId}/remove`);
            toast.success('Regional head removed');
            fetchOrgStructure();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove regional head');
        }
    };

    if (loading) return <LoadingSpinner message="Loading structure..." />;

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leadership Structure</h1>
                    <p className="text-slate-500 mt-1 text-sm">Organizational hierarchy and ministry overview</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/leadership/teams"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                    >
                        <Shield size={16} />
                        Manage Teams
                    </Link>
                    <Link
                        to="/leadership/families"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: '#48A111' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#48A111')}
                    >
                        <Home size={16} />
                        Manage Families
                    </Link>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard value={stats.totalMembers} label="Total Members" icon={Users} iconBg="bg-[#e9f5e1]" iconColor="text-[#48A111]" />
                <StatCard value={stats.totalRegions} label="Regions" icon={Building2} iconBg="bg-blue-50" iconColor="text-blue-500" to="/regions" />
                <StatCard value={stats.totalFamilies} label="Families" icon={UserCheck} iconBg="bg-yellow-50" iconColor="text-yellow-600" to="/leadership/families" />
                <StatCard value={stats.totalTeams} label="Ministry Teams" icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-500" to="/leadership/teams" />
            </div>

            {/* Main content 2-col */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Pastoral Structure ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-[#e9f5e1]">
                                <Crown size={18} className="text-[#48A111]" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 text-base">Pastoral Structure</h2>
                                <p className="text-xs text-slate-500">{regions.length} regions</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                        {regions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                No regions configured yet
                            </div>
                        ) : regions.map(region => (
                            <div key={region.id} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                {/* Region header */}
                                <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                            <Building2 size={14} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm">{region.name}</p>
                                            <p className="text-xs text-slate-400">{region._count.members} members</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                        {region.families.length} {region.families.length === 1 ? 'family' : 'families'}
                                    </span>
                                </div>

                                <div className="px-4 py-3 space-y-2">
                                    {/* Regional Head */}
                                    {region.regionalHead ? (
                                        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                                                    <Crown size={12} className="text-purple-500" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-purple-700">Regional Head</p>
                                                    <p className="text-sm text-slate-800 font-medium">{region.regionalHead.fullName}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => { setSelectedRegion(region); setShowAssignModal(true); }}
                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 text-xs font-semibold transition-all"
                                                >
                                                    Change
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveRegionalHead(region.id)}
                                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                    title="Remove"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-100">
                                            <p className="text-xs text-amber-600 italic">No regional head assigned</p>
                                            <button
                                                onClick={() => { setSelectedRegion(region); setShowAssignModal(true); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                                                style={{ backgroundColor: '#48A111' }}
                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#48A111')}
                                            >
                                                <UserPlus size={13} /> Assign
                                            </button>
                                        </div>
                                    )}

                                    {/* Families list */}
                                    {region.families.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            {region.families.map(family => (
                                                <div key={family.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <Home size={12} className="text-slate-400" />
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800">{family.name}</p>
                                                            {family.familyHead && (
                                                                <p className="text-xs text-slate-400">Head: {family.familyHead.fullName}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-medium">{family._count.members}m</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Ministry Teams ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-50">
                                <Shield size={18} className="text-purple-500" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 text-base">Ministry Teams</h2>
                                <p className="text-xs text-slate-500">{ministryTeams.length} active teams</p>
                            </div>
                        </div>
                        <Link
                            to="/leadership/teams"
                            className="flex items-center gap-1 text-sm font-semibold text-[#48A111] hover:text-[#F2B50B] transition-colors"
                        >
                            Manage <ChevronRight size={16} />
                        </Link>
                    </div>

                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                        {ministryTeams.length === 0 ? (
                            <div className="text-center py-14">
                                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                                    <Users size={24} className="text-purple-400" />
                                </div>
                                <p className="text-slate-500 text-sm mb-3">No ministry teams yet</p>
                                <Link
                                    to="/leadership/teams"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#48A111')}
                                >
                                    Create your first team →
                                </Link>
                            </div>
                        ) : ministryTeams.map(team => (
                            <Link
                                key={team.id}
                                to={`/leadership/teams/${team.id}`}
                                className="flex items-center justify-between bg-slate-50 hover:bg-white rounded-xl px-4 py-3.5 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                        <Shield size={16} className="text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm group-hover:text-[#48A111] transition-colors">{team.name}</p>
                                        {team.leader ? (
                                            <p className="text-xs text-slate-500">Leader: {team.leader.fullName}</p>
                                        ) : (
                                            <p className="text-xs text-amber-500 italic">No leader assigned</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-slate-900">{team._count.members}</p>
                                        <p className="text-xs text-slate-400">members</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-[#48A111] transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {selectedRegion && (
                <AssignRegionalHeadModal
                    isOpen={showAssignModal}
                    onClose={() => { setShowAssignModal(false); setSelectedRegion(null); }}
                    onSuccess={fetchOrgStructure}
                    region={selectedRegion}
                />
            )}
        </div>
    );
};

export default LeadershipOverview;
