import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api';

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

            onSaved();
        } catch (error: any) {
            console.error('Failed to save salvation:', error);
            alert(error.response?.data?.error || 'Failed to save salvation record');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-white">Record Salvation/Decision</h2>
                        <p className="text-purple-100 text-sm mt-1">{eventName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Member or Guest Selection */}
                    {isMember === null && (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">
                                Is this person a registered member?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsMember(true)}
                                    className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all"
                                >
                                    Yes, Member
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMember(false)}
                                    className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all"
                                >
                                    No, Guest
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Member Selection */}
                    {isMember === true && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Select Member
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsMember(null)}
                                    className="text-xs text-teal-600 hover:text-teal-700"
                                >
                                    Change
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <select
                                value={selectedMemberId}
                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">-- Select Member --</option>
                                {filteredMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.fullName} ({member.phoneNumber})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Guest Information */}
                    {isMember === false && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Guest Information
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsMember(null)}
                                    className="text-xs text-teal-600 hover:text-teal-700"
                                >
                                    Change
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Full Name *"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number *"
                                value={guestPhone}
                                onChange={(e) => setGuestPhone(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <input
                                type="email"
                                placeholder="Email (optional)"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    )}

                    {/* Decision Type */}
                    {isMember !== null && (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Decision Type
                                </label>
                                <select
                                    value={decisionType}
                                    onChange={(e) => setDecisionType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="SALVATION">Salvation</option>
                                    <option value="REDEDICATION">Rededication</option>
                                    <option value="BAPTISM_INTEREST">Baptism Interest</option>
                                    <option value="PRAYER_REQUEST">Prayer Request</option>
                                </select>
                            </div>

                            {/* Counselor */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Counselor (Optional)
                                </label>
                                <select
                                    value={counselorId}
                                    onChange={(e) => setCounselorId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">-- Select Counselor (Optional) --</option>
                                    {members.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Baptism Interest */}
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="baptismInterest"
                                    checked={baptismInterest}
                                    onChange={(e) => setBaptismInterest(e.target.checked)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <label htmlFor="baptismInterest" className="text-sm font-medium text-gray-700">
                                    Interested in Baptism
                                </label>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Additional notes..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Saving...' : 'Save & Close'}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSubmit(e).then(() => {
                                        // Don't close modal, allow adding another
                                    });
                                }}
                                className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save & Add Another
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SalvationTrackingModal;
