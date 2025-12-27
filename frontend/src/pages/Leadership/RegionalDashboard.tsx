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
    } | null;
    _count: {
        members: number;
    };
}

interface RegionData {
    id: string;
    name: string;
    regionalHead?: {
        id: string;
        fullName: string;
    } | null;
    families: FamilyData[];
    _count: {
        members: number;
    };
}

const RegionalDashboard = () => {
    const { user } = useAuth();
    const [region, setRegion] = useState<RegionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMyRegion();
    }, []);

    const fetchMyRegion = async () => {
        try {
            // Get org structure and find region where user is the regional head
            const response = await api.get('/leadership/structure');
            const regions: RegionData[] = response.data.regions;

            const myRegion = regions.find(r => r.regionalHead?.id === user?.id);

            if (!myRegion) {
                setError('You are not assigned as a Regional Head');
            } else {
                setRegion(myRegion);
            }
        } catch (error) {
            console.error('Failed to fetch region:', error);
            toast.error('Failed to load your region');
            setError('Failed to load region data');
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
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="glass-card p-8 max-w-md text-center">
                    <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400 mb-6">
                        {error || 'You do not have access to this page'}
                    </p>
                    <p className="text-gray-500 text-sm">
                        You must be assigned as a Regional Head to access this dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold gradient-text mb-2">
                    {region.name} Region
                </h1>
                <p className="text-gray-400">
                    Your Regional Dashboard
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Members</p>
                            <p className="text-3xl font-bold text-white">{region._count.members}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                            <Users className="text-teal-400" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Families</p>
                            <p className="text-3xl font-bold text-white">{region.families.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Building2 className="text-purple-400" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Families with Heads</p>
                            <p className="text-3xl font-bold text-white">
                                {region.families.filter(f => f.familyHead).length}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Users className="text-blue-400" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Families Section */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Families in Your Region</h2>

                {region.families.length === 0 ? (
                    <div className="text-center py-12">
                        <Building2 className="text-gray-600 mx-auto mb-4" size={48} />
                        <p className="text-gray-500 mb-2">No families yet</p>
                        <p className="text-gray-600 text-sm">
                            Contact the Fellowship Manager to create families in your region
                        </p>
                    </div>
                ) : (
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
                )}
            </div>

            {/* Info Note */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                    <strong>Note:</strong> As a Regional Head, you can view families and members in your region.
                    To create families or assign family heads, please contact the Fellowship Manager.
                </p>
            </div>
        </div>
    );
};

export default RegionalDashboard;
