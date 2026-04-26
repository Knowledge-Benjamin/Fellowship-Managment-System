import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle, XCircle, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../api';
import { useAuth } from '../../../context/AuthContext';

interface FamilyTransferRequest {
    id: string;
    member: { fullName: string; fellowshipNumber: string; email: string; phoneNumber: string };
    fromFamilyId: string;
    fromFamily: { id: string; name: string };
    toFamilyId: string;
    toFamily: { id: string; name: string };
    status: 'PENDING_ORIGIN' | 'PENDING_DESTINATION' | 'REJECTED_BY_ORIGIN' | 'REJECTED_BY_DESTINATION' | 'COMPLETED';
    reason: string | null;
    createdAt: string;
}

interface Props {
    currentFamilyId: string;
}

const FamilyTransferManagementPanel: React.FC<Props> = ({ currentFamilyId }) => {
    const { isManager } = useAuth();
    const [transfers, setTransfers] = useState<FamilyTransferRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/family-transfers');
            setTransfers(res.data);
        } catch (error) {
            console.error('Failed to fetch family transfers:', error);
            toast.error('Failed to load family transfers');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id: string, type: 'origin' | 'destination', status: 'APPROVED' | 'REJECTED') => {
        setReviewingId(id);
        try {
            await api.patch(`/family-transfers/${id}/${type}`, {
                status,
                note: reviewNote.trim() || undefined
            });
            toast.success(`Transfer ${status.toLowerCase()}.`);
            setReviewNote('');
            setExpandedId(null);
            fetchTransfers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Failed to review transfer');
        } finally {
            setReviewingId(null);
        }
    };

    // Filter active ones that need attention from THIS user
    const pendingTransfers = transfers.filter(t => 
        (t.status === 'PENDING_ORIGIN' && (t.fromFamilyId === currentFamilyId || isManager)) ||
        (t.status === 'PENDING_DESTINATION' && (t.toFamilyId === currentFamilyId || isManager))
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading transfers...</div>;
    }

    if (pendingTransfers.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 py-10 text-center">
                <div className="w-16 h-16 bg-[#e9f5e1] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-[#48A111]" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Pending Transfers</h3>
                <p className="text-slate-500 mt-1 text-sm">There are no incoming or outgoing requests to review for your family.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-orange-50">
                    <Users className="text-orange-600" size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Family Transfers
                        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-bold uppercase tracking-wider border border-orange-200">
                            {pendingTransfers.length} Action Needed
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">Manage members moving between families</p>
                </div>
            </div>

            <div className="space-y-4">
                {pendingTransfers.map((t) => {
                    const isOutgoing = t.fromFamilyId === currentFamilyId;
                    const isIncoming = t.toFamilyId === currentFamilyId;
                    
                    // Determine Role type for this request
                    let actionType: 'origin' | 'destination' | null = null;
                    if (t.status === 'PENDING_ORIGIN' && (isOutgoing || isManager)) actionType = 'origin';
                    if (t.status === 'PENDING_DESTINATION' && (isIncoming || isManager)) actionType = 'destination';

                    // Aesthetic badging based on direction
                    const directionBadge = (actionType === 'origin') 
                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-200">Leaving</span>
                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">Joining</span>;

                    return (
                        <div key={t.id} className="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <button
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full font-bold flex items-center justify-center border bg-slate-50 border-slate-200 text-slate-700">
                                        {t.member.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900">{t.member.fullName}</p>
                                            {directionBadge}
                                        </div>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">#{t.member.fellowshipNumber}</p>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2 ml-4">
                                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">{t.fromFamily.name}</span>
                                        <ArrowRightLeft size={14} className="text-slate-400 shrink-0" />
                                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">{t.toFamily.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-400">
                                    <span className="hidden md:inline text-xs font-medium">Requested {new Date(t.createdAt).toLocaleDateString()}</span>
                                    {expandedId === t.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </button>

                            {/* Expanded Tools */}
                            {expandedId === t.id && (
                                <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-5 animate-fade-in">
                                    
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Member Details</p>
                                            <p className="font-bold text-slate-800">{t.member.fullName}</p>
                                            <p className="text-slate-600 mt-1">{t.member.email}</p>
                                            <p className="text-slate-600 font-mono text-xs mt-1">{t.member.phoneNumber}</p>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Users size={48} className="text-orange-900" />
                                            </div>
                                            <p className="text-xs font-bold text-orange-700/60 uppercase tracking-wider mb-2">Family Transfer Path</p>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold text-orange-900 ${actionType === 'origin' ? 'underline decoration-orange-300 underline-offset-4' : ''}`}>{t.fromFamily.name}</span>
                                                <ArrowRightLeft size={16} className="text-orange-400 shrink-0" />
                                                <span className={`font-bold text-orange-900 ${actionType === 'destination' ? 'underline decoration-orange-300 underline-offset-4' : ''}`}>{t.toFamily.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {t.reason && (
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Transfer</p>
                                            <p className="text-slate-800 italic leading-relaxed">"{t.reason}"</p>
                                        </div>
                                    )}

                                    {/* Action Box */}
                                    {actionType && (
                                        <div className="space-y-3 pt-2">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Review Note (Optional)</label>
                                                <textarea
                                                    value={reviewNote}
                                                    onChange={e => setReviewNote(e.target.value)}
                                                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#48A111] focus:border-transparent transition-all placeholder:text-slate-400 shadow-sm"
                                                    placeholder="Add a reason for acceptance or rejection..."
                                                    rows={2}
                                                />
                                            </div>
                                            
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleReview(t.id, actionType!, 'APPROVED')}
                                                    disabled={reviewingId === t.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#48A111] hover:bg-[#3d8c0e] text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                                                >
                                                    <CheckCircle size={18} /> {actionType === 'origin' ? 'Approve Departure' : 'Accept Arrival'}
                                                </button>
                                                <button
                                                    onClick={() => handleReview(t.id, actionType!, 'REJECTED')}
                                                    disabled={reviewingId === t.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-red-200 text-slate-700 hover:text-red-700 hover:border-red-300 hover:bg-red-50 font-bold rounded-xl transition-all disabled:opacity-50"
                                                >
                                                    <XCircle size={18} /> Reject Transfer
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FamilyTransferManagementPanel;
