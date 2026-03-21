import React, { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Send } from 'lucide-react';
import api from '../api';
import { useToast } from './ToastProvider';
import CustomSelect from './CustomSelect';

interface TransferRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRegionName: string;
}

interface Region {
    id: string;
    name: string;
}

const TransferRequestModal: React.FC<TransferRequestModalProps> = ({ isOpen, onClose, currentRegionName }) => {
    const { showToast } = useToast();
    const [regions, setRegions] = useState<Region[]>([]);
    const [loadingRegions, setLoadingRegions] = useState(false);
    
    const [selectedRegionId, setSelectedRegionId] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRegions();
            setSelectedRegionId('');
            setReason('');
        }
    }, [isOpen]);

    const fetchRegions = async () => {
        try {
            setLoadingRegions(true);
            const res = await api.get('/regions');
            setRegions(res.data);
        } catch (error) {
            showToast('error', 'Failed to load regions.');
        } finally {
            setLoadingRegions(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedRegionId) {
            showToast('error', 'Please select a destination region.');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/transfers', {
                toRegionId: selectedRegionId,
                reason,
            });
            showToast('success', 'Transfer request submitted successfully. Awaiting origin approval.');
            onClose();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Failed to submit transfer request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Filter out current region from options
    const regionOptions = [
        { value: '', label: 'Select destination region', disabled: true },
        ...regions
            .filter(r => r.name !== currentRegionName)
            .map(r => ({ value: r.id, label: r.name }))
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-[#48A111]" size={22} />
                        Request Region Transfer
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        disabled={submitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    <div className="p-4 bg-[#e9f5e1]/50 border border-[#c5e3b0] rounded-xl text-sm text-slate-700">
                        <p>
                            You are currently assigned to <strong className="text-[#48A111]">{currentRegionName || 'No Region'}</strong>.
                        </p>
                        <p className="mt-1 text-slate-500">
                            Transferring requires approval from your current Regional Head and validation from the new Regional Head.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Destination Region</label>
                        {loadingRegions ? (
                            <div className="h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <Loader2 size={16} className="animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <CustomSelect
                                value={selectedRegionId}
                                onChange={setSelectedRegionId}
                                options={regionOptions}
                                placeholder="Where do you want to transfer to?"
                            />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Reason for Request <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input min-h-[100px] resize-none transition-all focus:border-[#48A111] focus:ring-1 focus:ring-[#48A111]"
                            placeholder="Briefly explain why you are requesting this transfer..."
                            maxLength={500}
                        />
                        <p className="text-xs text-slate-400 text-right">{reason.length}/500</p>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={submitting || !selectedRegionId}
                            className="w-full py-3.5 px-4 bg-[#48A111] text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Loader2 size={18} className="animate-spin" /> Submitting Request...</>
                            ) : (
                                <><Send size={18} /> Submit Transfer Request</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransferRequestModal;
