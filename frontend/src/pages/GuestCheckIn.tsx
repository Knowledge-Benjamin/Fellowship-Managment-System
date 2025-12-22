import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserPlus, Check, X } from 'lucide-react';
import EventSelector from '../components/EventSelector';
import type { Event } from '../types/event';

const GuestCheckIn = () => {
    const [activeEvents, setActiveEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [formData, setFormData] = useState({
        guestName: '',
        guestPhone: '',
        purpose: '',
    });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const toast = useToast();

    useEffect(() => {
        fetchActiveEvent();
    }, []);

    const fetchActiveEvent = async () => {
        try {
            const response = await api.get('/events/active');
            const events = Array.isArray(response.data) ? response.data : [response.data];
            setActiveEvents(events);
            // Auto-select first event if only one
            if (events.length === 1) {
                setSelectedEvent(events[0]);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                setError('No active event at the moment');
            } else {
                setError('Failed to load event');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setChecking(true);
        setError('');

        try {
            await api.post('/attendance/guest-check-in', {
                eventId: selectedEvent?.id,
                ...formData,
            });

            setSuccess(true);
            setFormData({ guestName: '', guestPhone: '', purpose: '' });
            toast.success('Check-in successful! Welcome to ' + selectedEvent?.name);

            setTimeout(() => {
                setSuccess(false);
            }, 3000);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Check-in failed';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                <LoadingSpinner size="lg" text="Loading event information..." />
            </div>
        );
    }

    if (activeEvents.length === 0 && !loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                <div className="premium-card p-8 max-w-md w-full text-center">
                    <X size={64} className="mx-auto mb-4 text-red-400" />
                    <h2 className="text-2xl font-bold text-white mb-2">No Active Event</h2>
                    <p className="text-slate-400">{error || 'There is no event currently accepting check-ins.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {/* Event Selector */}
            <EventSelector
                events={activeEvents}
                selectedEvent={selectedEvent}
                onEventChange={setSelectedEvent}
                loading={loading}
            />

            {/* Only show form if event is selected */}
            {selectedEvent && (
                <>
                    {/* Success Message */}
                    {success && (
                        <div className="bg-emerald-500/20 backdrop-blur-xl rounded-xl p-6 mb-6 border border-emerald-500/30 flex items-center gap-4 animate-bounce-in premium-card">
                            <Check size={48} className="text-emerald-400" />
                            <div>
                                <h3 className="text-xl font-bold text-white">Check-in Successful!</h3>
                                <p className="text-emerald-200">Welcome to {selectedEvent?.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !success && (
                        <div className="bg-red-500/20 backdrop-blur-xl rounded-xl p-6 mb-6 border border-red-500/30 flex items-center gap-4 premium-card">
                            <X size={48} className="text-red-400" />
                            <div>
                                <h3 className="text-xl font-bold text-white">Check-in Failed</h3>
                                <p className="text-red-200">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Guest Check-in Form */}
                    <div className="premium-card corner-accent p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg glow-primary">
                                <UserPlus size={24} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Guest Check-in</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-slate-300 mb-2 font-semibold text-sm">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.guestName}
                                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                    className="input"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-2 font-semibold text-sm">Phone Number (Optional)</label>
                                <input
                                    type="tel"
                                    value={formData.guestPhone}
                                    onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                                    className="input"
                                    placeholder="+256 700 000 000"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-2 font-semibold text-sm">Purpose of Visit (Optional)</label>
                                <textarea
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    rows={3}
                                    className="input"
                                    placeholder="Guest speaker, visitor, etc."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={checking}
                                className="btn btn-primary w-full py-4 text-base font-semibold rounded-xl mt-6 shadow-lg"
                            >
                                {checking ? 'Checking In...' : 'Check In'}
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default GuestCheckIn;
