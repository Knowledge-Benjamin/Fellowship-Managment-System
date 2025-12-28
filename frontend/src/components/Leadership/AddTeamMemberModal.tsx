import React, { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';

interface AddTeamMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    team: {
        id: string;
        name: string;
        members: Array<{ id: string }>;
    };
}

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
}

const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    team,
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
            setMembers(response.data);
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
            await api.post(`/teams/${team.id}/members`, {
                memberId: selectedMemberId,
            });

            const selectedMember = members.find(m => m.id === selectedMemberId);
            toast.success(`${selectedMember?.fullName} added to ${team.name}`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error adding team member:', error);
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

    // Filter out existing team members and apply search
    const existingMemberIds = team.members.map(m => m.id);
    const filteredMembers = members.filter(member => {
        const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.fellowshipNumber.includes(searchQuery);

        const isNotInTeam = !existingMemberIds.includes(member.id);

        return matchesSearch && isNotInTeam;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-teal-400">Add Team Member</h2>
                        <p className="text-gray-400 text-sm mt-1">{team.name}</p>
                    </div>
                    {!loading && (
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X className="text-gray-400" size={20} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Search Members
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, or fellowship number..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                            />
                        </div>
                    </div>

                    {/* Member Selection */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Select Member to Add *
                        </label>
                        {fetchingMembers ? (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                <Loader2 className="animate-spin mr-2" size={20} />
                                Loading members...
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchQuery
                                    ? 'No members found matching your search'
                                    : 'All members are already in this team'}
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg">
                                {filteredMembers.map((member) => (
                                    <label
                                        key={member.id}
                                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800/50 transition-colors ${selectedMemberId === member.id ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="member"
                                            value={member.id}
                                            checked={selectedMemberId === member.id}
                                            onChange={(e) => setSelectedMemberId(e.target.value)}
                                            className="text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{member.fullName}</p>
                                            <p className="text-sm text-gray-400">{member.email}</p>
                                            <p className="text-xs text-gray-500">#{member.fellowshipNumber}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedMemberId || fetchingMembers}
                            className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {loading ? 'Adding...' : 'Add Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTeamMemberModal;
