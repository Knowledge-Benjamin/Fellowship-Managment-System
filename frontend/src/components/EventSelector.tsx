import React from 'react';
import { Calendar, ChevronDown, Loader2 } from 'lucide-react';
import type { Event } from '../types/event';

interface EventSelectorProps {
    events: Event[];
    selectedEvent: Event | null;
    onEventChange: (event: Event) => void;
    loading?: boolean;
}

const EventSelector: React.FC<EventSelectorProps> = ({
    events,
    selectedEvent,
    onEventChange,
    loading = false,
}) => {
    if (loading) {
        return (
            <div className="glass-card p-4 mb-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                <span className="text-slate-400">Loading active events...</span>
            </div>
        );
    }

    // No events
    if (events.length === 0) {
        return (
            <div className="glass-card p-6 mb-6 border-2 border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Calendar className="text-red-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">No Active Events</h3>
                        <p className="text-red-200 text-sm">There are no events currently accepting check-ins</p>
                    </div>
                </div>
            </div>
        );
    }

    // Single event - auto-selected, no dropdown
    if (events.length === 1) {
        const event = events[0];
        return (
            <div className="glass-card accent-border p-6 mb-6 bg-teal-600/10">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg glow-primary shrink-0">
                        <Calendar className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{event.name}</h3>
                        <p className="text-slate-400 text-sm">
                            {new Date(event.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                        <p className="text-teal-400 text-sm font-medium mt-1">
                            {event.startTime} - {event.endTime}
                        </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                        ACTIVE
                    </div>
                </div>
            </div>
        );
    }

    // Multiple events - show dropdown
    return (
        <div className="glass-card p-6 mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Calendar size={18} className="text-teal-400" />
                Select Active Event
                <span className="ml-auto px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold">
                    {events.length} Events Active
                </span>
            </label>

            <div className="relative">
                <select
                    value={selectedEvent?.id || ''}
                    onChange={(e) => {
                        const event = events.find(ev => ev.id === e.target.value);
                        if (event) onEventChange(event);
                    }}
                    className="w-full px-4 py-3 pr-10 bg-[#0a0f1e] border-2 border-slate-700 rounded-xl text-white text-base font-medium focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/50 transition-all cursor-pointer appearance-none"
                >
                    <option value="" disabled>Choose an event to check into...</option>
                    {events.map((event) => (
                        <option key={event.id} value={event.id}>
                            {event.name} • {new Date(event.date).toLocaleDateString()} • {event.startTime}-{event.endTime}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={20}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
            </div>

            {selectedEvent && (
                <div className="mt-4 p-4 bg-teal-600/10 rounded-xl border border-teal-600/30">
                    <p className="text-teal-300 text-sm font-medium">
                        ✓ Selected: <span className="text-white font-bold">{selectedEvent.name}</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                        All check-ins will be recorded for this event
                    </p>
                </div>
            )}
        </div>
    );
};

export default EventSelector;
