import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Users,
    Play, Square, BarChart2, List, Heart, X, Clock, MapPin, Repeat
} from 'lucide-react';
import VolunteerManager from '../components/VolunteerManager';
import SalvationTrackingModal from '../components/SalvationTrackingModal';
import type { Event } from '../types/event';

const EventManagement = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedEventForVolunteers, setSelectedEventForVolunteers] = useState<string | null>(null);
    const [selectedEventForSalvation, setSelectedEventForSalvation] = useState<{ id: string; name: string } | null>(null);
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

    const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none transition-all";
    const inputFocusStyle = {
        onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = '#48A111';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)';
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
        },
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">

            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Event Management</h1>
                        <p className="text-slate-500 text-sm">Create and manage fellowship events</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: '#48A111' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                >
                    <Plus size={18} />
                    Create Event
                </button>
            </div>

            {/* Create Event Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full border border-slate-200 shadow-2xl animate-slide-up relative">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl" style={{ backgroundColor: '#e9f5e1' }}>
                                    <Plus className="w-5 h-5" style={{ color: '#48A111' }} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
                            </div>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-slate-700 text-sm font-semibold mb-1.5">Event Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={inputClass}
                                    placeholder="Tuesday Fellowship"
                                    {...inputFocusStyle}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 text-sm font-semibold mb-1.5">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className={inputClass}
                                        {...inputFocusStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 text-sm font-semibold mb-1.5">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className={inputClass}
                                        {...inputFocusStyle}
                                    >
                                        <option value="TUESDAY_FELLOWSHIP">Tuesday Fellowship</option>
                                        <option value="THURSDAY_PHANEROO">Thursday Phaneroo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 text-sm font-semibold mb-1.5">Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className={inputClass}
                                        {...inputFocusStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 text-sm font-semibold mb-1.5">End Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className={inputClass}
                                        {...inputFocusStyle}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-700 text-sm font-semibold mb-1.5">Venue <span className="font-normal text-slate-400">(Optional)</span></label>
                                <input
                                    type="text"
                                    value={formData.venue}
                                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                    className={inputClass}
                                    placeholder="Main Hall"
                                    {...inputFocusStyle}
                                />
                            </div>

                            <div className="flex items-center gap-6 pt-1">
                                <label className="flex items-center gap-2.5 text-slate-700 text-sm font-medium cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.isRecurring}
                                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                        className="w-4 h-4 rounded accent-[#48A111]"
                                    />
                                    Recurring Event
                                </label>

                                {formData.isRecurring && (
                                    <select
                                        value={formData.recurrenceRule}
                                        onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value })}
                                        className="px-3 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none"
                                        {...inputFocusStyle}
                                    >
                                        <option value="DAILY">Daily</option>
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="MONTHLY">Monthly</option>
                                    </select>
                                )}

                                <label className="flex items-center gap-2.5 text-slate-700 text-sm font-medium cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowGuestCheckin}
                                        onChange={(e) => setFormData({ ...formData, allowGuestCheckin: e.target.checked })}
                                        className="w-4 h-4 rounded accent-[#48A111]"
                                    />
                                    Allow Guest Check-in
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm cursor-pointer"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-12 text-center">
                    <div className="w-10 h-10 border-3 border-slate-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#48A111' }} />
                    <p className="text-slate-500">Loading events...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-16 text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#e9f5e1' }}>
                        <Calendar className="w-10 h-10" style={{ color: '#48A111' }} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Events Yet</h3>
                    <p className="text-slate-500 mb-6">Create your first fellowship event to get started</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                        style={{ backgroundColor: '#48A111' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                    >
                        <Plus size={18} className="inline mr-2" />
                        Create First Event
                    </button>
                </div>
            ) : (
                <div className="grid gap-5">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all"
                        >
                            {/* Status bar at the top */}
                            <div
                                className="h-1 w-full"
                                style={{
                                    backgroundColor: event.status === 'ONGOING'
                                        ? '#48A111'
                                        : event.status === 'UPCOMING'
                                            ? '#F2B50B'
                                            : '#e2e8f0'
                                }}
                            />

                            <div className="p-6">
                                {/* Event name + status badges */}
                                <div className="flex items-start justify-between gap-4 mb-5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="text-xl font-bold text-slate-900 truncate">{event.name}</h3>
                                            {event.status === 'ONGOING' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>
                                                    ● ONGOING
                                                </span>
                                            )}
                                            {event.status === 'UPCOMING' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700">
                                                    UPCOMING
                                                </span>
                                            )}
                                            {event.status === 'PAST' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                                                    PAST
                                                </span>
                                            )}
                                            {event.isActive && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>
                                                    CHECK-IN ACTIVE
                                                </span>
                                            )}
                                            {event.isRecurring && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">
                                                    {event.recurrenceRule}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-sm">
                                            {event.type?.replace(/_/g, ' ')}
                                        </p>
                                    </div>

                                    {/* Attendance count */}
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 shrink-0">
                                        <Users size={16} style={{ color: '#48A111' }} />
                                        <span className="font-bold text-slate-900 text-lg">
                                            {(event._count?.attendances || 0) + (event._count?.guestAttendances || 0)}
                                        </span>
                                        <span className="text-slate-400 text-xs">attended</span>
                                    </div>
                                </div>

                                {/* Event meta row */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar size={14} style={{ color: '#48A111' }} />
                                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Clock size={14} style={{ color: '#48A111' }} />
                                        <span>{event.startTime} – {event.endTime}</span>
                                    </div>
                                    {event.isRecurring && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Repeat size={14} style={{ color: '#48A111' }} />
                                            <span>{event.recurrenceRule ? event.recurrenceRule.charAt(0).toUpperCase() + event.recurrenceRule.slice(1).toLowerCase() : ''}</span>
                                        </div>
                                    )}
                                    {event.venue && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <MapPin size={14} style={{ color: '#48A111' }} />
                                            <span>{event.venue}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons row */}
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                                    {/* Toggle active */}
                                    <button
                                        onClick={() => toggleEventActive(event.id)}
                                        title={event.isActive ? 'Deactivate check-in' : 'Activate check-in'}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03] cursor-pointer"
                                        style={event.isActive
                                            ? { backgroundColor: '#e9f5e1', color: '#48A111' }
                                            : { backgroundColor: '#f1f5f9', color: '#64748b' }
                                        }
                                    >
                                        {event.isActive ? <Square size={14} /> : <Play size={14} />}
                                        {event.isActive ? 'Deactivate' : 'Activate'}
                                    </button>

                                    {/* Guest check-in toggle */}
                                    <button
                                        onClick={() => toggleGuestCheckin(event.id)}
                                        title={event.allowGuestCheckin ? 'Disable guest check-in' : 'Enable guest check-in'}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03] cursor-pointer"
                                        style={event.allowGuestCheckin
                                            ? { backgroundColor: '#ede9fe', color: '#7c3aed' }
                                            : { backgroundColor: '#f1f5f9', color: '#64748b' }
                                        }
                                    >
                                        {event.allowGuestCheckin ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                        Guests
                                    </button>

                                    {/* Volunteers */}
                                    <button
                                        onClick={() => setSelectedEventForVolunteers(event.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 transition-all hover:scale-[1.03]"
                                    >
                                        <Users size={14} />
                                        Volunteers
                                    </button>

                                    {/* Manual Check-in */}
                                    <button
                                        onClick={() => navigate(`/events/${event.id}/manual-checkin`)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-600 transition-all hover:scale-[1.03]"
                                    >
                                        <List size={14} />
                                        Manual Check-in
                                    </button>

                                    {/* Report */}
                                    <button
                                        onClick={() => navigate(`/events/${event.id}/report`)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 transition-all hover:scale-[1.03]"
                                    >
                                        <BarChart2 size={14} />
                                        Report
                                    </button>

                                    {/* Salvation */}
                                    <button
                                        onClick={() => setSelectedEventForSalvation({ id: event.id, name: event.name })}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-pink-50 text-pink-600 transition-all hover:scale-[1.03]"
                                    >
                                        <Heart size={14} />
                                        Salvation
                                    </button>

                                    {/* Spacer + Delete */}
                                    <div className="flex-1" />
                                    <button
                                        onClick={() => deleteEvent(event.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-500 transition-all hover:scale-[1.03]"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {selectedEventForSalvation && (
                <SalvationTrackingModal
                    isOpen={true}
                    onClose={() => setSelectedEventForSalvation(null)}
                    eventId={selectedEventForSalvation.id}
                    eventName={selectedEventForSalvation.name}
                    onSaved={() => { }}
                />
            )}

            {selectedEventForVolunteers && (
                <VolunteerManager
                    eventId={selectedEventForVolunteers}
                    onClose={() => setSelectedEventForVolunteers(null)}
                />
            )}
        </div>
    );
};

export default EventManagement;
