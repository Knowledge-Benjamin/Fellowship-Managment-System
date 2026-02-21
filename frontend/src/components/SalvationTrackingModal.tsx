import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '../api';
import { useToast } from './ToastProvider';

interface SalvationTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventName: string;
    onSaved: () => void;
}

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
}

const SalvationTrackingModal: React.FC<SalvationTrackingModalProps> = ({
    isOpen,
    onClose,
    eventId,
    eventName,
    onSaved,
}) => {
    const { showToast } = useToast();
    const [isMember, setIsMember] = useState<boolean | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [counselorId, setCounselorId] = useState('');
    const [decisionType, setDecisionType] = useState('SALVATION');
    const [baptismInterest, setBaptismInterest] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen]);

    const fetchMembers = async () => {
        try {
            const response = await api.get('/members');
            setMembers(response.data);
        } catch (error) {
            console.error('Failed to fetch members:', error);
            showToast('error', 'Failed to fetch members');
        }
    };

    const filteredMembers = members.filter((member) =>
        member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phoneNumber.includes(searchTerm)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload: any = {
                eventId,
                decisionType,
                baptismInterest,
                notes: notes || undefined,
                counselorId: counselorId || undefined,
            };

            if (isMember) {
                payload.memberId = selectedMemberId;
            } else {
                payload.guestName = guestName;
                payload.guestPhone = guestPhone;
                payload.guestEmail = guestEmail || undefined;
            }

            await api.post('/salvations', payload);

            // Reset form
            setIsMember(null);
            setSelectedMemberId('');
            setGuestName('');
            setGuestPhone('');
            setGuestEmail('');
            setCounselorId('');
            setDecisionType('SALVATION');
            setBaptismInterest(false);
            setNotes('');
            setSearchTerm('');

            showToast('success', 'Salvation record saved successfully');
            onSaved();
        } catch (error: any) {
            console.error('Failed to save salvation:', error);
            showToast('error', error.response?.data?.error || 'Failed to save salvation record');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Record Salvation/Decision</h2>
                        <p className="text-slate-500 text-sm mt-1">{eventName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-2 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Member or Guest Selection */}
                    {isMember === null && (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700">
                                Is this person a registered member?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsMember(true)}
                                    className="px-4 py-3 bg-[#48A111] hover:bg-[#3d8b0e] text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
                                >
                                    Yes, Member
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMember(false)}
                                    className="px-4 py-3 bg-white border-2 border-[#48A111] text-[#48A111] hover:bg-green-50 rounded-xl font-semibold transition-all"
                                >
                                    No, Guest
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Member Selection */}
                    {isMember === true && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-semibold text-slate-700">
                                Search for Member <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 placeholder-slate-400 transition-all"
                            />
                            {searchTerm && (
                                <select
                                    value={selectedMemberId}
                                    onChange={(e) => setSelectedMemberId(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 cursor-pointer transition-all appearance-none"
                                >
                                    <option value="">Select a member</option>
                                    {filteredMembers.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullName} - {member.phoneNumber}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Guest Information */}
                    {isMember === false && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Guest Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 placeholder-slate-400 transition-all"
                                    placeholder="Enter guest name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 placeholder-slate-400 transition-all"
                                    placeholder="+256 700 000 000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 placeholder-slate-400 transition-all"
                                    placeholder="guest@example.com"
                                />
                            </div>
                        </div>
                    )}

                    {/* Decision Details */}
                    {isMember !== null && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4 pt-2 border-t border-slate-100">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Decision Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={decisionType}
                                    onChange={(e) => setDecisionType(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 cursor-pointer transition-all appearance-none"
                                >
                                    <option value="SALVATION">Salvation</option>
                                    <option value="REDEDICATION">Rededication</option>
                                    <option value="BAPTISM_INTEREST">Baptism Interest</option>
                                    <option value="PRAYER_REQUEST">Prayer Request</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Counselor (Optional)
                                </label>
                                <select
                                    value={counselorId}
                                    onChange={(e) => setCounselorId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 cursor-pointer transition-all appearance-none"
                                >
                                    <option value="">Select counselor</option>
                                    {members.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-2">
                                <input
                                    type="checkbox"
                                    id="baptismInterest"
                                    checked={baptismInterest}
                                    onChange={(e) => setBaptismInterest(e.target.checked)}
                                    className="w-5 h-5 rounded border-blue-200 text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer transition-colors"
                                />
                                <label htmlFor="baptismInterest" className="text-sm font-medium text-blue-900 cursor-pointer">
                                    Interested in Baptism
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 mt-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 placeholder-slate-400 resize-none transition-all"
                                    placeholder="Additional notes or testimony..."
                                />
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-600 rounded-xl font-semibold transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-[#48A111] hover:bg-[#3d8b0e] text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Record'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SalvationTrackingModal;
