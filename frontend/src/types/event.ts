export interface Event {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    allowGuestCheckin: boolean;
    status?: string;
    type?: string;
    venue?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    isActive?: boolean;
    _count?: {
        attendances: number;
        guestAttendances: number;
    };
}
