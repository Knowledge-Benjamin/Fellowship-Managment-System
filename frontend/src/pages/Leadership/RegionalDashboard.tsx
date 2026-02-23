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
            <div className="max-w-4xl mx-auto animate-fade-in p-6">
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="text-amber-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">No Region Assigned</h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">
                        {error || 'You are not currently assigned as a regional head'}
                    </p>
                    <Link
                        to="/profile"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-white font-semibold shadow-md hover:scale-[1.02] transition-all"
                        style={{ backgroundColor: '#48A111' }}
                    >
                        Go to Profile
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                            {region.name} Region
                        </h1>
                        <p className="text-slate-500">
                            Your Regional Dashboard
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-xs mt-1">
                            Last updated: {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#e9f5e1] rounded-2xl p-6 border border-[#c5e3b0] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <Users size={24} style={{ color: '#48A111' }} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{region.stats.totalMembers}</p>
                        <p className="text-slate-600 font-medium text-sm mt-1">Total Members</p>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <Users size={24} className="text-blue-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{region.stats.maleCount}</p>
                        <p className="text-slate-600 font-medium text-sm mt-1">Male Members</p>
                    </div>

                    <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <Users size={24} className="text-pink-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{region.stats.femaleCount}</p>
                        <p className="text-slate-600 font-medium text-sm mt-1">Female Members</p>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <Building2 size={24} className="text-amber-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{region.stats.totalFamilies}</p>
                        <p className="text-slate-600 font-medium text-sm mt-1">Total Families</p>
                    </div>
                </div>

                {/* Families List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-[#e9f5e1]">
                            <Building2 size={20} style={{ color: '#48A111' }} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Families in Your Region <span className="text-slate-400 font-normal">({region.families.length})</span>
                        </h2>
                    </div>

                    {region.families.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {region.families.map((family) => (
                                <Link
                                    key={family.id}
                                    to={`/leadership/families/${family.id}`}
                                    className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all group block"
                                >
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#48A111] transition-colors mb-3">
                                        {family.name}
                                    </h3>

                                    {/* Status Indicator */}
                                    <div className="flex items-center gap-2 mb-4">
                                        {family.familyHead ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-[#e9f5e1] text-[#48A111] border border-[#48A111]/20 rounded-full">
                                                <CheckCircle size={12} />
                                                Has Head
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                                                <AlertCircle size={12} />
                                                No Head
                                            </span>
                                        )}
                                    </div>

                                    {family.familyHead && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                                            <p className="text-xs font-medium text-slate-500 mb-0.5">Family Head</p>
                                            <p className="text-sm text-slate-900 font-semibold">
                                                {family.familyHead.fullName}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-100">
                                        <span className="text-slate-500 font-medium">Members</span>
                                        <span className="font-bold text-lg" style={{ color: '#48A111' }}>
                                            {family._count.members}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-2xl">
                            <Building2 className="text-slate-400 mx-auto mb-4" size={48} />
                            <p className="text-slate-500">No families in this region yet</p>
                        </div>
                    )}
                </div>

                {/* Edit Requests Panel */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-50">
                                <Edit2 className="text-amber-500" size={20} />
                            </div>
                            Profile Edit Requests
                            {editRequests.length > 0 && (
                                <span className="text-sm px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-semibold">
                                    {editRequests.length} pending
                                </span>
                            )}
                        </h2>
                    </div>

                    {loadingRequests ? (
                        <div className="text-center py-8 text-slate-500">Loading requests…</div>
                    ) : editRequests.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-2xl">
                            <CheckCircle className="mx-auto mb-3" style={{ color: '#48A111' }} size={40} />
                            <p className="text-slate-500 font-medium">No pending edit requests</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {editRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                                >
                                    {/* Request header — always visible */}
                                    <button
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                        onClick={() =>
                                            setExpandedRequestId(
                                                expandedRequestId === req.id ? null : req.id
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm border border-amber-100">
                                                {req.member.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-bold">{req.member.fullName}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{req.member.fellowshipNumber}</p>
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                                {req.changes.map((c, i) => (
                                                    <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium capitalize">
                                                        {c.field.replace(/([A-Z])/g, ' $1')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <span className="text-xs font-medium">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </span>
                                            {expandedRequestId === req.id
                                                ? <ChevronUp size={20} className="text-slate-600" />
                                                : <ChevronDown size={20} className="text-slate-600" />}
                                        </div>
                                    </button>

                                    {/* Expanded detail */}
                                    {expandedRequestId === req.id && (
                                        <div className="px-5 pb-5 border-t border-slate-100 mt-0 pt-5 space-y-5 bg-slate-50">
                                            {/* Changes diff */}
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Changes Requested</p>
                                                {req.changes.map((c, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm">
                                                        <span className="font-semibold text-slate-700 capitalize w-32">
                                                            {c.field.replace(/([A-Z])/g, ' $1')}
                                                        </span>
                                                        <span className="text-slate-400 line-through truncate max-w-[150px]">{c.oldValue || '—'}</span>
                                                        <span className="font-bold shrink-0" style={{ color: '#48A111' }}>→ {c.newValue}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Reason */}
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                                <p className="text-xs font-bold text-amber-600 mb-1.5 uppercase tracking-wider">Member's Reason</p>
                                                <p className="text-sm text-amber-900 leading-relaxed font-medium">{req.reason}</p>
                                            </div>

                                            {/* Review note */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                    Review Note (optional)
                                                </label>
                                                <textarea
                                                    value={reviewNote}
                                                    onChange={(e) => setReviewNote(e.target.value)}
                                                    placeholder="Leave a note for the member…"
                                                    rows={2}
                                                    maxLength={500}
                                                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400"
                                                />
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => handleReview(req.id, 'APPROVED')}
                                                    disabled={reviewingId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all disabled:opacity-60 hover:scale-[1.02]"
                                                    style={{ backgroundColor: '#48A111' }}
                                                >
                                                    <CheckCircle size={18} />
                                                    {reviewingId === req.id ? 'Processing…' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => handleReview(req.id, 'REJECTED')}
                                                    disabled={reviewingId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 text-sm font-bold transition-all disabled:opacity-60"
                                                >
                                                    <XCircle size={18} />
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Region Member Distribution</h2>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-500">Male</span>
                                <span className="text-sm text-slate-900 font-bold">
                                    {region.stats.maleCount} ({Math.round((region.stats.maleCount / region.stats.totalMembers) * 100 || 0)}%)
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(region.stats.maleCount / region.stats.totalMembers) * 100 || 0}% ` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-500">Female</span>
                                <span className="text-sm text-slate-900 font-bold">
                                    {region.stats.femaleCount} ({Math.round((region.stats.femaleCount / region.stats.totalMembers) * 100 || 0)}%)
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${(region.stats.femaleCount / region.stats.totalMembers) * 100 || 0}% ` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Note */}
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-blue-900 text-sm font-medium leading-relaxed">
                            <strong className="font-bold text-blue-950">Note:</strong> As a Regional Head, you can view families and members in your region.
                            To create families or assign family heads, please contact the Fellowship Manager.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegionalDashboard;
