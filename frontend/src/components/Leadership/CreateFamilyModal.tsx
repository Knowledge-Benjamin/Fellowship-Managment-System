import React, { useState, useEffect } from 'react';
import { X, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';

interface CreateFamilyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Region {
    id: string;
    name: string;
}

const CreateFamilyModal: React.FC<CreateFamilyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [regionId, setRegionId] = useState('');
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRegions, setFetchingRegions] = useState(false);

    useEffect(() => {
        if (isOpen) fetchRegions();
    }, [isOpen]);

    const fetchRegions = async () => {
        setFetchingRegions(true);
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            toast.error('Failed to load regions');
        } finally {
            setFetchingRegions(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Family name is required'); return; }
        if (!regionId) { toast.error('Please select a region'); return; }

        setLoading(true);
        try {
            await api.post('/families', { name: name.trim(), regionId });
            toast.success(`${name} created successfully!`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create family');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) { setName(''); setRegionId(''); onClose(); }
    };

    const focusStyle = {
        onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = '#48A111';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)';
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
        },
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: '#e9f5e1' }}>
                            <Home className="w-5 h-5" style={{ color: '#48A111' }} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Create Family</h2>
                    </div>
                    {!loading && (
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Region */}
                    <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-1.5">
                            Region <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={regionId}
                            onChange={(e) => setRegionId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:outline-none transition-all text-sm"
                            style={{ color: regionId ? '#0f172a' : '#94a3b8' }}
                            disabled={loading || fetchingRegions}
                            required
                            {...focusStyle}
                        >
                            <option value="">{fetchingRegions ? 'Loading regions...' : 'Select region...'}</option>
                            {regions.map((region) => (
                                <option key={region.id} value={region.id}>{region.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Family Name */}
                    <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-1.5">
                            Family Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Grace Family, Victory Family"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm"
                            disabled={loading}
                            maxLength={100}
                            required
                            {...focusStyle}
                        />
                        <p className="text-xs text-slate-400 mt-1">Max 100 characters</p>
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-slate-700 text-sm font-semibold mb-1">✅ Tag auto-created</p>
                        <p className="text-slate-500 text-xs">
                            Example: "Grace Family" → <code className="bg-slate-100 px-1 py-0.5 rounded text-xs" style={{ color: '#48A111' }}>GRACE_FAMILY_MEMBER</code> tag
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim() || !regionId}
                            className="flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#48A111')}
                        >
                            {loading ? 'Creating...' : 'Create Family'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFamilyModal;
