import React, { useState, useEffect } from 'react';
import { X, Plus, Search, UserCheck } from 'lucide-react';
import api from '../api';
import { useToast } from './ToastProvider';

interface Volunteer {
    id: string;
    memberId: string;
    eventId: string;
    member: {
        id: string;
        fullName: string;
        email: string;
        fellowshipNumber: string;
    };
}

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
}

interface VolunteerManagerProps {
    eventId: string;
    onClose: () => void;
}

const VolunteerManager: React.FC<VolunteerManagerProps> = ({ eventId, onClose }) => {
    const { showToast } = useToast();
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchVolunteers();
    }, [eventId]);

    const fetchVolunteers = async () => {
        try {
            const response = await api.get(`/volunteers/${eventId}/volunteers`);
            setVolunteers(response.data);
        } catch (error) {
            console.error('Failed to fetch volunteers:', error);
            showToast('error', 'Failed to load volunteers');
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const response = await api.get(`/members?search=${searchQuery}`);
            setSearchResults(response.data);
        } catch (error) {
            console.error('Search failed:', error);
            showToast('error', 'Failed to search members');
        } finally {
            setLoading(false);
        }
    };

    const addVolunteer = async (memberId: string) => {
        try {
            await api.post(`/volunteers/${eventId}/volunteers`, { memberId });
            showToast('success', 'Volunteer added successfully');
            fetchVolunteers();
            setSearchResults([]);
            setSearchQuery('');
        } catch (error: any) {
            console.error('Failed to add volunteer:', error);
            showToast('error', error.response?.data?.error || 'Failed to add volunteer');
        }
    };

    const removeVolunteer = async (memberId: string) => {
        if (!window.confirm('Are you sure you want to remove this volunteer?')) return;

        try {
            await api.delete(`/volunteers/${eventId}/volunteers/${memberId}`);
            showToast('success', 'Volunteer removed successfully');
            fetchVolunteers();
        } catch (error) {
            console.error('Failed to remove volunteer:', error);
            showToast('error', 'Failed to remove volunteer');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#151d30]/95 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-teal-400" />
                        Manage Check-in Volunteers
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Add Volunteer Section */}
                    <div className="mb-8">
                        <h3 className="text-sm font-medium text-slate-300 mb-3">Add New Volunteer</h3>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="w-full pl-10 pr-4 py-2 border bg-slate-900/50 border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-2 max-h-48 overflow-y-auto">
                                {searchResults.map((member) => (
                                    <div key={member.id} className="flex justify-between items-center p-2 hover:bg-slate-800/50 rounded transition-colors">
                                        <div>
                                            <p className="font-medium text-white">{member.fullName}</p>
                                            <p className="text-sm text-slate-400">{member.email}</p>
                                        </div>
                                        <button
                                            onClick={() => addVolunteer(member.id)}
                                            className="p-1.5 bg-teal-600/20 text-teal-400 rounded-full hover:bg-teal-600/30 transition-colors"
                                            title="Add as volunteer"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Volunteers List */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-3">Current Volunteers</h3>
                        {volunteers.length === 0 ? (
                            <p className="text-slate-500 text-center py-4 bg-slate-900/30 rounded-lg border border-slate-700">
                                No volunteers assigned yet.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {volunteers.map((vol) => (
                                    <div key={vol.id} className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-700 rounded-lg shadow-sm hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-teal-600/20 rounded-full flex items-center justify-center text-teal-400 font-bold">
                                                {vol.member.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{vol.member.fullName}</p>
                                                <p className="text-xs text-slate-400">{vol.member.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeVolunteer(vol.member.id)}
                                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-full transition-colors"
                                            title="Remove volunteer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-900/30">
                    <p className="text-xs text-slate-500">
                        Volunteers will have access to the check-in screen for this event only. Access is automatically revoked when the event ends.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VolunteerManager;
