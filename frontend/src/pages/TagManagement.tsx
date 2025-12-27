import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import { Tag as TagIcon, Plus, Trash2, Users, Search, X, Loader2 } from 'lucide-react';
import TagBadge from '../components/TagBadge';
import EmptyState from '../components/EmptyState';

interface Tag {
    id: string;
    name: string;
    description: string | null;
    type: 'SYSTEM' | 'CUSTOM';
    color: string;
    isSystem: boolean;
    showOnRegistration: boolean;
    createdAt: string;
    memberCount: number;
}

interface Member {
    id: string;
    fullName: string;
    fellowshipNumber: string;
    email: string;
    phoneNumber: string;
    region: {
        id: string;
        name: string;
    };
    assignedAt: string;
    expiresAt: string | null;
    notes: string | null;
}

const TagManagement = () => {
    const { showToast } = useToast();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newTag, setNewTag] = useState({ name: '', description: '', color: '#6366f1' });
    const [submitting, setSubmitting] = useState(false);
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    const [tagMembers, setTagMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tags');
            setTags(response.data);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            showToast('error', 'Failed to load tags');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTag.name.trim()) return;

        try {
            setSubmitting(true);
            const response = await api.post('/tags', newTag);
            setTags([...tags, { ...response.data, memberCount: 0 }]);
            setNewTag({ name: '', description: '', color: '#6366f1' });
            setIsAdding(false);
            showToast('success', 'Tag created successfully');
        } catch (error: any) {
            console.error('Failed to create tag:', error);
            showToast('error', error.response?.data?.error || 'Failed to create tag');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTag = async (tagId: string, tagName: string) => {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This will remove it from all members.`)) {
            return;
        }

        try {
            await api.delete(`/tags/${tagId}`);
            setTags(tags.filter(t => t.id !== tagId));
            if (selectedTag?.id === tagId) {
                setSelectedTag(null);
                setTagMembers([]);
            }
            showToast('success', 'Tag deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete tag:', error);
            showToast('error', error.response?.data?.error || 'Failed to delete tag');
        }
    };

    const handleViewMembers = async (tag: Tag) => {
        setSelectedTag(tag);
        setLoadingMembers(true);
        try {
            const response = await api.get(`/tags/${tag.id}/members`);
            setTagMembers(response.data.members);
        } catch (error) {
            console.error('Failed to fetch tag members:', error);
            showToast('error', 'Failed to load members');
            setTagMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    };

    const closeModal = () => {
        setSelectedTag(null);
        setTagMembers([]);
    };

    const handleToggleRegistrationVisibility = async (tagId: string, currentValue: boolean) => {
        try {
            await api.patch(`/tags/${tagId}/registration-visibility`, {
                showOnRegistration: !currentValue,
            });
            setTags(tags.map(t => t.id === tagId ? { ...t, showOnRegistration: !currentValue } : t));
            showToast('success', `Tag ${!currentValue ? 'enabled' : 'disabled'} for registration`);
        } catch (error: any) {
            console.error('Failed to update tag:', error);
            showToast('error', 'Failed to update tag visibility');
        }
    };

    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const predefinedColors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
        '#10b981', '#06b6d4', '#f97316'
    ];

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-purple-400">
                            Tag Management
                        </h1>
                        <p className="text-slate-400 mt-2">Manage member tags and categories</p>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/50"
                    >
                        <Plus size={20} />
                        Create Tag
                    </button>
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#151d30] rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500"
                    />
                </div>

                {/* Tags List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredTags.length === 0 ? (
                    <EmptyState
                        icon={TagIcon}
                        title={searchQuery ? "No tags found" : "No tags yet"}
                        description={searchQuery ? "Try a different search term" : "Create your first tag to categorize members"}
                        action={!searchQuery ? { label: "Create Tag", onClick: () => setIsAdding(true) } : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTags.map((tag) => (
                            <div key={tag.id} className="bg-[#151d30] rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <TagBadge tag={tag} size="lg" />
                                    {!tag.isSystem && (
                                        <button
                                            onClick={() => handleDeleteTag(tag.id, tag.name)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                {tag.description && <p className="text-slate-400 text-sm mb-4">{tag.description}</p>}

                                {/* Show on Registration Toggle */}
                                <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/50 mb-4">
                                    <span className="text-sm text-slate-300">Show on Registration</span>
                                    <button
                                        onClick={() => handleToggleRegistrationVisibility(tag.id, tag.showOnRegistration)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${tag.showOnRegistration ? 'bg-teal-600' : 'bg-slate-700'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${tag.showOnRegistration ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Users size={16} />
                                        <span className="text-sm">{tag.memberCount} members</span>
                                    </div>
                                    <button
                                        onClick={() => handleViewMembers(tag)}
                                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                    >
                                        View Members
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Tag Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151d30] rounded-2xl p-8 max-w-md w-full border border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Create New Tag</h2>
                            <button onClick={() => { setIsAdding(false); setNewTag({ name: '', description: '', color: '#6366f1' }); }} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddTag} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Tag Name *</label>
                                <input
                                    type="text"
                                    value={newTag.name}
                                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                                    placeholder="e.g., Alumni, Family Leader"
                                    className="w-full px-4 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none"
                                    maxLength={50}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                                <textarea
                                    value={newTag.description}
                                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                                    placeholder="Optional description"
                                    className="w-full px-4 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                                    rows={3}
                                    maxLength={200}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {predefinedColors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewTag({ ...newTag, color })}
                                            className={`w-10 h-10 rounded-lg border-2 transition-all ${newTag.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setIsAdding(false); setNewTag({ name: '', description: '', color: '#6366f1' }); }} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting || !newTag.name.trim()} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {submitting ? (<><Loader2 size={16} className="animate-spin" /> Creating...</>) : 'Create Tag'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tag Members Modal */}
            {selectedTag && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151d30] rounded-2xl p-8 max-w-3xl w-full border border-slate-800 max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold">Members with Tag</h2>
                                <TagBadge tag={selectedTag} />
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {loadingMembers ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : tagMembers.length === 0 ? (
                            <EmptyState icon={Users} title="No members with this tag" description="Assign this tag to members from the Member Management page" />
                        ) : (
                            <div className="overflow-y-auto flex-1">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-[#151d30] border-b border-slate-800">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Member</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Contact</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Region</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Assigned</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tagMembers.map((member) => (
                                            <tr key={member.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                <td className="py-3 px-4">
                                                    <div className="font-medium">{member.fullName}</div>
                                                    <div className="text-sm text-slate-400">{member.fellowshipNumber}</div>
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    <div>{member.email}</div>
                                                    <div className="text-slate-400">{member.phoneNumber}</div>
                                                </td>
                                                <td className="py-3 px-4 text-sm">{member.region.name}</td>
                                                <td className="py-3 px-4 text-sm text-slate-400">
                                                    {new Date(member.assignedAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagManagement;
