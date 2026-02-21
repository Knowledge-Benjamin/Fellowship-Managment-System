import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock, Shield, Clock } from 'lucide-react';
import api from '../api';
import logo from '../assets/logo.jpg';
import OTPInput from '../components/OTPInput';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    // MFA state
    const [showOTPScreen, setShowOTPScreen] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    // Audio context for sound effects
    const playErrorSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const oscillators = [220, 110]; // Low frequency "buzz"

            oscillators.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            });
        } catch (e) {
            console.error('Audio playback failed', e);
        }
    };

    const getErrorMessage = (error: any) => {
        if (!error.response) {
            return 'Network error. Please check your connection.';
        }

        const status = error.response.status;
        const data = error.response.data;

        if (data && data.message) return data.message;

        switch (status) {
            case 400:
                return 'Invalid request. Please try again.';
            case 401:
                return 'Incorrect verification code. Please try again.';
            case 403:
                return 'Access denied. Please contact support.';
            case 404:
                return 'User not found.';
            case 429:
                return 'Too many attempts. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return 'Something went wrong. Please try again.';
        }
    };

    // No body scroll lock — the login card must be scrollable on short screens

    // Handle initial login (Step 1: Email/Password)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            const data = response.data;

            // Check if MFA is required
            if (data.requiresOTP) {
                console.log('[LOGIN] MFA required - showing OTP screen');
                setTempToken(data.tempToken);
                setShowOTPScreen(true);
                setError(''); // Clear any previous errors
            } else {
                // Regular member - direct login
                console.log('[LOGIN] Regular member - direct login');
                const { token, message, ...userData } = data;

                if (message && message !== 'Login successful') {
                    setError(message);
                }

                login(token, {
                    id: userData.id,
                    fullName: userData.fullName,
                    email: userData.email,
                    role: userData.role,
                    fellowshipNumber: userData.fellowshipNumber,
                    qrCode: userData.qrCode,
                    tags: userData.tags || [],
                });
            }
        } catch (err: any) {
            console.error('[LOGIN] Error:', err);
            setError(err.response?.data?.message || err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP verification (Step 2: For privileged accounts)
    const handleOTPVerification = async (otp: string) => {
        setError('');
        setOtpLoading(true);

        try {
            const response = await api.post('/auth/verify-otp', {
                tempToken,
                otp,
            });

            const { token, message, ...userData } = response.data;

            console.log('[OTP] Verification successful');
            setIsSuccess(true);

            // Add slight delay to show success state
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
            }, 800);
        } catch (err: any) {
            console.error('[OTP] Verification error:', err);

            // Visual feedback
            setIsSuccess(false);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500); // Reset shake after animation

            // Audio feedback
            playErrorSound();

            // Helpful error message
            setError(getErrorMessage(err));
        } finally {
            setOtpLoading(false);
        }
    };

    // Handle OTP resend
    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;

        setError('');
        setLoading(true);

        try {
            await api.post('/auth/resend-otp', { tempToken });
            setError(''); // Clear errors

            // Show success message
            setError('✅ New code sent to your email');

            // Start cooldown (60 seconds)
            setResendCooldown(60);
            const interval = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            console.error('[RESEND OTP] Error:', err);
            setError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // Go back to login screen
    const handleBackToLogin = () => {
        setShowOTPScreen(false);
        setTempToken('');
        setError('');
    };

    if (showOTPScreen) {
        return (
            <div className="h-dvh overflow-hidden flex items-center justify-center px-3 sm:px-4 bg-slate-100">
                <div className="max-w-md w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-premium bg-premium-texture animate-slide-up relative z-10 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                    <div className="text-center mb-4 relative z-20">
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: 'rgba(72, 161, 17, 0.1)' }}>
                            <Shield size={24} style={{ color: '#48A111' }} />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-black mb-1 tracking-tight">Verify Your Identity</h1>
                        <p className="text-slate-500 font-medium text-sm">
                            We've sent a 6-digit code to <strong className="text-slate-900">{email}</strong>
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                            Please check your inbox. If you don't see the email, kindly check your spam or junk folder.
                        </p>
                    </div>

                    {error && (
                        <div className={`p-4 rounded-xl mb-6 text-sm ${error.startsWith('✅')
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-100 text-red-700'
                            } relative z-20`}>
                            {error}
                        </div>
                    )}

                    <div className={`mb-4 relative z-20 ${isShaking ? 'animate-shake' : ''}`}>
                        <label className="block text-slate-700 mb-2 text-sm font-medium text-center">
                            Enter Verification Code
                        </label>
                        <OTPInput
                            onComplete={handleOTPVerification}
                            loading={otpLoading}
                            isError={!!error}
                            isSuccess={isSuccess}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4 relative z-20">
                        <Clock size={14} />
                        <span>Code expires in 5 minutes</span>
                    </div>

                    <div className="space-y-2 relative z-20">
                        <button
                            onClick={handleResendOTP}
                            disabled={resendCooldown > 0 || loading}
                            className="w-full py-3 rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#48A111')}
                        >
                            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                        </button>

                        <button
                            onClick={handleBackToLogin}
                            className="w-full py-3 rounded-xl transition-all text-sm font-medium hover:bg-slate-50"
                            style={{ color: '#F2B50B' }}
                        >
                            ← Back to Login
                        </button>
                    </div>

                    <div className="mt-4 p-3 border rounded-xl relative z-20" style={{ backgroundColor: 'rgba(72, 161, 17, 0.05)', borderColor: 'rgba(72, 161, 17, 0.1)' }}>
                        <p className="text-xs text-center" style={{ color: '#48A111' }}>
                            <Shield size={14} className="inline mr-1" />
                            Your account requires two-factor authentication for enhanced security
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh overflow-hidden flex items-center justify-center px-3 sm:px-4 bg-slate-100">
            <div className="max-w-md w-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-premium bg-premium-texture animate-slide-up relative z-10 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <div className="text-center mb-5 sm:mb-7 relative z-20">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-3 sm:mb-5 p-1 bg-white shadow-lg rotate-3 hover:rotate-0 transition-transform duration-500 ease-out">
                        <img
                            src={logo}
                            alt="Fellowship Logo"
                            className="w-full h-full rounded-xl object-cover"
                        />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 font-medium">Sign in to access your account</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 text-sm relative z-20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5 relative z-20">
                    <div>
                        <label className="block text-black mb-2 text-sm font-medium">Email Address</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#48A111] transition-colors" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-[90%] mx-auto pl-12 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all duration-200 shadow-sm hover:bg-white hover:scale-[1.015] focus:scale-[1.015] hover:shadow-md focus:shadow-md"
                                placeholder="Enter your email"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-black mb-2 text-sm font-medium">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#48A111] transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-[90%] mx-auto pl-12 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all duration-200 shadow-sm hover:bg-white hover:scale-[1.015] focus:scale-[1.015] hover:shadow-md focus:shadow-md"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-semibold py-3 px-6 text-[15px] rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ backgroundColor: loading ? '#48A111' : '#48A111' }}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#48A111')}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
