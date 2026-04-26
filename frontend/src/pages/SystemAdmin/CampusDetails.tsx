import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Info } from 'lucide-react';
import systemApi from '../../systemApi';

interface CampusTerminologies {
    Region: string;
    FamilyGroup: string;
    MinistryTeam: string;
    FellowshipManager: string;
}

const CampusDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [campusName, setCampusName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [subdomain, setSubdomain] = useState('');
    const [terminology, setTerminology] = useState<CampusTerminologies>({
        Region: '',
        FamilyGroup: '',
        MinistryTeam: '',
        FellowshipManager: '',
    });

    useEffect(() => {
        const fetchCampus = async () => {
            try {
                // Fetch all campuses and manually find our campus since there's no single-campus GET explicitly
                const { data } = await systemApi.get('/system/campuses');
                const campus = data.find((c: { id: string; name: string; isActive: boolean; subdomain: string; config?: { terminology?: Partial<CampusTerminologies> } }) => c.id === id);
                if (!campus) {
                    setError('Campus not found.');
                    return;
                }

                setCampusName(campus.name);
                setIsActive(campus.isActive);
                setSubdomain(campus.subdomain);
                
                const existingTerminology = campus.config?.terminology || {};
                setTerminology({
                    Region: existingTerminology.Region || 'Region',
                    FamilyGroup: existingTerminology.FamilyGroup || 'Family',
                    MinistryTeam: existingTerminology.MinistryTeam || 'Ministry Team',
                    FellowshipManager: existingTerminology.FellowshipManager || 'Fellowship Manager',
                });
            } catch {
                setError('Failed to fetch campus data.');
            } finally {
                setLoading(false);
            }
        };

        fetchCampus();
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            await systemApi.patch(`/system/campuses/${id}`, {
                name: campusName,
                isActive,
                config: { terminology },
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Failed to update campus configuration.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto font-sans">
            <button 
                onClick={() => navigate('/system-admin/dashboard')}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
            </button>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configure Campus</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {subdomain}.makmanifest.org
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
                    Configuration saved successfully.
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* General Settings */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">General Settings</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Campus Name
                            </label>
                            <input
                                type="text"
                                required
                                value={campusName}
                                onChange={e => setCampusName(e.target.value)}
                                className="w-full max-w-lg px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                id="is-active"
                                type="checkbox"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is-active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                Active (Campus allowed to accept traffic)
                            </label>
                        </div>
                    </div>
                </div>

                {/* Terminology Settings */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Terminology Overrides</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Customize the language used throughout the application to fit this specific campus.
                        </p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                    Region Label
                                    <span className="text-xs text-gray-400 font-normal">Default: Region</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={terminology.Region}
                                    onChange={e => setTerminology({ ...terminology, Region: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                    Family Group Label
                                    <span className="text-xs text-gray-400 font-normal">Default: Family</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={terminology.FamilyGroup}
                                    onChange={e => setTerminology({ ...terminology, FamilyGroup: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                    Ministry Team Label
                                    <span className="text-xs text-gray-400 font-normal">Default: Ministry Team</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={terminology.MinistryTeam}
                                    onChange={e => setTerminology({ ...terminology, MinistryTeam: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                    Manager Role Label
                                    <span className="text-xs text-gray-400 font-normal">Default: Fellowship Manager</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={terminology.FellowshipManager}
                                    onChange={e => setTerminology({ ...terminology, FellowshipManager: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg flex items-start mt-6">
                            <Info className="w-5 h-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                Changes to terminology will take effect immediately for all users logging into the <strong>{campusName}</strong> campus application.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-sm font-medium"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CampusDetails;
