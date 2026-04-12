import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Server, Globe, ExternalLink, Activity, PowerOff, Settings } from 'lucide-react';
import systemApi from '../../systemApi';
import ProvisionCampusModal from './components/ProvisionCampusModal';
import { format } from 'date-fns';

interface Campus {
    id: string;
    name: string;
    subdomain: string;
    isActive: boolean;
    createdAt: string;
    config: any;
}

const CampusesOverview: React.FC = () => {
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCampuses = async () => {
        try {
            setLoading(true);
            const { data } = await systemApi.get('/system/campuses');
            setCampuses(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load campuses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampuses();
    }, []);

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Server className="w-6 h-6 text-indigo-500" />
                        Infrastructure Overview
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage multi-tenant campuses, routing, and terminology config
                    </p>
                </div>
                <button
                    onClick={() => setIsProvisionModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Provision Campus
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Campus Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map((n) => (
                        <div key={n} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    ))
                ) : campuses.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <Server className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Campuses Found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Provision your first campus to get started.</p>
                    </div>
                ) : (
                    campuses.map(campus => (
                        <div key={campus.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-2">
                                        {campus.name}
                                    </h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        campus.isActive 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {campus.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <Globe className="w-4 h-4 mr-1.5 flex-shrink-0" />
                                    <span className="truncate">{campus.subdomain}.makmanifest.org</span>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                    Deployed: {format(new Date(campus.createdAt), 'MMM d, yyyy')}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-end gap-2 mt-auto">
                                <Link
                                    to={`/system-admin/campuses/${campus.id}`}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                    title="Configure Terminology"
                                >
                                    <Settings className="w-4 h-4" />
                                </Link>
                                <a
                                    href={`https://${campus.subdomain}.makmanifest.org`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                    title="Open App"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ProvisionCampusModal 
                isOpen={isProvisionModalOpen} 
                onClose={() => setIsProvisionModalOpen(false)} 
                onSuccess={() => {
                    setIsProvisionModalOpen(false);
                    fetchCampuses();
                }} 
            />
        </div>
    );
};

export default CampusesOverview;
