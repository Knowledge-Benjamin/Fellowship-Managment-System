import { useEffect } from 'react';
import { useToast } from './ToastProvider';

/**
 * Global network status listener that monitors the browser's online/offline events
 * and displays toast notifications to inform the user of connectivity changes.
 */
export const NetworkStatusListener = () => {
    const { warning, success } = useToast();

    useEffect(() => {
        const handleOnline = () => {
            success('Back online! You are connected to the internet.');
        };

        const handleOffline = () => {
            warning('You are offline. Some features may not work until you reconnect.');
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
