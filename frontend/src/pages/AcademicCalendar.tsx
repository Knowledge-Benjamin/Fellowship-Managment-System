import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, AlertCircle, Check } from 'lucide-react';
import api from '../api';
import { useToast } from '../components/ToastProvider';

interface AcademicPeriod {
    id: string;
    academicYear: string;
    periodNumber: number;
    periodName: string;
    startDate: string;
    endDate: string;
    createdAt: string;
}

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const AcademicCalendar: React.FC = () => {
    const { showToast } = useToast();
    const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<AcademicPeriod | null>(null);
    const [formData, setFormData] = useState({
        academicYear: '',
        periodNumber: 1,
        periodName: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/academic-periods');
            setPeriods(response.data);
        } catch (error) {
            console.error('Error fetching periods:', error);
            showToast('error', 'Failed to load academic periods');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
            };

            if (editingPeriod) {
                // UPDATE - send all fields including academicYear and periodNumber
                await api.put(`/academic-periods/${editingPeriod.id}`, {
                    periodName: formData.periodName,
                    startDate: payload.startDate,
                    endDate: payload.endDate,
                });
                showToast('success', 'Period updated successfully');
            } else {
                // CREATE
                await api.post('/academic-periods', payload);
                showToast('success', 'Period created successfully');
            }

            setShowForm(false);
            setEditingPeriod(null);
            resetForm();
            fetchPeriods();
        } catch (error: any) {
            console.error('Error saving period:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save period';
            showToast('error', typeof errorMessage === 'string' ? errorMessage : 'Validation error');
        }
    };

    const handleEdit = (period: AcademicPeriod) => {
        setEditingPeriod(period);
        setFormData({
            academicYear: period.academicYear,
            periodNumber: period.periodNumber,
            periodName: period.periodName,
            startDate: period.startDate.split('T')[0],
            endDate: period.endDate.split('T')[0],
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this period?')) return;

        try {
            await api.delete(`/academic-periods/${id}`);
            showToast('success', 'Period deleted successfully');
            fetchPeriods();
        } catch (error: any) {
            console.error('Delete error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete period';
            showToast('error', errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            academicYear: '',
            periodNumber: 1,
            periodName: '',
            startDate: '',
            endDate: '',
        });
    };

    const getCurrentPeriod = () => {
        const now = new Date();
        return periods.find(p => {
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            return now >= start && now <= end;
        });
    };

    const currentPeriod = getCurrentPeriod();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading calendar...</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[#e9f5e1]">
                        <Calendar className="w-6 h-6" style={{ color: '#48A111' }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Calendar</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage academic periods for automatic year progression
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditingPeriod(null);
                        resetForm();
                    }}
                    className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:scale-[1.02] transition-all flex items-center gap-2"
                    style={{ backgroundColor: '#48A111' }}
                >
                    <Plus className="w-4 h-4" />
                    Add Period
                </button>
            </div>

            {/* Current Period Alert */}
            {currentPeriod && (
                <div className="mb-6 px-5 py-4 rounded-2xl bg-[#e9f5e1] border border-[#48A111]/20 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                            <Check className="w-5 h-5" style={{ color: '#48A111' }} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">Current Active Period</p>
                            <p className="text-sm text-slate-600 mt-0.5">
                                {currentPeriod.academicYear} — {currentPeriod.periodName}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-slate-600 shadow-sm border border-slate-100">
                        Active Now
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                            <h2 className="font-bold text-slate-900">
                                {editingPeriod ? 'Edit Period' : 'Create New Period'}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingPeriod(null); resetForm(); }}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                                <AlertCircle size={18} className="hidden" /> {/* Placeholder for X icon if imported, else fallback */}
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Academic Year <span className="text-red-400">*</span></label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="2026/2027"
                                            value={formData.academicYear}
                                            onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                                            pattern="\d{4}/\d{4}"
                                            required
                                            disabled={!!editingPeriod}
                                            title="Format: YYYY/YYYY (e.g., 2026/2027)"
                                        />
                                        {editingPeriod && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">Cannot change year during edit</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Period Number <span className="text-red-400">*</span></label>
                                        <select
                                            className="input"
                                            value={formData.periodNumber}
                                            onChange={(e) => setFormData({ ...formData, periodNumber: parseInt(e.target.value) })}
                                            required
                                            disabled={!!editingPeriod}
                                        >
                                            <option value="1">Period 1 (Semester 1)</option>
                                            <option value="2">Period 2 (Semester 2)</option>
                                        </select>
                                        {editingPeriod && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">Cannot change number during edit</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Period Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="First Period, Second Period, etc."
                                        value={formData.periodName}
                                        onChange={(e) => setFormData({ ...formData, periodName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Start Date <span className="text-red-400">*</span></label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">End Date <span className="text-red-400">*</span></label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Helper Info */}
                                <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 mt-2">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                                        <div className="text-xs text-sky-700/80 font-medium">
                                            <p className="font-bold text-sky-900 mb-1">Examples:</p>
                                            <ul className="space-y-1">
                                                <li>• Period 1: August - December</li>
                                                <li>• Period 2: January - May (or January - April)</li>
                                                <li>• You can customize dates to fit your university calendar</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            setEditingPeriod(null);
                                            resetForm();
                                        }}
                                        className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-all"
                                        style={{ backgroundColor: '#48A111' }}
                                    >
                                        {editingPeriod ? 'Update Period' : 'Create Period'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Periods Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Academic Year</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Period</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Start Date</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">End Date</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map((period) => {
                                const now = new Date();
                                const start = new Date(period.startDate);
                                const end = new Date(period.endDate);
                                const isActive = now >= start && now <= end;
                                const isPast = now > end;
                                const isFuture = now < start;

                                return (
                                    <tr key={period.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">{period.academicYear}</td>
                                        <td className="px-5 py-4 text-sm text-slate-700">{period.periodName}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500">
                                            {new Date(period.startDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-500">
                                            {new Date(period.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isActive
                                                    ? 'bg-[#e9f5e1] text-[#48A111]'
                                                    : isPast
                                                        ? 'bg-slate-100 text-slate-500'
                                                        : 'bg-sky-50 text-sky-500'
                                                    }`}
                                            >
                                                {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleEdit(period)}
                                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all cursor-pointer"
                                                    title="Edit period name and dates"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(period.id)}
                                                    className={`p-1.5 rounded-lg transition-all ${isPast ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer'}`}
                                                    title={isPast ? "Cannot delete past periods" : "Delete period"}
                                                    disabled={isPast}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {periods.length === 0 && (
                        <div className="text-center py-16">
                            <Calendar size={32} className="mx-auto mb-3" style={{ color: '#48A111' }} />
                            <p className="text-slate-600 font-medium">No academic periods defined yet</p>
                            <p className="text-sm text-slate-400 mt-1">Click "Add Period" to create one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-5 rounded-2xl bg-sky-50 border border-sky-100 shadow-sm">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-bold text-sky-900 mb-1">How It Works</p>
                        <ul className="space-y-1.5 text-sky-700/80 font-medium">
                            <li>• Each academic year typically has 2 periods (customize dates as needed)</li>
                            <li>• Students automatically progress to the next semester when a period ends</li>
                            <li>• <span className="font-bold">FINALIST</span> and <span className="font-bold">ALUMNI</span> tags are auto-assigned based on calculated year</li>
                            <li>• You can edit period names and dates, but not year/period number</li>
                            <li>• Past periods cannot be deleted (for data integrity)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcademicCalendar;
