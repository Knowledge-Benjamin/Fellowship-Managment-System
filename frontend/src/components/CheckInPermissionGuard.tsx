import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

interface CheckInPermissionGuardProps {
    children: React.ReactNode;
}

const CheckInPermissionGuard: React.FC<CheckInPermissionGuardProps> = ({ children }) => {
    const { isAuthenticated, isManager, user } = useAuth();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [activeEventId, setActiveEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            // Not authenticated - redirect to login
            if (!isAuthenticated) {
                setHasPermission(false);
                setLoading(false);
                return;
            }

            // Managers always have access
            if (isManager) {
                setHasPermission(true);
                setLoading(false);
                return;
            }

            // For members, check if there's an active event and if they have permission
            try {
                const eventResponse = await api.get('/events/active');
                const events = Array.isArray(eventResponse.data) ? eventResponse.data : [eventResponse.data];

                // No events
                if (events.length === 0) {
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }

                // Check permission for ANY active event (volunteer for any event grants access)
                let hasPermissionForAny = false;
                let firstEventId = null;

                for (const event of events) {
                    if (!firstEventId) firstEventId = event.id; // Remember first event for state

                    try {
                        const permissionResponse = await api.get(`/volunteers/${event.id}/check-permission`);
                        if (permissionResponse.data.hasPermission === true) {
                            hasPermissionForAny = true;
                            setActiveEventId(event.id); // Store which event granted permission
                            break; // Found one, can stop checking
                        }
                    } catch (error) {
                        // Continue checking other events
                        continue;
                    }
                }

                setHasPermission(hasPermissionForAny);
            } catch (error) {
                console.error('Permission check failed:', error);
                // On error, deny access (fail secure)
                setHasPermission(false);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [isAuthenticated, isManager, user]);

    // Still loading - show nothing or loading spinner
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
                <div className="text-white text-lg">Verifying access...</div>
            </div>
        );
    }

    // Permission denied - redirect to profile
    if (hasPermission === false) {
        return <Navigate to="/profile" replace />;
    }

    // Permission granted - render children
    return <>{children}</>;
};

export default CheckInPermissionGuard;
