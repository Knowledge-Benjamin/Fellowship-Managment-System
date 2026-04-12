import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSystemAdminAuth } from '../context/SystemAdminAuthContext';
import { Loader2 } from 'lucide-react';

const SystemAdminProtectedRoute: React.FC = () => {
    const { isAuthenticated, loading } = useSystemAdminAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/system-admin/login" replace />;
    }

    return <Outlet />;
};

export default SystemAdminProtectedRoute;
