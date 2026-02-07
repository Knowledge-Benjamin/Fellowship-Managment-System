import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from './ToastProvider';
import { Loader2, X, BookOpen } from 'lucide-react';

interface AddCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (course: any) => void;
    preSelectedCollegeId?: string; // Optional: If passed, course is linked to this college
}

const AddCourseModal: React.FC<AddCourseModalProps> = ({ isOpen, onClose, onSuccess, preSelectedCollegeId }) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [durationYears, setDurationYears] = useState<number>(3);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !code.trim()) return;

        try {
            setLoading(true);
            const payload: any = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                durationYears: durationYears
            };

            if (preSelectedCollegeId) {
                payload.collegeId = preSelectedCollegeId;
            }

            const response = await api.post('/courses', payload);

            showToast('success', 'Course created successfully');
            onSuccess(response.data);
            setName('');
            setCode('');
            setDurationYears(3);
            onClose();
        } catch (error: any) {
            console.error('Failed to create course:', error);
            showToast('error', error.response?.data?.error || 'Failed to create course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-[#151d30] rounded-2xl p-6 max-w-sm w-full border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-teal-400" />
                        Add New Course
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">Course Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. BSCS"
                            className="w-full px-3 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-teal-500 focus:outline-none text-white font-mono"
                            maxLength={10}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Course Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bachelor of Science in Computer Science"
                            className="w-full px-3 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-teal-500 focus:outline-none text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Course Duration *</label>
                        <select
                            value={durationYears}
                            onChange={(e) => setDurationYears(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-teal-500 focus:outline-none text-white cursor-pointer"
                            required
                        >
                            <option value="1">1 Year (Certificate)</option>
                            <option value="2">2 Years (Diploma)</option>
                            <option value="3">3 Years (Bachelor's)</option>
                            <option value="4">4 Years (Bachelor's)</option>
                            <option value="5">5 Years (Bachelor's/Masters)</option>
                            <option value="6">6 Years (Masters/PhD)</option>
                            <option value="7">7 Years (PhD)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Used to automatically identify finalists</p>
                    </div>

                    {preSelectedCollegeId && (
                        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
                            This course will be added to the selected college automatically.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name || !code}
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

export default AddCourseModal;
