import React, { useState } from 'react';
import api from '../api';
import { useToast } from './ToastProvider';
import { Lock, X, Loader2, ShieldCheck } from 'lucide-react';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const { showToast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const validateForm = () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return false;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long');
            return false;
        }
        if (newPassword === currentPassword) {
            setError('New password must be different from current password');
            return false;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
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
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });

            showToast('success', 'Password changed successfully');
            onClose();
        } catch (err: any) {
            console.error('[CHANGE_PW] Error:', err);
            setError(err.response?.data?.message || 'Failed to change password. Please check your current password and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center py-8 px-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Current Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 w-4 h-4" />
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="Enter current password"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 w-4 h-4" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={8}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="Min. 8 characters"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 w-4 h-4" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={8}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="Re-type new password"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
