import React, { useState, useEffect } from 'react';
import api from '../api';
import { Bus, MapPin, CheckCircle, AlertCircle, Clock, Navigation, Search, User } from 'lucide-react';
import EventSelector from '../components/EventSelector';

const TransportBooking = () => {
    const [pickup, setPickup] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [member, setMember] = useState<any>(null);
    const [activeEvents, setActiveEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'success' | 'error' | 'no-event'>('idle');

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
        } catch (error) {
            setBookingStatus('no-event');
        }
    };

    const handleSearchMember = async () => {
        if (!phoneNumber) return;
        setIsSearching(true);
        try {
            const response = await api.get(`/members/phone/${phoneNumber}`);
            setMember(response.data);
        } catch (error) {
            alert('Member not found');
            setMember(null);
        } finally {
            setIsSearching(false);
        }
    };

    const pickupPoints = [
        { value: 'HOSTEL_A', label: 'Hostel A', icon: '🏢', time: '7:30 AM' },
        { value: 'HOSTEL_B', label: 'Hostel B', icon: '🏢', time: '7:35 AM' },
        { value: 'HOSTEL_C', label: 'Hostel C', icon: '🏢', time: '7:40 AM' },
        { value: 'MAIN_GATE', label: 'Main Gate', icon: '🚪', time: '7:45 AM' },
        { value: 'LIBRARY', label: 'Library', icon: '📚', time: '7:50 AM' },
        { value: 'CAFETERIA', label: 'Cafeteria', icon: '🍽️', time: '7:55 AM' },
    ];

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!member || !selectedEvent) return;

        setIsSubmitting(true);
        try {
            await api.post('/transport/book', {
                memberId: member.id,
                serviceId: selectedEvent.id,
                pickupPoint: pickup,
            });
            setBookingStatus('success');
            setTimeout(() => {
                setBookingStatus('idle');
                setPhoneNumber('');
                setMember(null);
                setPickup('');
            }, 3000);
        } catch (error) {
            setBookingStatus('error');
            setTimeout(() => setBookingStatus('idle'), 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="premium-card accent-border corner-accent p-8 shadow-2xl">
                {/* Header */}
                <div className="mb-8 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-pink-600 flex items-center justify-center shadow-lg shrink-0 glow-primary">
                            <Bus className="text-white" size={26} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-3xl font-bold text-white">Transport Booking</h2>
                                <Navigation className="text-pink-400" size={20} />
                            </div>
                            <p className="text-slate-400 text-sm">Reserve your spot for the next service</p>
                        </div>
                    </div>
                </div>

                {/* Event Selector */}
                <EventSelector
                    events={activeEvents}
                    selectedEvent={selectedEvent}
                    onEventChange={setSelectedEvent}
                />

                {/* Show form only if event is selected */}
                {selectedEvent && (
                    <>
                        {bookingStatus === 'idle' ? (
                            <form onSubmit={handleBook} className="space-y-6">
                                {/* Member Search */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        Phone Number
                                        <span className="text-red-400">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            placeholder="Enter phone number"
                                            className="input transition-smooth flex-1"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSearchMember}
                                            disabled={isSearching || !phoneNumber}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                                        >
                                            {isSearching ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Search size={20} />
                                            )}
                                        </button>
                                    </div>
                                    {member && (
                                        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                            <User size={16} />
                                            <span className="font-medium">{member.fullName}</span>
                                            <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded text-green-300 ml-auto">Verified</span>
                                        </div>
                                    )}
                                </div>

                                {/* Pickup Point Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <MapPin size={16} className="text-pink-400" />
                                        <span>Select Pickup Point</span>
                                        <span className="text-red-400">*</span>
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {pickupPoints.map((point) => (
                                            <button
                                                key={point.value}
                                                type="button"
                                                onClick={() => setPickup(point.value)}
                                                className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left group ${pickup === point.value
                                                        ? 'bg-pink-600/20 border-pink-600 shadow-lg'
                                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                                    }`}
                                            >
                                                {/* Selected indicator */}
                                                {pickup === point.value && (
                                                    <div className="absolute top-2 right-2 w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-xs">✓</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-2xl">{point.icon}</span>
                                                    <div className="flex-1">
                                                        <p className={`font-semibold ${pickup === point.value ? 'text-white' : 'text-slate-300'}`}>
                                                            {point.label}
                                                        </p>
                                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                                            <Clock size={12} />
                                                            <span>{point.time}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hover effect line */}
                                                <div
                                                    className={`h-0.5 rounded-full transition-all duration-300 ${pickup === point.value ? 'bg-pink-600' : 'bg-slate-700 group-hover:bg-slate-600'
                                                        }`}
                                                ></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !pickup}
                                    className="btn btn-primary w-full py-4 text-base font-semibold rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg bg-pink-600 hover:bg-pink-700"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Booking...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bus size={20} />
                                            <span>Confirm Transport Booking</span>
                                        </>
                                    )}
                                </button>

                                {/* Info Box */}
                                <div className="mt-6 p-5 bg-blue-600/10 rounded-xl border-2 border-blue-600/30 relative">
                                    <div className="absolute -top-3 left-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                                        IMPORTANT
                                    </div>
                                    <p className="text-blue-200 text-sm leading-relaxed pt-1">
                                        <strong className="text-blue-100">Note:</strong> Transport arrangements will be confirmed 24 hours before
                                        the service. You'll receive an SMS notification with final details.
                                    </p>
                                </div>
                            </form>
                        ) : bookingStatus === 'success' ? (
                            <div className="text-center py-8 animate-scale-in">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>

                                <div className="flex justify-center mb-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                                            <CheckCircle className="text-green-500" size={40} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <Bus className="text-white" size={16} />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3">Booking Confirmed!</h3>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-4">
                                    <MapPin className="text-green-400" size={16} />
                                    <span className="text-white font-semibold">{pickupPoints.find((p) => p.value === pickup)?.label}</span>
                                </div>
                                <p className="text-slate-400 text-sm">You'll receive a confirmation SMS soon</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 animate-scale-in">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>

                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                                        <AlertCircle className="text-red-500" size={40} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">Booking Failed</h3>
                                <p className="text-slate-400">Please try again or contact support</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TransportBooking;
