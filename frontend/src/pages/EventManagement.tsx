import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Users, Play, Square, BarChart2 } from 'lucide-react';
import VolunteerManager from '../components/VolunteerManager';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

interface Event {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    type: 'TUESDAY_FELLOWSHIP' | 'THURSDAY_PHANEROO';
    venue?: string;
    isRecurring: boolean;
    recurrenceRule?: string;
    isActive: boolean;
    allowGuestCheckin: boolean;
    status?: string;
    _count?: {
        attendances: number;
        guestAttendances: number;
    };
}

const EventManagement = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedEventForVolunteers, setSelectedEventForVolunteers] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        startTime: '18:00',
        endTime: '20:00',
        type: 'TUESDAY_FELLOWSHIP' as const,
        venue: '',
        isRecurring: false,
        recurrenceRule: 'WEEKLY',
        allowGuestCheckin: false,
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await api.get('/events');
            setEvents(response.data);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/events', formData);
            setShowCreateForm(false);
            setFormData({
                name: '',
                date: '',
                startTime: '18:00',
                endTime: '20:00',
                type: 'TUESDAY_FELLOWSHIP',
                venue: '',
                isRecurring: false,
                recurrenceRule: 'WEEKLY',
                allowGuestCheckin: false,
            });
            fetchEvents();
        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Failed to create event');
        }
    };

    const toggleEventActive = async (eventId: string) => {
        try {
            await api.patch(`/events/${eventId}/toggle-active`);
            fetchEvents();
        } catch (error) {
            console.error('Failed to toggle event status:', error);
        }
    };

    const toggleGuestCheckin = async (eventId: string) => {
        try {
            await api.patch(`/events/${eventId}/toggle-guest-checkin`);
            fetchEvents();
        } catch (error) {
            console.error('Failed to toggle guest check-in:', error);
        }
    };

    const deleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            await api.delete(`/events/${eventId}`);
            fetchEvents();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Event Management</h1>
                        <p className="text-slate-400">Create and manage fellowship events</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        <Plus size={20} />
                        Create Event
                    </button>
                </div>

                {/* Create Event Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-[#151d30]/95 backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full border border-slate-700 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">Create New Event</h2>
                            <form onSubmit={handleCreateEvent} className="space-y-4">
                                <div>
                                    <label className="block text-white mb-2">Event Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="Tuesday Fellowship"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white mb-2">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white mb-2">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="TUESDAY_FELLOWSHIP">Tuesday Fellowship</option>
                                            <option value="THURSDAY_PHANEROO">Thursday Phaneroo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white mb-2">Start Time</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white mb-2">End Time</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-white mb-2">Venue (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.venue}
                                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="Main Hall"
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isRecurring}
                                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            className="w-5 h-5 rounded border-white/20"
                                        />
                                        Recurring Event
                                    </label>

                                    {formData.isRecurring && (
                                        <select
                                            value={formData.recurrenceRule}
                                            onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value })}
                                            className="px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="DAILY">Daily</option>
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                        </select>
                                    )}
                                </div>

                                <label className="flex items-center gap-2 text-white cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowGuestCheckin}
                                        onChange={(e) => setFormData({ ...formData, allowGuestCheckin: e.target.checked })}
                                        className="w-5 h-5 rounded border-white/20"
                                    />
                                    Allow Guest Check-in
                                </label>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1 px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all"
                                    >
                                        Create Event
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Events List */}
                {loading ? (
                    <div className="text-center text-white text-xl">Loading events...</div>
                ) : events.length === 0 ? (
                    <div className="text-center">
                        <Calendar className="mx-auto mb-4 text-purple-300" size={64} />
                        <p className="text-white text-xl">No events yet. Create your first event!</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="bg-[#151d30]/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700 shadow-lg hover:shadow-2xl transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-2xl font-bold text-white">{event.name}</h3>
                                            {event.status === 'ONGOING' && (
                                                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm font-semibold border border-green-500/30 animate-pulse">
                                                    ONGOING
                                                </span>
                                            )}
                                            {event.status === 'UPCOMING' && (
                                                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold border border-blue-500/30">
                                                    UPCOMING
                                                </span>
                                            )}
                                            {event.status === 'PAST' && (
                                                <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-300 text-sm font-semibold border border-gray-500/30">
                                                    PAST
                                                </span>
                                            )}
                                            {event.isActive && (
                                                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-semibold border border-purple-500/30">
                                                    CHECK-IN ACTIVE
                                                </span>
                                            )}
                                            {event.isRecurring && (
                                                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-semibold border border-indigo-500/30">
                                                    {event.recurrenceRule}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-white/80">
                                            <div>
                                                <p className="text-sm text-white/60">Date</p>
                                                <p className="font-semibold">{new Date(event.date).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-white/60">Time</p>
                                                <p className="font-semibold">{event.startTime} - {event.endTime}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-white/60">Type</p>
                                                <p className="font-semibold">{event.type.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-white/60">Attendance</p>
                                                <div className="flex items-center gap-2">
                                                    <Users size={16} />
                                                    <p className="font-semibold">
                                                        {(event._count?.attendances || 0) + (event._count?.guestAttendances || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => toggleEventActive(event.id)}
                                            className={`p-2 rounded-lg transition-all ${event.isActive
                                                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                                : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                                                }`}
                                            title={event.isActive ? 'Deactivate event' : 'Activate event'}
                                        >
                                            {event.isActive ? <Square size={20} /> : <Play size={20} />}
                                        </button>

                                        <button
                                            onClick={() => toggleGuestCheckin(event.id)}
                                            className="p-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
                                            title={event.allowGuestCheckin ? 'Disable guest check-in' : 'Enable guest check-in'}
                                        >
                                            {event.allowGuestCheckin ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>

                                        <button
                                            onClick={() => setSelectedEventForVolunteers(event.id)}
                                            className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all"
                                            title="Manage Volunteers"
                                        >
                                            <Users size={20} />
                                        </button>

                                        <button
                                            onClick={() => deleteEvent(event.id)}
                                            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
                                            title="Delete event"
                                        >
                                            <Trash2 size={20} />
                                        </button>

                                        <button
                                            onClick={() => navigate(`/events/${event.id}/report`)}
                                            className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all"
                                            title="View Report"
                                        >
                                            <BarChart2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedEventForVolunteers && (
                    <VolunteerManager
                        eventId={selectedEventForVolunteers}
                        onClose={() => setSelectedEventForVolunteers(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default EventManagement;
