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
    tags: Array<{
        name: string;
        isActive: boolean;
        expiresAt?: string | null;
        color?: string;
    }>;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isManager: boolean;
    loading: boolean;
    hasTag: (tagName: string) => boolean;
    hasTeamLeaderTag: () => boolean;
    hasTeamMemberTag: () => boolean;
    hasFamilyMemberTag: () => boolean;
    hasAnyTag: (tagNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); // Start as loading
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }

        setLoading(false); // Done checking localStorage
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        // Smart redirect based on user role/tags
        let redirectPath = '/profile';  // Default for regular members

        if (newUser.role === 'FELLOWSHIP_MANAGER') {
            redirectPath = '/leadership';
        } else if (newUser.tags?.some(t => t.name === 'REGIONAL_HEAD' && t.isActive)) {
            redirectPath = '/leadership/my-region';
        } else if (newUser.tags?.some(t => t.name === 'FAMILY_HEAD' && t.isActive)) {
            redirectPath = '/leadership/my-family';
        } else if (newUser.tags?.some(t => t.name?.endsWith('_LEADER') && t.isActive)) {
            redirectPath = '/leadership/my-team';
        }

        navigate(redirectPath);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    // Helper: Check if user has a specific tag (with expiry check)
    const hasTag = (tagName: string): boolean => {
        if (!user?.tags || !Array.isArray(user.tags)) return false;
        return user.tags.some(tag => {
            if (tag?.name !== tagName || !tag?.isActive) return false;

            // Check expiry if present
            if (tag.expiresAt && new Date() > new Date(tag.expiresAt)) {
                return false;  // Tag expired
            }

            return true;
        }) || false;
    };

    // Helper: Check if user has any team leader tag (ends with _LEADER)
    const hasTeamLeaderTag = (): boolean => {
        if (!user?.tags || !Array.isArray(user.tags)) return false;
        return user.tags.some(tag => tag?.name?.endsWith?.('_LEADER') && tag?.isActive) || false;
    };

    // Helper: Check if user has any team member tag (ends with _MEMBER, not _FAMILY_MEMBER)
    const hasTeamMemberTag = (): boolean => {
        if (!user?.tags || !Array.isArray(user.tags)) return false;
        return user.tags.some(tag => {
            if (!tag?.name || !tag?.isActive) return false;
            // Must end with _MEMBER but NOT be a family member tag
            return tag.name.endsWith('_MEMBER') && !tag.name.includes('_FAMILY_');
        }) || false;
    };

    // Helper: Check if user has family member tag (contains _FAMILY_MEMBER)
    const hasFamilyMemberTag = (): boolean => {
        if (!user?.tags || !Array.isArray(user.tags)) return false;
        return user.tags.some(tag => tag?.name?.includes?.('_FAMILY_MEMBER') && tag?.isActive) || false;
    };

    // Helper: Check if user has any of the specified tags
    const hasAnyTag = (tagNames: string[]): boolean => {
        if (!user?.tags || !Array.isArray(user.tags)) return false;
        return tagNames.some(name => user.tags.some(tag => tag?.name === name && tag?.isActive)) || false;
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
                loading,
                hasTag,
                hasTeamLeaderTag,
                hasTeamMemberTag,
                hasFamilyMemberTag,
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
