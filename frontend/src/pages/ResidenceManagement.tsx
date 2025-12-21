import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import { Home, Plus, Trash2, Search, X, Loader2, Edit2, Users, MapPin } from 'lucide-react';
import EmptyState from '../components/EmptyState';

interface Residence {
    id: string;
    name: string;
    type: 'HALL' | 'HOSTEL';
    _count?: {
        members: number;
    };
}

const ResidenceManagement = () => {
    const { showToast } = useToast();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingResidence, setEditingResidence] = useState<Residence | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'HALL' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchResidences();
    }, []);

    const fetchResidences = async () => {
        try {
            setLoading(true);
            const response = await api.get('/residences');
            setResidences(response.data);
        } catch (error) {
            console.error('Failed to fetch residences:', error);
            showToast('error', 'Failed to load residences');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (residence?: Residence) => {
        if (residence) {
            setEditingResidence(residence);
            setFormData({ name: residence.name, type: residence.type });
        } else {
            setEditingResidence(null);
            setFormData({ name: '', type: 'HALL' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingResidence(null);
        setFormData({ name: '', type: 'HALL' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            setSubmitting(true);
            const payload = {
                name: formData.name.trim(),
                type: formData.type
            };

            if (editingResidence) {
                const response = await api.patch(`/residences/${editingResidence.id}`, payload);
                setResidences(residences.map(r => r.id === editingResidence.id ? { ...response.data, _count: r._count } : r));
                showToast('success', 'Residence updated successfully');
            } else {
                const response = await api.post('/residences', payload);
                setResidences([...residences, { ...response.data, _count: { members: 0 } }]);
                showToast('success', 'Residence created successfully');
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Failed to save residence:', error);
            showToast('error', error.response?.data?.error || 'Failed to save residence');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (residence: Residence) => {
        if (!confirm(`Are you sure you want to delete "${residence.name}"?`)) return;

        try {
            await api.delete(`/residences/${residence.id}`);
            setResidences(residences.filter(r => r.id !== residence.id));
            showToast('success', 'Residence deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete residence:', error);
            showToast('error', error.response?.data?.error || 'Failed to delete residence');
        }
    };

    const filteredResidences = residences.filter(residence =>
        residence.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        residence.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group by Type
    const groupedByType = filteredResidences.reduce((acc, residence) => {
        const type = residence.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(residence);
        return acc;
    }, {} as Record<string, Residence[]>);

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                            Residence Management
                        </h1>
                        <p className="text-slate-400 mt-2">Manage university halls and hostels</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 bg-teal-600 hover:bg-teal-700 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-teal-500/30"
                    >
                        <Plus size={20} />
                        Add Residence
                    </button>
                </div>

                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search residences..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#151d30] rounded-xl border border-slate-800 focus:border-teal-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : filteredResidences.length === 0 ? (
                    <EmptyState
                        icon={Home}
                        title={searchQuery ? "No residences found" : "No residences yet"}
                        description={searchQuery ? "Try a different search term" : "Add halls or hostels to the system"}
                        action={!searchQuery ? { label: "Add Residence", onClick: () => handleOpenModal() } : undefined}
                    />
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedByType).map(([type, items]) => (
                            <div key={type}>
                                <div className="flex items-center gap-2 mb-4">
                                    <MapPin className="w-5 h-5 text-teal-400" />
                                    <h2 className="text-xl font-semibold text-white">
                                        {type === 'HALL' ? 'University Halls' : 'Hostels'}
                                    </h2>
                                    <span className="text-sm text-slate-500">({items.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {items.map((residence) => (
                                        <ResidenceCard key={residence.id} residence={residence} onEdit={handleOpenModal} onDelete={handleDelete} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-[#151d30] rounded-2xl p-8 max-w-md w-full border border-slate-800 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingResidence ? 'Edit Residence' : 'Add New Residence'}
                                </h2>
                                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'HALL' })}
                                            className={`px-3 py-3 text-sm rounded-xl border transition-all ${formData.type === 'HALL' ? 'bg-teal-600 border-teal-500 text-white font-semibold' : 'bg-[#0a0f1e] border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            Hall
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'HOSTEL' })}
                                            className={`px-3 py-3 text-sm rounded-xl border transition-all ${formData.type === 'HOSTEL' ? 'bg-teal-600 border-teal-500 text-white font-semibold' : 'bg-[#0a0f1e] border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            Hostel
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Residence Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={formData.type === 'HALL' ? "e.g. Africa Hall" : "e.g. Olympia"}
                                        className="w-full px-4 py-3 bg-[#0a0f1e] rounded-xl border border-slate-700 focus:border-teal-500 focus:outline-none text-white placeholder-slate-600 transition-colors"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded-xl font-medium transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            editingResidence ? 'Update Residence' : 'Create Residence'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ResidenceCard: React.FC<{ residence: Residence; onEdit: (residence: Residence) => void; onDelete: (residence: Residence) => void }> = ({ residence, onEdit, onDelete }) => (
    <div className="glass-card p-6 group hover:border-teal-500/50 transition-colors">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <Home size={20} />
                </div>
                <div>
                    <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        {residence.type}
                    </span>
                </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(residence)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={() => onDelete(residence)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {residence.name}
        </h3>

        <div className="flex items-center gap-2 text-sm text-slate-400 border-t border-slate-800 pt-4 mt-2">
            <Users size={16} />
            <span>{residence._count?.members || 0} resident{residence._count?.members !== 1 && 's'}</span>
        </div>
    </div>
);

export default ResidenceManagement;
