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
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Calendar className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold gradient-text">Academic Calendar</h1>
                        <p className="text-sm text-slate-400 mt-1">
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
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Period
                </button>
            </div>

            {/* Current Period Alert */}
            {currentPeriod && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-400" />
                        <div>
                            <p className="font-semibold text-green-400">Current Active Period</p>
                            <p className="text-sm text-slate-300">
                                {currentPeriod.academicYear} - {currentPeriod.periodName}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6">
                            {editingPeriod ? 'Edit Period' : 'Create New Period'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Academic Year *</label>
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
                                        <p className="text-xs text-slate-500 mt-1">Cannot change year when editing</p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Period Number *</label>
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
                                        <p className="text-xs text-slate-500 mt-1">Cannot change period number when editing</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="label">Period Name *</label>
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
                                <div>
                                    <label className="label">Start Date *</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Pick any month/date you want
                                    </p>
                                </div>
                                <div>
                                    <label className="label">End Date *</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Must be after start date
                                    </p>
                                </div>
                            </div>

                            {/* Helper Info */}
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-slate-300">
                                        <p className="font-semibold text-blue-400 mb-1">Examples:</p>
                                        <ul className="space-y-1 text-slate-400">
                                            <li>• Period 1: August - December</li>
                                            <li>• Period 2: January - May (or January - April)</li>
                                            <li>• You can customize dates to fit your university calendar</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingPeriod(null);
                                        resetForm();
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingPeriod ? 'Update' : 'Create'} Period
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Periods Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left p-4 text-slate-400 font-medium">Academic Year</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Period</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Start Date</th>
                                <th className="text-left p-4 text-slate-400 font-medium">End Date</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                                <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
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
                                    <tr key={period.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                        <td className="p-4 font-medium">{period.academicYear}</td>
                                        <td className="p-4">{period.periodName}</td>
                                        <td className="p-4 text-slate-400">
                                            {new Date(period.startDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {new Date(period.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${isActive
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : isPast
                                                            ? 'bg-slate-500/20 text-slate-400'
                                                            : 'bg-blue-500/20 text-blue-400'
                                                    }`}
                                            >
                                                {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(period)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Edit period name and dates"
                                                >
                                                    <Edit2 className="w-4 h-4 text-slate-400" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(period.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={isPast ? "Cannot delete past periods" : "Delete period"}
                                                    disabled={isPast}
                                                >
                                                    <Trash2 className={`w-4 h-4 ${isPast ? 'text-slate-600' : 'text-red-400'}`} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {periods.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No academic periods defined yet</p>
                            <p className="text-sm mt-1">Click "Add Period" to create one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-slate-300">
                        <p className="font-semibold text-blue-400 mb-1">How It Works</p>
                        <ul className="space-y-1 text-slate-400">
                            <li>• Each academic year typically has 2 periods (customize dates as needed)</li>
                            <li>• Students automatically progress to the next semester when a period ends</li>
                            <li>• FINALIST and ALUMNI tags are auto-assigned based on calculated year</li>
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
