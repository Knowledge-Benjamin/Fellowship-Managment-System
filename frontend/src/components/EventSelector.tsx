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
    // Loading state
    if (loading) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: '#48A111' }} />
                <span className="text-slate-500 text-sm">Loading active events...</span>
            </div>
        );
    }

    // No events
    if (events.length === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <Calendar className="text-red-500" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">No Active Events</h3>
                        <p className="text-slate-500 text-sm">There are no events currently accepting check-ins</p>
                    </div>
                </div>
            </div>
        );
    }

    // Single event — auto-selected, show as info card
    if (events.length === 1) {
        const event = events[0];
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-4">
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}
                    >
                        <Calendar size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">{event.name}</h3>
                        <p className="text-slate-500 text-sm mt-0.5">
                            {new Date(event.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: '#48A111' }}>
                            {event.startTime} – {event.endTime}
                        </p>
                    </div>
                    <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}
                    >
                        ACTIVE
                    </span>
                </div>
            </div>
        );
    }

    // Multiple events — dropdown
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Calendar size={16} style={{ color: '#48A111' }} />
                Select Active Event
                <span
                    className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}
                >
                    {events.length} Active
                </span>
            </label>

            <div className="relative">
                <select
                    value={selectedEvent?.id || ''}
                    onChange={(e) => {
                        const event = events.find(ev => ev.id === e.target.value);
                        if (event) onEventChange(event);
                    }}
                    className="input w-full pr-10 appearance-none cursor-pointer text-slate-900 font-medium"
                >
                    <option value="" disabled>Choose an event to check into...</option>
                    {events.map((event) => (
                        <option key={event.id} value={event.id}>
                            {event.name} • {new Date(event.date).toLocaleDateString()} • {event.startTime}–{event.endTime}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
            </div>

            {selectedEvent && (
                <div
                    className="mt-4 p-4 rounded-xl border"
                    style={{ backgroundColor: '#e9f5e1', borderColor: '#c5e3b0' }}
                >
                    <p className="text-sm font-semibold" style={{ color: '#48A111' }}>
                        ✓ Selected: <span className="text-slate-900">{selectedEvent.name}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        All check-ins will be recorded for this event
                    </p>
                </div>
            )}
        </div>
    );
};

export default EventSelector;
