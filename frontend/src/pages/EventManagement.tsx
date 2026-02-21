import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Users,
    Play, Square, BarChart2, List, Heart, X, Clock, MapPin, Repeat, Tag, Pencil
} from 'lucide-react';
import VolunteerManager from '../components/VolunteerManager';
import SalvationTrackingModal from '../components/SalvationTrackingModal';
import CustomSelect from '../components/CustomSelect';
import type { Event } from '../types/event';

const EventManagement = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedEventForVolunteers, setSelectedEventForVolunteers] = useState<string | null>(null);
    const [selectedEventForSalvation, setSelectedEventForSalvation] = useState<{ id: string; name: string } | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'TUESDAY_FELLOWSHIP' as 'TUESDAY_FELLOWSHIP' | 'THURSDAY_PHANEROO',
        venue: '',
    });
    const PAGE_SIZE = 3;
    const [pastVisible, setPastVisible] = useState(PAGE_SIZE);
    const [ongoingVisible, setOngoingVisible] = useState(PAGE_SIZE);
    const [upcomingVisible, setUpcomingVisible] = useState(PAGE_SIZE);
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
        setCreateLoading(true);
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
        } finally {
            setCreateLoading(false);
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

    const openEditModal = (event: Event) => {
        setEditingEvent(event);
        setEditFormData({
            name: event.name,
            date: typeof event.date === 'string' ? event.date.split('T')[0] : new Date(event.date).toISOString().split('T')[0],
            startTime: event.startTime,
            endTime: event.endTime,
            type: event.type ?? 'TUESDAY_FELLOWSHIP',
            venue: event.venue ?? '',
        });
    };

    const handleEditEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;
        setEditLoading(true);
        try {
            await api.patch(`/events/${editingEvent.id}`, editFormData);
            setEditingEvent(null);
            fetchEvents();
        } catch (error) {
            console.error('Failed to update event:', error);
            alert('Failed to update event');
        } finally {
            setEditLoading(false);
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

    const renderEventCard = (event: Event) => (
        <div
            key={event.id}
            onClick={() => navigate(`/events/${event.id}/report`)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
        >
            {/* Slim accent bar */}
            <div
                className="h-0.5 w-full"
                style={{
                    backgroundColor: event.status === 'ONGOING'
                        ? '#48A111'
                        : event.status === 'UPCOMING'
                            ? '#F2B50B'
                            : '#cbd5e1'
                }}
            />

            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">{event.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{event.type === 'TUESDAY_FELLOWSHIP' ? 'Fellowship' : 'Phaneroo'}</p>
                    </div>
                    {/* Icon-only action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                        {event.status === 'ONGOING' && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleEventActive(event.id); }}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${event.isActive ? "bg-[#e9f5e1] text-[#48A111]" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                    title={event.isActive ? 'Stop Check-in' : 'Start Check-in'}
                                >
                                    {event.isActive ? <Square size={13} /> : <Play size={13} />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleGuestCheckin(event.id); }}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${event.allowGuestCheckin ? "bg-sky-50 text-sky-500" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                    title={event.allowGuestCheckin ? 'Disable Guest Check-in' : 'Enable Guest Check-in'}
                                >
                                    <Users size={13} />
                                </button>
                            </>
                        )}
                        {(event.status === 'ONGOING' || event.status === 'UPCOMING') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(event); }}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all cursor-pointer"
                                title="Edit Event"
                            >
                                <Pencil size={13} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}/report`); }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all cursor-pointer"
                            title="View Report"
                        >
                            <BarChart2 size={13} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-400 transition-all cursor-pointer"
                            title="Delete Event"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>

                {/* Compact meta */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.startTime}
                    </span>
                    {event.venue && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[80px]">{event.venue}</span>
                        </span>
                    )}
                </div>

                {/* Attendance + mini badges */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-slate-500">
                            <Users className="w-3 h-3 text-indigo-400" />
                            <span className="font-semibold text-slate-700">{event._count?.attendances || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                            <Tag className="w-3 h-3 text-sky-400" />
                            <span className="font-semibold text-slate-700">{event._count?.guestAttendances || 0}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {event.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>LIVE</span>
                        )}
                        {event.isRecurring && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-500" title={`Recurring: ${event.recurrenceRule}`}>
                                {event.recurrenceRule?.charAt(0)}
                            </span>
                        )}
                        {event.allowGuestCheckin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-500" title="Guests Allowed">G</span>
                        )}
                    </div>
                </div>

                {/* ONGOING: volunteer + salvation row */}
                {event.status === 'ONGOING' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedEventForVolunteers(event.id); }}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-white cursor-pointer transition-all"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                        >
                            Volunteers
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedEventForSalvation({ id: event.id, name: event.name }); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg text-white cursor-pointer transition-all"
                            style={{ backgroundColor: '#F2B50B' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d9a20a')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        >
                            <Heart className="w-3 h-3" /> Salvations
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">

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
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 relative border border-slate-100">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[#48A111]/10 text-[#48A111]">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Set up a new fellowship gathering.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <List className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Event Name
                                    <span className="text-red-500">*</span>
                                </label>
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

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" style={{ color: '#48A111' }} />
                                        Date
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className={inputClass}
                                        {...inputFocusStyle}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Users className="w-4 h-4" style={{ color: '#48A111' }} />
                                        Type
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <CustomSelect
                                        value={formData.type}
                                        onChange={(v: string) => setFormData({ ...formData, type: v as any })}
                                        options={[
                                            { value: 'TUESDAY_FELLOWSHIP', label: 'Tuesday Fellowship' },
                                            { value: 'THURSDAY_PHANEROO', label: 'Thursday Phaneroo' },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Clock className="w-4 h-4" style={{ color: '#48A111' }} />
                                        Start Time
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className={inputClass}
                                        {...inputFocusStyle}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        End Time
                                        <span className="text-red-500">*</span>
                                    </label>
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

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" style={{ color: '#48A111' }} />
                                    Venue
                                    <span className="font-normal text-slate-400 ml-1">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.venue}
                                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                    className={inputClass}
                                    placeholder="Main Hall"
                                    {...inputFocusStyle}
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.isRecurring ? 'bg-[#48A111]' : 'bg-slate-200'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${formData.isRecurring ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Repeat className="w-4 h-4 text-slate-500" />
                                            Recurring Event
                                        </span>
                                    </div>

                                    {formData.isRecurring && (
                                        <div className="animate-in fade-in slide-in-from-left-2 duration-200 ml-2 border-l-2 border-slate-100 pl-4 py-1">
                                            <p className="text-xs text-slate-500 mb-2">Generates multiple future events automatically</p>
                                            <CustomSelect
                                                value={formData.recurrenceRule}
                                                onChange={(v: string) => setFormData({ ...formData, recurrenceRule: v })}
                                                options={[
                                                    { value: 'DAILY', label: 'Daily (30 days)' },
                                                    { value: 'WEEKLY', label: 'Weekly (12 weeks)' },
                                                    { value: 'MONTHLY', label: 'Monthly (6 months)' },
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => setFormData({ ...formData, allowGuestCheckin: !formData.allowGuestCheckin })}>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.allowGuestCheckin ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${formData.allowGuestCheckin ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-500" />
                                            Guest Check-in
                                        </span>
                                    </div>
                                    {formData.allowGuestCheckin && (
                                        <p className="text-xs text-slate-500 ml-2 border-l-2 border-slate-100 pl-4 py-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                            This event will allow non-members to check in.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm cursor-pointer disabled:opacity-50"
                                    disabled={createLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm cursor-pointer disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={(e) => { if (!createLoading) e.currentTarget.style.backgroundColor = '#F2B50B' }}
                                    onMouseLeave={(e) => { if (!createLoading) e.currentTarget.style.backgroundColor = '#48A111' }}
                                >
                                    {createLoading ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                            </svg>
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Event'
                                    )}
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
            ) : (
                <>
                    {events.length === 0 ? (
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* PAST EVENTS COLUMN */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                                    <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                        Past Events
                                    </h2>
                                    <span className="bg-white text-slate-500 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm inline-block">
                                        {events.filter(e => e.status === 'PAST').length}
                                    </span>
                                </div>
                                {(() => {
                                    const pastEvents = events.filter(e => e.status === 'PAST');
                                    if (pastEvents.length === 0) return (
                                        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">No past events</div>
                                    );
                                    return (
                                        <>
                                            {pastEvents.slice(0, pastVisible).map(renderEventCard)}
                                            {(pastVisible < pastEvents.length || pastVisible > PAGE_SIZE) && (
                                                <div className="flex gap-2">
                                                    {pastVisible < pastEvents.length && (
                                                        <button
                                                            onClick={() => setPastVisible(v => v + PAGE_SIZE)}
                                                            className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-dashed border-slate-200 transition-all cursor-pointer"
                                                        >
                                                            Show {Math.min(PAGE_SIZE, pastEvents.length - pastVisible)} more &darr;
                                                        </button>
                                                    )}
                                                    {pastVisible > PAGE_SIZE && (
                                                        <button
                                                            onClick={() => setPastVisible(PAGE_SIZE)}
                                                            className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-dashed border-slate-200 transition-all cursor-pointer"
                                                        >
                                                            Show less &uarr;
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* ONGOING EVENTS COLUMN */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-[#e9f5e1] rounded-xl p-3 border border-[#48A111]/20 shadow-sm flex items-center justify-between">
                                    <h2 className="font-bold text-[#48A111] uppercase tracking-wider text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#48A111] animate-pulse"></span>
                                        Ongoing Events
                                    </h2>
                                    <span className="bg-white text-[#48A111] text-xs px-2.5 py-1 rounded-full font-bold shadow-sm inline-block">
                                        {events.filter(e => e.status === 'ONGOING').length}
                                    </span>
                                </div>
                                {(() => {
                                    const ongoingEvents = events.filter(e => e.status === 'ONGOING');
                                    if (ongoingEvents.length === 0) return (
                                        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-[#48A111]/20 rounded-xl bg-white">No ongoing events</div>
                                    );
                                    return (
                                        <>
                                            {ongoingEvents.slice(0, ongoingVisible).map(renderEventCard)}
                                            {(ongoingVisible < ongoingEvents.length || ongoingVisible > PAGE_SIZE) && (
                                                <div className="flex gap-2">
                                                    {ongoingVisible < ongoingEvents.length && (
                                                        <button
                                                            onClick={() => setOngoingVisible(v => v + PAGE_SIZE)}
                                                            className="flex-1 py-2 text-xs font-semibold text-[#48A111] hover:text-green-700 bg-[#e9f5e1]/60 hover:bg-[#e9f5e1] rounded-xl border border-dashed border-[#48A111]/30 transition-all cursor-pointer"
                                                        >
                                                            Show {Math.min(PAGE_SIZE, ongoingEvents.length - ongoingVisible)} more &darr;
                                                        </button>
                                                    )}
                                                    {ongoingVisible > PAGE_SIZE && (
                                                        <button
                                                            onClick={() => setOngoingVisible(PAGE_SIZE)}
                                                            className="flex-1 py-2 text-xs font-semibold text-[#48A111]/70 hover:text-[#48A111] bg-[#e9f5e1]/40 hover:bg-[#e9f5e1] rounded-xl border border-dashed border-[#48A111]/20 transition-all cursor-pointer"
                                                        >
                                                            Show less &uarr;
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* UPCOMING EVENTS COLUMN */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 shadow-sm flex items-center justify-between">
                                    <h2 className="font-bold text-yellow-700 uppercase tracking-wider text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        Upcoming Events
                                    </h2>
                                    <span className="bg-white text-yellow-700 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm inline-block">
                                        {events.filter(e => e.status === 'UPCOMING').length}
                                    </span>
                                </div>
                                {(() => {
                                    const upcomingEvents = events.filter(e => e.status === 'UPCOMING');
                                    if (upcomingEvents.length === 0) return (
                                        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">No upcoming events</div>
                                    );
                                    return (
                                        <>
                                            {upcomingEvents.slice(0, upcomingVisible).map(renderEventCard)}
                                            {(upcomingVisible < upcomingEvents.length || upcomingVisible > PAGE_SIZE) && (
                                                <div className="flex gap-2">
                                                    {upcomingVisible < upcomingEvents.length && (
                                                        <button
                                                            onClick={() => setUpcomingVisible(v => v + PAGE_SIZE)}
                                                            className="flex-1 py-2 text-xs font-semibold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl border border-dashed border-yellow-200 transition-all cursor-pointer"
                                                        >
                                                            Show {Math.min(PAGE_SIZE, upcomingEvents.length - upcomingVisible)} more &darr;
                                                        </button>
                                                    )}
                                                    {upcomingVisible > PAGE_SIZE && (
                                                        <button
                                                            onClick={() => setUpcomingVisible(PAGE_SIZE)}
                                                            className="flex-1 py-2 text-xs font-semibold text-yellow-500 hover:text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-xl border border-dashed border-yellow-200 transition-all cursor-pointer"
                                                        >
                                                            Show less &uarr;
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit Event Modal */}
            {editingEvent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200 relative border border-slate-100">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Edit Event</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">{editingEvent.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingEvent(null)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleEditEvent} className="space-y-4">
                            {/* Event Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                    <List className="w-3.5 h-3.5" style={{ color: '#48A111' }} />
                                    Event Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-400 transition-all"
                                    placeholder="Event name"
                                />
                            </div>

                            {/* Date + Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" style={{ color: '#48A111' }} />
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={editFormData.date}
                                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                        <List className="w-3.5 h-3.5" style={{ color: '#48A111' }} />
                                        Type <span className="text-red-500">*</span>
                                    </label>
                                    <CustomSelect
                                        value={editFormData.type}
                                        onChange={(v: string) => setEditFormData({ ...editFormData, type: v as 'TUESDAY_FELLOWSHIP' | 'THURSDAY_PHANEROO' })}
                                        options={[
                                            { value: 'TUESDAY_FELLOWSHIP', label: 'Tuesday Fellowship' },
                                            { value: 'THURSDAY_PHANEROO', label: 'Thursday Phaneroo' },
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Start Time + End Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" style={{ color: '#48A111' }} />
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={editFormData.startTime}
                                        onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        End Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={editFormData.endTime}
                                        onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Venue */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" style={{ color: '#48A111' }} />
                                    Venue <span className="font-normal text-slate-400 ml-1">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.venue}
                                    onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-400 transition-all"
                                    placeholder="Main Hall"
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingEvent(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                                    disabled={editLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={(e) => { if (!editLoading) e.currentTarget.style.backgroundColor = '#F2B50B' }}
                                    onMouseLeave={(e) => { if (!editLoading) e.currentTarget.style.backgroundColor = '#48A111' }}
                                >
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
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
