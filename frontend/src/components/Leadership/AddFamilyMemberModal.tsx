import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';

interface AddFamilyMemberModalProps {
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
    };
}

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
}

const AddFamilyMemberModal: React.FC<AddFamilyMemberModalProps> = ({
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
    }, [isOpen]);

    const fetchMembers = async () => {
        setFetchingMembers(true);
        try {
            const response = await api.get('/members');
            // Filter by region
            const filteredMembers = response.data.filter(
                (m: Member & { regionId: string }) => m.regionId === family.region.id
            );
            setMembers(filteredMembers);
        } catch (error) {
            console.error('Error fetching members:', error);
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
            await api.post(`/families/${family.id}/members`, {
                memberId: selectedMemberId,
            });

            const selectedMember = members.find(m => m.id === selectedMemberId);
            toast.success(`${selectedMember?.fullName} added to ${family.name}`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error adding member:', error);
            toast.error(error.response?.data?.message || 'Failed to add member');
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold gradient-text">Add Member</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {family.name} • {family.region.name}
                        </p>
                    </div>
                    {!loading && (
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Search */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Search Members in {family.region.name}
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, email, or fellowship number..."
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                            disabled={loading || fetchingMembers}
                        />
                    </div>

                    {/* Member Selection */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Select Member <span className="text-red-400">*</span>
                        </label>
                        {fetchingMembers ? (
                            <div className="text-center py-8 text-gray-400">
                                Loading members...
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto bg-gray-800/30 border border-gray-700 rounded-lg">
                                {filteredMembers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No members found
                                    </div>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <label
                                            key={member.id}
                                            className={`flex items-center p-3 cursor-pointer hover:bg-gray-700/30 transition-colors border-b border-gray-700 last:border-b-0 ${selectedMemberId === member.id ? 'bg-cyan-500/20' : ''
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="member"
                                                value={member.id}
                                                checked={selectedMemberId === member.id}
                                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                                className="mr-3"
                                                disabled={loading}
                                            />
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{member.fullName}</p>
                                                <p className="text-gray-400 text-sm">{member.email}</p>
                                            </div>
                                            <span className="text-gray-500 text-sm">
                                                #{member.fellowshipNumber}
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedMemberId || fetchingMembers}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {loading ? 'Adding...' : 'Add Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddFamilyMemberModal;
