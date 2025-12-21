import React, { useState } from 'react';
import api from '../api';
import { useToast } from './ToastProvider';
import { Loader2, X, Building, Home } from 'lucide-react';

interface AddResidenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (residence: any) => void;
}

const AddResidenceModal: React.FC<AddResidenceModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [type, setType] = useState('HALL');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setLoading(true);
            const response = await api.post('/residences', {
                name: name.trim(),
                type
            });

            showToast('success', 'Residence created successfully');
            onSuccess(response.data);
            setName('');
            setType('HALL');
            onClose();
        } catch (error: any) {
            console.error('Failed to create residence:', error);
            showToast('error', error.response?.data?.error || 'Failed to create residence');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-[#151d30] rounded-2xl p-6 max-w-sm w-full border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Home className="w-5 h-5 text-teal-400" />
                        Add New Residence
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType('HALL')}
                                className={`px-3 py-2 text-sm rounded-lg border ${type === 'HALL' ? 'bg-teal-600 border-teal-500 text-white' : 'bg-[#0a0f1e] border-slate-700 text-slate-400 hover:border-slate-600'}`}
                            >
                                Hall
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('HOSTEL')}
                                className={`px-3 py-2 text-sm rounded-lg border ${type === 'HOSTEL' ? 'bg-teal-600 border-teal-500 text-white' : 'bg-[#0a0f1e] border-slate-700 text-slate-400 hover:border-slate-600'}`}
                            >
                                Hostel
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Residence Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={type === 'HALL' ? "e.g. Africa Hall" : "e.g. Olympia"}
                            className="w-full px-3 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-teal-500 focus:outline-none text-white"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !name}
                        className="w-full mt-2 btn-primary flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Create & Select'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddResidenceModal;
