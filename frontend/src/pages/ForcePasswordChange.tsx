import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../api';
import { ToastProvider, useToast } from '../components/ToastProvider';

const ForcePasswordChangeContent = () => {
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();
    
    const [email] = useState<string>(
        () => (location.state as { email?: string })?.email ?? ''
    );
    const [oldPassword] = useState<string>(
        () => (location.state as { oldPassword?: string })?.oldPassword ?? ''
    );
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Must come from the Login page trap with credentials
        if (!location.state || !(location.state as Record<string, unknown>).email) {
            navigate('/login', { replace: true });
        }
    }, [location, navigate]);

    const validateForm = () => {
        if (!newPassword || !confirmPassword) {
            setError('Please fill in both password fields');
            return false;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        if (newPassword === oldPassword) {
            setError('New password must be different from the old temporary password');
            return false;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) return;

        setLoading(true);

        try {
            const response = await api.post('/auth/force-change-password', {
                email,
                oldPassword,
                newPassword
            });

            const data = response.data;
            const { token, ...userData } = data;

            showToast('success', 'Password completely secured! Logging you in...');

            // Log them in using the returned token
            setTimeout(() => {
                login(token, {
                    id: userData.id,
                    fullName: userData.fullName,
                    email: userData.email,
                    role: userData.role,
                    fellowshipNumber: userData.fellowshipNumber,
                    qrCode: userData.qrCode,
                    tags: userData.tags || [],
                });
            }, 1000);
            
        } catch (err: unknown) {
            console.error('[FORCE_CHANGE_PW] Error:', err);
            const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(apiErr.response?.data?.message || apiErr.message || 'Failed to update password');
            setLoading(false);
        }
    };

    return (
        <div className="h-dvh overflow-hidden flex items-center justify-center px-3 sm:px-4 bg-slate-100">
            <div className="max-w-md w-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-premium bg-premium-texture animate-slide-up relative z-10 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <div className="text-center mb-5 relative z-20">
                    <div className="mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center shadow-md bg-amber-50">
                        <ShieldCheck size={32} className="text-amber-500 hover:scale-110 transition-transform" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Security Update Required</h1>
                    <p className="text-slate-600 font-medium text-sm">
                        Please set a new, secure password for <strong className="text-slate-900">{email}</strong> to access your account.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 text-sm relative z-20 animate-jiggle">
                        {error}
                    </div>
                )}

                <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 mb-6 text-xs text-amber-800 relative z-20">
                    <strong>Why am I seeing this?</strong><br/>
                    You are logging in with a temporary password (your fellowship number). For your protection, you must choose a secret password before continuing to your dashboard.
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 relative z-20">
                    <div>
                        <label className="block text-slate-700 mb-2 text-sm font-medium">New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#48A111] transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all duration-200"
                                placeholder="Min. 8 characters"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 mb-2 text-sm font-medium">Confirm New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#48A111] transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all duration-200"
                                placeholder="Re-type your password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 text-white font-semibold py-3 px-6 text-[15px] rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ backgroundColor: loading ? '#48A111' : '#48A111' }}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#48A111')}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Updating Security...
                            </>
                        ) : (
                            <>
                                Secure Account & Login
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full mt-2 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Cancel & Return to Login
                    </button>
                </form>
            </div>
        </div>
    );
};

// Wrap with ToastProvider so we can show success toasts
const ForcePasswordChange = () => {
    return (
        <ToastProvider>
            <ForcePasswordChangeContent />
        </ToastProvider>
    );
};

export default ForcePasswordChange;
