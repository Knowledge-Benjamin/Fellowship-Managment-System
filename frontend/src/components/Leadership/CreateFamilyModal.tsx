import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
        if (isOpen) {
            fetchRegions();
        }
    }, [isOpen]);

    const fetchRegions = async () => {
        setFetchingRegions(true);
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            console.error('Error fetching regions:', error);
            toast.error('Failed to load regions');
        } finally {
            setFetchingRegions(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Family name is required');
            return;
        }

        if (!regionId) {
            toast.error('Please select a region');
            return;
        }

        setLoading(true);
        try {
            await api.post('/families', {
                name: name.trim(),
                regionId,
            });

            toast.success(`${name} created successfully!`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error creating family:', error);
            toast.error(error.response?.data?.message || 'Failed to create family');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setName('');
            setRegionId('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-teal-400">Create Family</h2>
                    {!loading && (
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Region Selection */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Region <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={regionId}
                            onChange={(e) => setRegionId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
                            disabled={loading || fetchingRegions}
                            required
                        >
                            <option value="">Select region...</option>
                            {regions.map((region) => (
                                <option key={region.id} value={region.id}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Family Name */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Family Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Grace Family, Victory Family"
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                            disabled={loading}
                            maxLength={100}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Max 100 characters</p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
                        <p className="text-teal-400 text-sm mb-2">
                            ✅ Member tag will be auto-created
                        </p>
                        <p className="text-gray-400 text-xs">
                            Example: Creating "Grace Family" generates{' '}
                            <code className="text-teal-300">GRACE_FAMILY_MEMBER</code> tag
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim() || !regionId}
                            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
