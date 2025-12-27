import React, { useState, useEffect } from 'react';
import { Users, Building2, Loader, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

interface FamilyData {
    id: string;
    name: string;
    familyHead?: {
        id: string;
        fullName: string;
    };
    _count: {
        members: number;
    };
}

interface RegionData {
    id: string;
    name: string;
    families: FamilyData[];
    stats: {
        totalMembers: number;
        maleCount: number;
        femaleCount: number;
        totalFamilies: number;
    };
}

const RegionalDashboard = () => {
    const [region, setRegion] = useState<RegionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchMyRegion();
    }, []);

    const fetchMyRegion = async () => {
        try {
            setLoading(true);
            const response = await api.get('/regions/my-region');
            setRegion(response.data);
            setError(null);
        } catch (error: any) {
            console.error('Failed to fetch region:', error);
            if (error.response?.status === 404) {
                setError('You are not assigned as a regional head');
            } else {
                setError('Failed to load regional data');
                toast.error('Failed to load regional data');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">Loading your region...</p>
                </div>
            </div>
        );
    }

    if (error || !region) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card p-12 text-center">
                        <AlertCircle className="text-yellow-500 mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-white mb-2">No Region Assigned</h2>
                        <p className="text-gray-400 mb-6">
                            {error || 'You are not currently assigned as a regional head'}
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
                    <h1 className="text-4xl font-bold text-white mb-2">
                        {region.name} Region
                    </h1>
                    <p className="text-gray-400">
                        Your Regional Dashboard
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                        Last updated: {new Date().toLocaleTimeString()}
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                                <Users className="text-teal-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{region.stats.totalMembers}</p>
                        <p className="text-gray-400 text-sm">Total Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Users className="text-blue-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{region.stats.maleCount}</p>
                        <p className="text-gray-400 text-sm">Male Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                                <Users className="text-pink-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{region.stats.femaleCount}</p>
                        <p className="text-gray-400 text-sm">Female Members</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Building2 className="text-purple-400" size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{region.stats.totalFamilies}</p>
                        <p className="text-gray-400 text-sm">Total Families</p>
                    </div>
                </div>

                {/* Families List */}
                <div className="glass-card p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        Families in Your Region ({region.families.length})
                    </h2>
                    {region.families.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {region.families.map((family) => (
                                <Link
                                    key={family.id}
                                    to={`/leadership/families/${family.id}`}
                                    className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:border-teal-500/50 transition-all group"
                                >
                                    <h3 className="text-white font-bold group-hover:text-teal-400 transition-colors mb-3">
                                        {family.name}
                                    </h3>

                                    {/* Status Indicator */}
                                    <div className="flex items-center gap-2 mb-3">
                                        {family.familyHead ? (
                                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                                ✓ Has Head
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                                                ! No Head
                                            </span>
                                        )}
                                    </div>

                                    {family.familyHead && (
                                        <div className="bg-teal-500/10 border border-teal-500/30 rounded px-3 py-2 mb-3">
                                            <p className="text-xs text-gray-400 mb-1">Family Head</p>
                                            <p className="text-sm text-teal-400 font-medium">
                                                {family.familyHead.fullName}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                                        <span className="text-gray-400">Members</span>
                                        <span className="text-teal-400 font-bold text-lg">
                                            {family._count.members}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Building2 className="mx-auto mb-4 text-gray-600" size={48} />
                            <p>No families in this region yet</p>
                        </div>
                    )}
                </div>

                {/* Gender Distribution */}
                <div className="glass-card p-6 mt-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Region Member Distribution</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-400">Male</span>
                                <span className="text-sm text-white font-medium">
                                    {region.stats.maleCount} ({Math.round((region.stats.maleCount / region.stats.totalMembers) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(region.stats.maleCount / region.stats.totalMembers) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-400">Female</span>
                                <span className="text-sm text-white font-medium">
                                    {region.stats.femaleCount} ({Math.round((region.stats.femaleCount / region.stats.totalMembers) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${(region.stats.femaleCount / region.stats.totalMembers) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Note */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-400 text-sm">
                        <strong>Note:</strong> As a Regional Head, you can view families and members in your region.
                        To create families or assign family heads, please contact the Fellowship Manager.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegionalDashboard;
