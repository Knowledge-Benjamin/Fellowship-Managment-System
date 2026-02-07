import React, { useState } from 'react';
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

            login(token, {
                id: userData.id,
                fullName: userData.fullName,
                email: userData.email,
                role: userData.role,
                fellowshipNumber: userData.fellowshipNumber,
                qrCode: userData.qrCode,
                tags: userData.tags || [],
            });
        } catch (err: any) {
            console.error('[OTP] Verification error:', err);
            setError(err.response?.data?.message || err.message || 'Invalid verification code');
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
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 shadow-2xl animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="mx-auto mb-4 w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center">
                            <Shield className="text-teal-500" size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Verify Your Identity</h1>
                        <p className="text-slate-400">
                            We've sent a 6-digit code to <strong className="text-white">{email}</strong>
                        </p>
                        <p className="text-slate-500 text-sm mt-2">
                            Please check your inbox. If you don't see the email, kindly check your spam or junk folder.
                        </p>
                    </div>

                    {error && (
                        <div className={`p-4 rounded-xl mb-6 text-sm ${error.startsWith('✅')
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                            }`}>
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-slate-300 mb-4 text-sm font-medium text-center">
                            Enter Verification Code
                        </label>
                        <OTPInput
                            onComplete={handleOTPVerification}
                            loading={otpLoading}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6">
                        <Clock size={16} />
                        <span>Code expires in 5 minutes</span>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleResendOTP}
                            disabled={resendCooldown > 0 || loading}
                            className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                        </button>

                        <button
                            onClick={handleBackToLogin}
                            className="w-full py-3 rounded-xl text-slate-400 hover:text-white transition-all text-sm"
                        >
                            ← Back to Login
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-blue-400 text-xs text-center">
                            <Shield size={14} className="inline mr-1" />
                            Your account requires two-factor authentication for enhanced security
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 shadow-2xl animate-fade-in">
                <div className="text-center mb-8">
                    <img
                        src={logo}
                        alt="Fellowship Logo"
                        className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg shadow-teal-900/20 object-cover"
                    />
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to access your account</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 text-sm font-medium">Email Address</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                placeholder="Enter your email"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-300 mb-2 text-sm font-medium">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-teal-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
