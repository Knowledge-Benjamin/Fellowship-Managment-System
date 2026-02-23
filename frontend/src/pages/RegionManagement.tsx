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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[#e9f5e1]">
                        <MapPin className="w-6 h-6" style={{ color: '#48A111' }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Region Management</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage fellowship regions and locations</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:scale-[1.02] transition-all flex items-center gap-2"
                    style={{ backgroundColor: '#48A111' }}
                >
                    <Plus className="w-4 h-4" />
                    Add Region
                </button>
            </div>

            {/* Add Region Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm max-h-[90dvh] flex flex-col relative animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                            <h2 className="font-bold text-slate-900">Add New Region</h2>
                            <button onClick={() => setIsAdding(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddRegion} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Region Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Central"
                                        className="input"
                                        value={newRegionName}
                                        onChange={(e) => setNewRegionName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !newRegionName.trim()}
                                        className="flex-[2] px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                        style={{ backgroundColor: '#48A111' }}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Create Region
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and List */}
            <div className="space-y-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search regions..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#48A111' }} />
                    </div>
                ) : filteredRegions.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e9f5e1] mb-4">
                            <MapPin className="w-8 h-8" style={{ color: '#48A111' }} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No regions found</h3>
                        <p className="text-slate-500 mt-1">
                            {searchQuery ? 'Try adjusting your search query' : 'Get started by adding a new region'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRegions.map((region) => (
                            <div
                                key={region.id}
                                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all relative group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 rounded-xl bg-[#e9f5e1]">
                                        <MapPin className="w-5 h-5" style={{ color: '#48A111' }} />
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRegion(region.id, region.name, region._count?.members || 0)}
                                        className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Delete Region"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-2 truncate">{region.name}</h3>

                                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                                    <Users className="w-4 h-4" />
                                    <span>{region._count?.members || 0} Members</span>
                                </div>

                                {region._count?.members && region._count.members > 0 && (
                                    <div className="absolute top-5 right-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="bg-slate-800 text-xs text-white px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg">
                                            Cannot delete (has members)
                                            {/* Little triangle arrow */}
                                            <div className="absolute w-2 h-2 bg-slate-800 border-r border-b border-slate-700 transform rotate-45 -right-1 top-1/2 -translate-y-1/2"></div>
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
