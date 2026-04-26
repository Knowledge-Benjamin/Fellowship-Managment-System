import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Key, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '../api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Rehydrate Tenant Context dynamically from email hyperlinks!
    useEffect(() => {
        const campus = searchParams.get('campus');
        if (campus) {
            localStorage.setItem('campus_override', campus);
        }
    }, [searchParams]);

    // Sound effect
    const playSuccessSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            // Bright, pleasant success chime
            const playTong = (freq: number, startTime: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.0);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 1.0);
            };
            
            playTong(523.25, ctx.currentTime);       // C5
            playTong(659.25, ctx.currentTime + 0.1); // E5
            playTong(783.99, ctx.currentTime + 0.2); // G5
        } catch (e) { console.error('Audio fail', e); }
    };

    if (!token) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-100 p-4">
                <div className="max-w-md w-full rounded-3xl p-8 bg-white shadow-xl text-center">
                    <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Reset Link</h1>
                    <p className="text-slate-500 mb-6">This password reset link is invalid or missing the secure token from the email.</p>
                    <button onClick={() => navigate('/login')} className="btn btn-primary w-full">Return to Login</button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setMessage('Password must be at least 8 characters');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await api.post('/auth/reset-password', {
                token,
                newPassword: password
            });
            
            playSuccessSound();
            setStatus('success');
            setMessage(response.data.message || 'Password successfully reset.');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to reset password. The link may have expired.');
        }
    };

    if (status === 'success') {
        return (
            <div className="h-dvh flex items-center justify-center px-3 sm:px-4 bg-slate-100">
                <div className="max-w-md w-full rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-premium bg-white animate-slide-up text-center">
                    <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce-subtle">
                        <CheckCircle2 size={40} className="text-[#48A111]" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successful</h1>
                    <p className="text-slate-500 mb-8">{message}</p>
                    <button 
                        onClick={() => navigate('/login')} 
                        className="w-full py-3 rounded-xl text-white font-medium transition-all shadow-sm hover:shadow-md"
                        style={{ backgroundColor: '#48A111' }}
                    >
                        Sign in with new password
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh flex items-center justify-center px-3 sm:px-4 bg-slate-100">
            <div className="max-w-md w-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-premium bg-premium-texture animate-slide-up relative z-10">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 p-1 bg-white shadow-md inline-flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                        <Shield className="text-[#48A111]" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Set New Password</h1>
                    <p className="text-sm text-slate-500">Create a new secure password for your account</p>
                </div>

                {status === 'error' && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                        <Lock className="shrink-0 mt-0.5" size={16} />
                        <p>{message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-700 mb-1.5 text-sm font-medium">New Password</label>
                        <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#48A111] transition-colors" size={18} />
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-[90%] mx-auto pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all shadow-sm text-sm"
                                placeholder="8+ characters"
                            />
                        </div>
                        {password && password.length < 8 && (
                            <p className="text-[11px] text-red-500 mt-1.5 ml-1">Password must be at least 8 characters</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-slate-700 mb-1.5 text-sm font-medium">Confirm Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#48A111] transition-colors" size={18} />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-[90%] mx-auto pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all shadow-sm text-sm"
                                placeholder="Confirm your new password"
                            />
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-[11px] text-red-500 mt-1.5 ml-1">Passwords do not match</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full mt-6 py-3 px-6 rounded-xl text-white font-medium shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[#3d8c0f]"
                        style={{ backgroundColor: '#48A111' }}
                    >
                        {status === 'loading' ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Update Password <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Cancel and return to login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
