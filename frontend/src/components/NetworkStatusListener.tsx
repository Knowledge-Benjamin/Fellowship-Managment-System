import { useEffect } from 'react';
import { useToast } from './ToastProvider';
import api from '../api';
import db from '../db';

/**
 * Global network status listener that monitors the browser's online/offline events
 * and displays toast notifications to inform the user of connectivity changes.
 * 
 * Also acts as the Background Sync Engine for PWA Offline Check-ins.
 */
export const NetworkStatusListener = () => {
    const { warning, success } = useToast();

    // ─── OFFLINE SYNC ENGINE ───────────────────────────────────────────────
    const triggerBackgroundSync = async () => {
        if (!navigator.onLine) return;

        try {
            const pendingRecords = await db.syncQueue.toArray();
            if (pendingRecords.length === 0) return;

            console.log(`[PWA] Network restored. Syncing ${pendingRecords.length} offline check-ins...`);

            const payload = pendingRecords.map(r => ({
                memberId: r.memberId,
                eventId: r.eventId,
                method: r.method,
                timestamp: r.timestamp
            }));

            const response = await api.post('/attendance/sync-batch', payload);

            // If successful, clear the local queue
            await db.syncQueue.clear();

            console.log(`[PWA] Sync Complete: ${response.data.syncedCount} records synced.`);
            success(`Background sync complete: ${response.data.syncedCount} offline scans saved.`);
        } catch (error) {
            console.error('[PWA] Background sync failed:', error);
            warning('Failed to sync offline records. We will try again shortly.');
        }
    };

    useEffect(() => {
        // Attempt an initial sync on load if online
        triggerBackgroundSync();

        const handleOnline = () => {
            success('Back online! Syncing offline data...');
            triggerBackgroundSync();
        };

        const handleOffline = () => {
            warning('You are offline. Scans will be saved locally and pushed when you reconnect.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [success, warning]);

    return null; // This component does not render anything
};
