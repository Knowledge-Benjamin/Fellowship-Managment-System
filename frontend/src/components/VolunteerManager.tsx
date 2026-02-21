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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-[#48A111]" />
                        Manage Check-in Volunteers
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    {/* Add Volunteer Section */}
                    <div className="mb-8 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">Add New Volunteer</h3>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !searchQuery.trim()}
                                className="px-5 py-2 bg-[#48A111] text-white font-medium rounded-lg hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 transition-all shadow-sm"
                            >
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="mt-3 bg-white rounded-lg border border-slate-200 shadow-sm p-2 max-h-48 overflow-y-auto">
                                {searchResults.map((member) => (
                                    <div key={member.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                        <div>
                                            <p className="font-medium text-slate-900">{member.fullName}</p>
                                            <p className="text-sm text-slate-500">{member.email}</p>
                                        </div>
                                        <button
                                            onClick={() => addVolunteer(member.id)}
                                            className="p-2 bg-[#48A111]/10 text-[#48A111] rounded-full hover:bg-[#48A111]/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Current Volunteers</h3>
                        {volunteers.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">
                                <p className="text-slate-500 text-sm">No volunteers assigned to this event yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {volunteers.map((vol) => (
                                    <div key={vol.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-[#48A111]/10 rounded-full flex items-center justify-center text-[#48A111] font-bold text-lg">
                                                {vol.member.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{vol.member.fullName}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span>{vol.member.email}</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="font-mono text-slate-400">{vol.member.fellowshipNumber || 'No ID'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeVolunteer(vol.member.id)}
                                            className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-start gap-3">
                    <div className="p-1 min-w-max mt-0.5">
                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-[10px] font-bold">i</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Volunteers will have temporary access to the live event check-in screen. Access is automatically revoked when the event ends.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VolunteerManager;
