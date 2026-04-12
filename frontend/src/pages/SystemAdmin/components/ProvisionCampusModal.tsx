import React, { useState } from 'react';
import { X, Server, Loader2, Globe } from 'lucide-react';
import systemApi from '../../../systemApi';

interface ProvisionCampusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ProvisionCampusModal: React.FC<ProvisionCampusModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [databaseUrl, setDatabaseUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await systemApi.post('/system/campuses', {
                name,
                subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                databaseUrl,
            });
            onSuccess();
            // Reset state
            setName('');
            setSubdomain('');
            setDatabaseUrl('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to provision campus');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm font-sans">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-500" />
                        Provision New Campus
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Campus Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Makerere University Business School"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Subdomain
                            </label>
                            <div className="flex rounded-lg shadow-sm">
                                <input
                                    type="text"
                                    required
                                    value={subdomain}
                                    onChange={e => setSubdomain(e.target.value)}
                                    placeholder="mubs"
                                    className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-l-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 sm:text-sm">
                                    .makmanifest.org
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Creates a dedicated routing path for this campus
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Neon Database URL
                            </label>
                            <input
                                type="password"
                                required
                                value={databaseUrl}
                                onChange={e => setDatabaseUrl(e.target.value)}
                                placeholder="postgresql://user:password@endpoint..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Must be the pooled connection string. The backend will verify connectivity before saving.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center justify-center min-w-[120px] px-4 py-2 text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Provision Campus'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProvisionCampusModal;
