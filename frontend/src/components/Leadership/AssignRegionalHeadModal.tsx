import React, { useState, useEffect } from 'react';
import { X, Crown, AlertCircle, Search, Users, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';

interface AssignRegionalHeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    region: {
        id: string;
        name: string;
        regionalHead?: { id: string; fullName: string } | null;
    };
}

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
    region?: { id: string; name: string } | null;
}

const AssignRegionalHeadModal: React.FC<AssignRegionalHeadModalProps> = ({
    isOpen, onClose, onSuccess, region,
}) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingMembers, setFetchingMembers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) fetchMembers();
    }, [isOpen, region.id]);

    const fetchMembers = async () => {
        setFetchingMembers(true);
        try {
            // regionId is enforced server-side — DB returns only members in this region
            const response = await api.get(`/members?regionId=${region.id}`);
            setMembers(response.data);
        } catch {
            toast.error('Failed to load members');
        } finally {
            setFetchingMembers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId) { toast.error('Please select a member'); return; }
        setLoading(true);
        try {
            await api.post('/leadership/regional-heads/assign', {
                regionId: region.id,
                memberId: selectedMemberId,
            });
            toast.success('Regional head assigned successfully');
            onSuccess();
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to assign regional head');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setSelectedMemberId('');
        setSearchQuery('');
        onClose();
    };

    const filteredMembers = members.filter(m =>
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.fellowshipNumber.includes(searchQuery)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50">
                            <Crown size={18} className="text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {region.regionalHead ? 'Change' : 'Assign'} Regional Head
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">{region.name} Region</p>
                        </div>
                    </div>
                    {!loading && (
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Current head banner */}
                    {region.regionalHead && (
                        <div className="rounded-xl px-4 py-3 border bg-purple-50 border-purple-100">
                            <p className="text-xs font-semibold text-purple-600 mb-0.5">Current Regional Head</p>
                            <p className="text-slate-900 font-semibold text-sm">{region.regionalHead.fullName}</p>
                        </div>
                    )}

                    {/* Member count context */}
                    {!fetchingMembers && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                            <Users size={13} className="text-slate-400" />
                            <span>
                                Showing <strong className="text-slate-700">{members.length}</strong> members in {region.name}
                            </span>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, email, or number..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition-all"
                            onFocus={e => { e.currentTarget.style.borderColor = '#48A111'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                            disabled={loading || fetchingMembers}
                        />
                    </div>

                    {/* Member list */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Select New Regional Head <span className="text-red-400 normal-case">*</span>
                        </label>

                        {fetchingMembers ? (
                            <div className="flex items-center justify-center py-10 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
                                <svg className="animate-spin w-4 h-4 mr-2 text-[#48A111]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                                Loading members…
                            </div>
                        ) : members.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
                                No members found in {region.name}
                            </div>
                        ) : (
                            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
                                {filteredMembers.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        No members match your search
                                    </div>
                                ) : filteredMembers.map((member) => (
                                    <label
                                        key={member.id}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${selectedMemberId === member.id
                                            ? 'bg-[#e9f5e1]'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        {/* Custom radio visual */}
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedMemberId === member.id
                                            ? 'border-[#48A111] bg-[#48A111]'
                                            : 'border-slate-300 bg-white'
                                            }`}>
                                            {selectedMemberId === member.id && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <input
                                            type="radio"
                                            name="member"
                                            value={member.id}
                                            checked={selectedMemberId === member.id}
                                            onChange={(e) => setSelectedMemberId(e.target.value)}
                                            className="sr-only"
                                            disabled={loading}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-900 font-semibold text-sm truncate">{member.fullName}</p>
                                            <p className="text-slate-400 text-xs truncate">{member.email}</p>
                                        </div>
                                        <span className="text-slate-400 text-xs shrink-0 font-mono">#{member.fellowshipNumber}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-start gap-3">
                        <AlertCircle size={15} className="shrink-0 mt-0.5 text-slate-400" />
                        <div className="text-xs text-slate-500">
                            <p className="font-semibold text-slate-600 mb-0.5">Auto-Tag Applied</p>
                            The selected member will receive the{' '}
                            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">REGIONAL_HEAD</code> tag automatically.
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedMemberId || fetchingMembers}
                            className="flex-1 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                            onMouseLeave={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#48A111'; }}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    Assigning…
                                </>
                            ) : (
                                <>
                                    <UserCheck size={16} />
                                    {region.regionalHead ? 'Change Head' : 'Assign Head'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignRegionalHeadModal;
