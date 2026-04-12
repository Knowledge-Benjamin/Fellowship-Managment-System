import React, { useState } from 'react';
import { X, Server, Loader2, Globe, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import systemApi from '../../../systemApi';

interface ProvisionCampusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Credentials {
    email: string;
    tempPassword: string;
    url: string;
}

const ProvisionCampusModal: React.FC<ProvisionCampusModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [fmEmail, setFmEmail] = useState('');
    const [fmFullName, setFmFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [credentials, setCredentials] = useState<Credentials | null>(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await systemApi.post('/system/campuses', {
                name,
                subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                fmEmail,
                fmFullName,
            });
            setCredentials(data.credentials);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to provision campus');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!credentials) return;
        navigator.clipboard.writeText(
            `Campus URL: ${credentials.url}\nFM Login Email: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}\n\nThe FM logs in with email + password, then confirms a 6-digit OTP sent to their inbox.`
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setName(''); setSubdomain('');
        setFmEmail(''); setFmFullName('');
        setError(''); setCredentials(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm font-sans">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-500" />
                        {credentials ? 'Campus Provisioned!' : 'Provision New Campus'}
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* ── Success view ── */}
                    {credentials ? (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                    Campus provisioned successfully! Migrations applied and FM account created.
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">FM Access Credentials</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Campus URL</span>
                                        <a href={credentials.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline">
                                            {credentials.url.replace('https://', '')}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Email</span>
                                        <span className="font-mono text-gray-800 dark:text-gray-200">{credentials.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Temporary Password</span>
                                        <span className="font-mono text-gray-800 dark:text-gray-200">{credentials.tempPassword}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                                ⚠️ Share these credentials securely — the FM uses the password to log in, then confirms a 6-digit OTP sent to their email. The password will not be shown again.
                            </p>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    {copied ? 'Copied!' : 'Copy Credentials'}
                                </button>
                                <button onClick={handleClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Provision form ── */
                        <>
                            {error && (
                                <div className="mb-5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campus Name</label>
                                    <input
                                        type="text" required value={name} onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Makerere University Business School"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subdomain</label>
                                    <div className="flex rounded-lg shadow-sm">
                                        <input
                                            type="text" required value={subdomain} onChange={e => setSubdomain(e.target.value)}
                                            placeholder="mubs"
                                            className="flex-1 px-4 py-2 rounded-none rounded-l-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 text-sm">
                                            .makmanifest.org
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        The physical database will be automatically generated in Neon via API.
                                    </p>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Initial Fellowship Manager Account</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                            <input
                                                type="text" required value={fmFullName} onChange={e => setFmFullName(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                            <input
                                                type="email" required value={fmEmail} onChange={e => setFmEmail(e.target.value)}
                                                placeholder="fm@campus.org"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <button type="button" onClick={handleClose}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={loading}
                                        className="flex items-center justify-center min-w-[140px] px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Provisioning…
                                            </span>
                                        ) : 'Provision Campus'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProvisionCampusModal;
