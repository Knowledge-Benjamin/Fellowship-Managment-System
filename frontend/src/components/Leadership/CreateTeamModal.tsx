import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';

interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Team name is required');
            return;
        }

        setLoading(true);
        try {
            await api.post('/teams', {
                name: name.trim(),
                description: description.trim() || undefined,
            });

            toast.success(`${name} created successfully!`);
            onSuccess();
            onClose();
            setName('');
            setDescription('');
        } catch (error: any) {
            console.error('Error creating team:', error);
            toast.error(error.response?.data?.message || 'Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
            setName('');
            setDescription('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold gradient-text">Create Ministry Team</h2>
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
                    {/* Team Name */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Team Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Worship Team, Prayer Team"
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                            disabled={loading}
                            maxLength={100}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Max 100 characters</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the team's purpose"
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                            rows={3}
                            disabled={loading}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">Max 500 characters</p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
                        <p className="text-teal-400 text-sm">
                            ✅ Leader and Member tags will be auto-created
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                            Example: Creating "Worship Team" generates <code className="text-teal-300">WORSHIP_TEAM_LEADER</code> and <code className="text-teal-300">WORSHIP_TEAM_MEMBER</code> tags
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
                            disabled={loading || !name.trim()}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {loading ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTeamModal;
