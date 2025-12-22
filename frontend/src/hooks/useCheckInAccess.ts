import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../api';

export const useCheckInAccess = () => {
    const { isAuthenticated, isManager, user } = useAuth();
    const location = useLocation();
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            // Not authenticated
            if (!isAuthenticated) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            // Managers always have access
            if (isManager) {
                setHasAccess(true);
                setLoading(false);
                return;
            }

            // For members, check if there's an active event and if they have permission
            try {
                const eventResponse = await api.get('/events/active');
                const events = Array.isArray(eventResponse.data) ? eventResponse.data : [eventResponse.data];

                // No events
                if (events.length === 0) {
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                // Check permission for ANY active event (volunteer for any event grants access)
                let hasPermissionForAny = false;
                for (const event of events) {
                    try {
                        const permissionResponse = await api.get(`/volunteers/${event.id}/check-permission`);
                        if (permissionResponse.data.hasPermission === true) {
                            hasPermissionForAny = true;
                            break; // Found one, can stop checking
                        }
                    } catch (error) {
                        // Continue checking other events
                        continue;
                    }
                }

                setHasAccess(hasPermissionForAny);
            } catch (error) {
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();

        // Re-check every time route changes or user changes
    }, [isAuthenticated, isManager, user, location.pathname]);

    return { hasAccess, loading };
};
