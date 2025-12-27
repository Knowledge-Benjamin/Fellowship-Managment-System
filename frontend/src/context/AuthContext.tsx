import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface User {
    id: string;
    fullName: string;
    email: string;
    role: 'MEMBER' | 'FELLOWSHIP_MANAGER';
    fellowshipNumber: string;
    qrCode: string;
    tags: Array<{ name: string; isActive: boolean }>;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isManager: boolean;
    hasTag: (tagName: string) => boolean;
    hasTeamLeaderTag: () => boolean;
    hasAnyTag: (tagNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        navigate('/profile');
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    // Helper: Check if user has a specific tag
    const hasTag = (tagName: string): boolean => {
        return user?.tags?.some(tag => tag.name === tagName && tag.isActive) || false;
    };

    // Helper: Check if user has any team leader tag (ends with _LEADER)
    const hasTeamLeaderTag = (): boolean => {
        return user?.tags?.some(tag => tag.name.endsWith('_LEADER') && tag.isActive) || false;
    };

    // Helper: Check if user has any of the specified tags
    const hasAnyTag = (tagNames: string[]): boolean => {
        return tagNames.some(name => user?.tags?.some(tag => tag.name === name && tag.isActive)) || false;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                isAuthenticated: !!token,
                isManager: user?.role === 'FELLOWSHIP_MANAGER',
                hasTag,
                hasTeamLeaderTag,
                hasAnyTag,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
