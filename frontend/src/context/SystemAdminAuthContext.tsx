/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface SystemAdminUser {
    adminName: string;
}

interface SystemAdminAuthContextType {
    adminUser: SystemAdminUser | null;
    token: string | null;
    login: (token: string, adminUser: SystemAdminUser) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const SystemAdminAuthContext = createContext<SystemAdminAuthContextType | undefined>(undefined);

export const SystemAdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [adminUser, setAdminUser] = useState<SystemAdminUser | null>(() => {
        try {
            const stored = localStorage.getItem('system_admin_user');
            return stored ? (JSON.parse(stored) as SystemAdminUser) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('system_admin_token')
    );
    const [loading] = useState(false);
    const navigate = useNavigate();

    const login = (newToken: string, newAdmin: SystemAdminUser) => {
        setToken(newToken);
        setAdminUser(newAdmin);
        localStorage.setItem('system_admin_token', newToken);
        localStorage.setItem('system_admin_user', JSON.stringify(newAdmin));
        navigate('/system-admin/dashboard');
    };

    const logout = () => {
        setToken(null);
        setAdminUser(null);
        localStorage.removeItem('system_admin_token');
        localStorage.removeItem('system_admin_user');
        navigate('/system-admin/login');
    };

    return (
        <SystemAdminAuthContext.Provider
            value={{
                adminUser,
                token,
                login,
                logout,
                isAuthenticated: !!token,
                loading,
            }}
        >
            {children}
        </SystemAdminAuthContext.Provider>
    );
};

export const useSystemAdminAuth = () => {
    const context = useContext(SystemAdminAuthContext);
    if (context === undefined) {
        throw new Error('useSystemAdminAuth must be used within a SystemAdminAuthProvider');
    }
    return context;
};
