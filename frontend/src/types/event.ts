export interface Event {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    allowGuestCheckin: boolean;
    status?: string;
    type?: 'TUESDAY_FELLOWSHIP' | 'THURSDAY_PHANEROO';
    venue?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    isActive?: boolean;
    _count?: {
        attendances: number;
        guestAttendances: number;
    };
}
