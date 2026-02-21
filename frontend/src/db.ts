import Dexie, { type EntityTable } from 'dexie';

export interface RosterMember {
    id: string;
    eventId: string;
    fullName: string;
    fellowshipNumber: string;
    phoneNumber: string;
    qrCode: string;
    regionName?: string;
}

export interface SyncQueueRecord {
    id?: number; // Auto-incremented primary key for the queue
    memberId: string;
    eventId: string;
    method: 'QR' | 'FELLOWSHIP_NUMBER' | 'MANUAL';
    timestamp: string; // ISO string of when the scan happened locally
    // Used for UI purposes to show what is pending
    fullName: string;
}

const db = new Dexie('ManifestFellowshipManagerDB') as Dexie & {
    roster: EntityTable<RosterMember, 'id'>,
    syncQueue: EntityTable<SyncQueueRecord, 'id'>
};

// Define the schema
db.version(1).stores({
    // roster primary key is memberId. Also index on eventId, fellowshipNumber, and qrCode for fast lookups.
    roster: 'id, eventId, fellowshipNumber, qrCode',

    // syncQueue primary key is auto-incremented. We index on eventId to easily flush per event.
    syncQueue: '++id, eventId, memberId'
});

export default db;
