import React, { useState, useEffect } from 'react';
import { Users, Building2, AlertCircle, MapPin, Clock, CheckCircle, XCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

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

interface EditChange {
    field: string;
    oldValue: string;
    newValue: string;
}

interface EditRequest {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    changes: EditChange[];
    reason: string;
    createdAt: string;
    member: {
        id: string;
        fullName: string;
        fellowshipNumber: string;
        email: string;
    };
}

const RegionalDashboard = () => {
    const [region, setRegion] = useState<RegionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchMyRegion();
        fetchEditRequests();
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

    const fetchEditRequests = async () => {
        try {
            setLoadingRequests(true);
            const response = await api.get('/members/edit-requests?status=PENDING');
            setEditRequests(response.data);
        } catch (error: any) {
            console.error('Failed to fetch edit requests:', error);
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleReview = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        setReviewingId(requestId);
        try {
            await api.patch(`/members/edit-requests/${requestId}`, {
                status,
                reviewNote: reviewNote.trim() || undefined,
            });
            toast.success(`Request ${status.toLowerCase()} successfully.`);
            setReviewNote('');
            setExpandedRequestId(null);
            setEditRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (error: any) {
            const msg = error.response?.data?.message || `Failed to ${status.toLowerCase()} request`;
            toast.error(msg);
        } finally {
            setReviewingId(null);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading your region..." />;
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
                                    to={`/ leadership / families / ${family.id} `}
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

                {/* Edit Requests Panel */}
                <div className="glass-card p-6 mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Edit2 className="text-amber-400" size={24} />
                            Profile Edit Requests
                            {editRequests.length > 0 && (
                                <span className="text-sm px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    {editRequests.length} pending
                                </span>
                            )}
                        </h2>
                    </div>

                    {loadingRequests ? (
                        <div className="text-center py-8 text-gray-400">Loading requests…</div>
                    ) : editRequests.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <CheckCircle className="mx-auto mb-3 text-green-600" size={40} />
                            <p>No pending edit requests</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {editRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className="bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden"
                                >
                                    {/* Request header — always visible */}
                                    <button
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors"
                                        onClick={() =>
                                            setExpandedRequestId(
                                                expandedRequestId === req.id ? null : req.id
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                                                {req.member.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">{req.member.fullName}</p>
                                                <p className="text-xs text-gray-400 font-mono">{req.member.fellowshipNumber}</p>
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                                {req.changes.map((c, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded capitalize">
                                                        {c.field.replace(/([A-Z])/g, ' $1')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-500">
                                            <span className="text-xs">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </span>
                                            {expandedRequestId === req.id
                                                ? <ChevronUp size={16} />
                                                : <ChevronDown size={16} />}
                                        </div>
                                    </button>

                                    {/* Expanded detail */}
                                    {expandedRequestId === req.id && (
                                        <div className="px-4 pb-4 border-t border-gray-700 mt-0 pt-4 space-y-4">
                                            {/* Changes diff */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Changes Requested</p>
                                                {req.changes.map((c, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg text-sm">
                                                        <span className="font-medium text-gray-300 capitalize w-28">
                                                            {c.field.replace(/([A-Z])/g, ' $1')}
                                                        </span>
                                                        <span className="text-gray-500 line-through">{c.oldValue || '—'}</span>
                                                        <span className="text-teal-400 font-medium">→ {c.newValue}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Reason */}
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                <p className="text-xs font-semibold text-amber-400 mb-1">Member's Reason</p>
                                                <p className="text-sm text-gray-300">{req.reason}</p>
                                            </div>

                                            {/* Review note */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
                                                    Review Note (optional)
                                                </label>
                                                <textarea
                                                    value={reviewNote}
                                                    onChange={(e) => setReviewNote(e.target.value)}
                                                    placeholder="Leave a note for the member…"
                                                    rows={2}
                                                    maxLength={500}
                                                    className="w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-600 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleReview(req.id, 'APPROVED')}
                                                    disabled={reviewingId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                                                >
                                                    <CheckCircle size={16} />
                                                    {reviewingId === req.id ? 'Processing…' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => handleReview(req.id, 'REJECTED')}
                                                    disabled={reviewingId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                                                >
                                                    <XCircle size={16} />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
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
                                    style={{ width: `${(region.stats.maleCount / region.stats.totalMembers) * 100}% ` }}
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
                                    style={{ width: `${(region.stats.femaleCount / region.stats.totalMembers) * 100}% ` }}
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
