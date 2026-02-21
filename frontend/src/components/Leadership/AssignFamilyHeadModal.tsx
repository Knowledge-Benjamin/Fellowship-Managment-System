import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';

interface AssignFamilyHeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    family: {
        id: string;
        name: string;
        region: {
            id: string;
            name: string;
        };
        familyHead?: {
            id: string;
            fullName: string;
        } | null;
    };
}

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
    region?: { id: string; name: string };
}

const AssignFamilyHeadModal: React.FC<AssignFamilyHeadModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    family,
}) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingMembers, setFetchingMembers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen, family.region.id]);

    const fetchMembers = async () => {
        setFetchingMembers(true);
        try {
            // regionId is enforced server-side — DB returns only members in this region
            const response = await api.get(`/members?regionId=${family.region.id}`);
            setMembers(response.data);
        } catch (error) {
            toast.error('Failed to load members');
        } finally {
            setFetchingMembers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedMemberId) {
            toast.error('Please select a member');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/families/${family.id}/assign-head`, {
                memberId: selectedMemberId,
            });

            const selectedMember = members.find(m => m.id === selectedMemberId);
            toast.success(`${selectedMember?.fullName} assigned as head of ${family.name}`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error assigning family head:', error);
            toast.error(error.response?.data?.message || 'Failed to assign family head');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setSelectedMemberId('');
            setSearchQuery('');
            onClose();
        }
    };

    const filteredMembers = members.filter(member =>
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.fellowshipNumber.includes(searchQuery)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: '#e9f5e1' }}>
                            <UserCheck className="w-5 h-5" style={{ color: '#48A111' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {family.familyHead ? 'Change' : 'Assign'} Family Head
                            </h2>
                            <p className="text-slate-500 text-sm">{family.name} · {family.region.name}</p>
                        </div>
                    </div>
                    {!loading && (
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Current head banner */}
                    {family.familyHead && (
                        <div className="rounded-xl p-4 border" style={{ backgroundColor: '#e9f5e1', borderColor: '#c5e3b0' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#48A111' }}>Current Family Head</p>
                            <p className="text-slate-900 font-medium">{family.familyHead.fullName}</p>
                        </div>
                    )}

                    {/* Search */}
                    <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-1.5">
                            Search Members in {family.region.name}
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, email, or fellowship number..."
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#48A111'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                            disabled={loading || fetchingMembers}
                        />
                    </div>

                    {/* Member list */}
                    <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-1.5">
                            Select New Family Head <span className="text-red-400">*</span>
                        </label>
                        {fetchingMembers ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                                Loading members...
                            </div>
                        ) : members.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                                No members found in {family.region.name}
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                                {filteredMembers.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        No members match your search
                                    </div>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <label
                                            key={member.id}
                                            className={`flex items-center p-3 cursor-pointer transition-colors ${selectedMemberId === member.id
                                                ? 'bg-[#e9f5e1]'
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="member"
                                                value={member.id}
                                                checked={selectedMemberId === member.id}
                                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                                className="mr-3 accent-[#48A111]"
                                                disabled={loading}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 font-medium text-sm truncate">{member.fullName}</p>
                                                <p className="text-slate-400 text-xs">{member.email}</p>
                                            </div>
                                            <span className="text-slate-400 text-xs ml-2 shrink-0">
                                                #{member.fellowshipNumber}
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="shrink-0 mt-0.5" style={{ color: '#48A111' }} size={18} />
                            <div className="text-sm">
                                <p className="font-semibold text-slate-700 mb-1">Auto-Tags Applied</p>
                                <div className="text-slate-500 space-y-0.5">
                                    <p>• <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">FAMILY_HEAD</code> tag assigned</p>
                                    <p>• Member auto-added to family (if not already)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedMemberId || fetchingMembers}
                            className="flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#48A111')}
                        >
                            {loading ? 'Assigning...' : family.familyHead ? 'Change Head' : 'Assign Head'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignFamilyHeadModal;
