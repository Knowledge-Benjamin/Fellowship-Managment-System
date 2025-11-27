import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import { MapPin, Plus, Trash2, Users, Search, AlertCircle, Loader2 } from 'lucide-react';

interface Region {
    id: string;
    name: string;
    _count?: {
        members: number;
    };
}

const RegionManagement = () => {
    const { showToast } = useToast();
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newRegionName, setNewRegionName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            console.error('Failed to fetch regions:', error);
            showToast('error', 'Failed to load regions');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRegion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRegionName.trim()) return;

        try {
            setSubmitting(true);
            const response = await api.post('/regions', { name: newRegionName.trim() });
            setRegions([...regions, response.data.region]);
            setNewRegionName('');
            setIsAdding(false);
            showToast('success', 'Region added successfully');
        } catch (error: any) {
            console.error('Add region error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to add region';
            showToast('error', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRegion = async (id: string, name: string, memberCount: number) => {
        if (memberCount > 0) {
            showToast('error', `Cannot delete ${name}. It has ${memberCount} assigned members.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the region "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/regions/${id}`);
            setRegions(regions.filter(r => r.id !== id));
            showToast('success', 'Region deleted successfully');
        } catch (error: any) {
            console.error('Delete region error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete region';
            showToast('error', errorMessage);
        }
    };

    const filteredRegions = regions.filter(region =>
        region.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                            <MapPin className="w-6 h-6" />
                        </div>
                        Region Management
                    </h1>
                    <p className="text-slate-400 mt-1">Manage fellowship regions and locations</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Region
                </button>
            </div>

            {/* Add Region Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-card w-full max-w-md p-6 space-y-6 relative animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white">Add New Region</h3>

                        <form onSubmit={handleAddRegion} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Region Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Central"
                                    className="input"
                                    value={newRegionName}
                                    onChange={(e) => setNewRegionName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !newRegionName.trim()}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Create Region
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search and List */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search regions..."
                        className="input pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : filteredRegions.length === 0 ? (
                    <div className="glass-card p-12 text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 text-slate-400">
                            <MapPin className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No regions found</h3>
                        <p className="text-slate-400">
                            {searchQuery ? 'Try adjusting your search query' : 'Get started by adding a new region'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRegions.map((region) => (
                            <div
                                key={region.id}
                                className="glass-card p-5 group hover:border-teal-500/30 transition-colors relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-lg bg-slate-800/50 text-teal-400">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRegion(region.id, region.name, region._count?.members || 0)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete Region"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-2">{region.name}</h3>

                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Users className="w-4 h-4" />
                                    <span>{region._count?.members || 0} Members</span>
                                </div>

                                {region._count?.members && region._count.members > 0 && (
                                    <div className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-slate-900 text-xs text-slate-300 px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
                                            Cannot delete (has members)
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionManagement;
