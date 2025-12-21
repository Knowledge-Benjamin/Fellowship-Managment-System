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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-[#151d30] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-gradient-to-r from-teal-600 to-blue-600 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white">Record Salvation/Decision</h2>
                        <p className="text-teal-100 text-sm mt-1">{eventName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Member or Guest Selection */}
                    {isMember === null && (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-300">
                                Is this person a registered member?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsMember(true)}
                                    className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-teal-500/30"
                                >
                                    Yes, Member
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMember(false)}
                                    className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-orange-500/30"
                                >
                                    No, Guest
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Member Selection */}
                    {isMember === true && (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-300">
                                Search for Member <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                            />
                            {searchTerm && (
                                <select
                                    value={selectedMemberId}
                                    onChange={(e) => setSelectedMemberId(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white cursor-pointer transition-colors"
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
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Guest Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                                    placeholder="Enter guest name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Phone Number <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                                    placeholder="+256 700 000 000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                                    placeholder="guest@example.com"
                                />
                            </div>
                        </div>
                    )}

                    {/* Decision Details */}
                    {isMember !== null && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Decision Type <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={decisionType}
                                    onChange={(e) => setDecisionType(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white cursor-pointer transition-colors"
                                >
                                    <option value="SALVATION">Salvation</option>
                                    <option value="REDEDICATION">Rededication</option>
                                    <option value="BAPTISM_INTEREST">Baptism Interest</option>
                                    <option value="PRAYER_REQUEST">Prayer Request</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Counselor (Optional)
                                </label>
                                <select
                                    value={counselorId}
                                    onChange={(e) => setCounselorId(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white cursor-pointer transition-colors"
                                >
                                    <option value="">Select counselor</option>
                                    {members.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <input
                                    type="checkbox"
                                    id="baptismInterest"
                                    checked={baptismInterest}
                                    onChange={(e) => setBaptismInterest(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                                />
                                <label htmlFor="baptismInterest" className="text-sm text-slate-300 cursor-pointer">
                                    Interested in Baptism
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 resize-none transition-colors"
                                    placeholder="Additional notes or testimony..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Record'
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SalvationTrackingModal;
