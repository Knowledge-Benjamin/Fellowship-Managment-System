// Timezone utility for EAT (UTC+3) conversions

/**
 * Get current time in EAT (East Africa Time - UTC+3)
 */
export const getNowInEAT = (): Date => {
    const nowUtc = new Date();
    return new Date(nowUtc.getTime() + 3 * 60 * 60 * 1000);
};

/**
 * Convert a UTC date to EAT timezone
 */
export const convertToEAT = (date: Date): Date => {
    return new Date(date.getTime() + 3 * 60 * 60 * 1000);
};

/**
 * Create a Date object for event start/end time in EAT
 * @param eventDate - The event date (from database, in UTC)
 * @param timeString - Time in "HH:MM" format
 * @returns Date object representing the event time in EAT
 */
export const getEventTimeInEAT = (eventDate: Date, timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);

    // Create date in EAT by adding 3 hours to UTC date
    const dateInEAT = convertToEAT(eventDate);

    // Set the time components
    dateInEAT.setUTCHours(hours, minutes, 0, 0);

    return dateInEAT;
};

/**
 * Get event status based on current time and event schedule
 * @param event - Event object with date, startTime, and endTime
 * @returns 'UPCOMING' | 'ONGOING' | 'PAST'
 */
export const getEventStatus = (event: { date: Date | string; startTime: string; endTime: string }): string => {
    const now = getNowInEAT();
    const eventDate = new Date(event.date);

    const eventStart = getEventTimeInEAT(eventDate, event.startTime);
    const eventEnd = getEventTimeInEAT(eventDate, event.endTime);

    if (now < eventStart) return 'UPCOMING';
    if (now >= eventStart && now <= eventEnd) return 'ONGOING';
    return 'PAST';
};
