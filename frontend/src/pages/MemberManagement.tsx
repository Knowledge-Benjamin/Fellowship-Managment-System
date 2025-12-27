import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import { Users, Search, Tag as TagIcon, X, Loader2, Check, UserPlus } from 'lucide-react';
import TagBadge from '../components/TagBadge';
import EmptyState from '../components/EmptyState';

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
    phoneNumber: string;
    region: {
        id: string;
        name: string;
    };
    tags: Tag[];
}

interface Tag {
    id: string;
    name: string;
    color: string;
    type: 'SYSTEM' | 'CUSTOM';
    isSystem: boolean;
}

const MemberManagement = () => {
    const { showToast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [showBulkTagModal, setShowBulkTagModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'assign' | 'remove'>('assign');
    const [selectedTag, setSelectedTag] = useState('');
    const [bulkNotes, setBulkNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [membersRes, tagsRes] = await Promise.all([
                api.get('/members'),
                api.get('/tags')
            ]);
            setMembers(membersRes.data);
            setAllTags(tagsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            showToast('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedMembers.size === filteredMembers.length) {
            setSelectedMembers(new Set());
        } else {
            setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
        }
    };

    const handleSelectMember = (memberId: string) => {
        const newSelected = new Set(selectedMembers);
        if (newSelected.has(memberId)) {
            newSelected.delete(memberId);
        } else {
            newSelected.add(memberId);
        }
        setSelectedMembers(newSelected);
    };

    const openBulkTagModal = (action: 'assign' | 'remove') => {
        if (selectedMembers.size === 0) {
            showToast('error', 'Please select at least one member');
            return;
        }
        setBulkAction(action);
        setSelectedTag('');
        setBulkNotes('');
        setShowBulkTagModal(true);
    };

    const handleBulkTagOperation = async () => {
        if (!selectedTag) {
            showToast('error', 'Please select a tag');
            return;
        }

        try {
            setSubmitting(true);
            const endpoint = bulkAction === 'assign'
                ? '/tags/members/tags/bulk-assign'
                : '/tags/members/tags/bulk-remove';

            await api.post(endpoint, {
                memberIds: Array.from(selectedMembers),
                tagId: selectedTag,
                notes: bulkNotes || undefined
            });

            showToast('success', `Tag ${bulkAction === 'assign' ? 'assigned to' : 'removed from'} ${selectedMembers.size} member(s)`);
            setShowBulkTagModal(false);
            setSelectedMembers(new Set());
            fetchData(); // Refresh members to show updated tags
        } catch (error: any) {
            console.error('Bulk tag operation failed:', error);
            showToast('error', error.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredMembers = members.filter(member =>
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.fellowshipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.region.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const customTags = allTags.filter(t => !t.isSystem);

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-purple-400">
                            Member Management
                        </h1>
                        <p className="text-slate-400 mt-2">Manage member tags and assignments</p>
                    </div>
                    {selectedMembers.size > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">
                                {selectedMembers.size} selected
                            </span>
                            <button
                                onClick={() => openBulkTagModal('assign')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium flex items-center gap-2 transition-all"
                            >
                                <TagIcon size={16} />
                                Assign Tags
                            </button>
                            <button
                                onClick={() => openBulkTagModal('remove')}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium flex items-center gap-2 transition-all"
                            >
                                <X size={16} />
                                Remove Tags
                            </button>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#151d30] rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500"
                    />
                </div>

                {/* Members Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={searchQuery ? "No members found" : "No members yet"}
                        description={searchQuery ? "Try a different search term" : "Register members to get started"}
                    />
                ) : (
                    <div className="bg-[#151d30] rounded-2xl border border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50 border-b border-slate-800">
                                    <tr>
                                        <th className="py-4 px-4 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                            />
                                        </th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium">Member</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium">Contact</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium">Region</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium">Tags</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembers.has(member.id)}
                                                    onChange={() => handleSelectMember(member.id)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <div>
                                                    <div className="font-medium">{member.fullName}</div>
                                                    <div className="text-sm text-slate-400">{member.fellowshipNumber}</div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-sm">
                                                    <div>{member.email}</div>
                                                    <div className="text-slate-400">{member.phoneNumber}</div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm">{member.region.name}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {member.tags && member.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {member.tags.map((tag) => (
                                                            <TagBadge key={tag.id} tag={tag} size="sm" showIcon={false} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-500">No tags</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-800">
                            <p className="text-sm text-slate-400">
                                Showing {filteredMembers.length} of {members.length} members
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Tag Modal */}
            {showBulkTagModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151d30] rounded-2xl p-8 max-w-md w-full border border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">
                                {bulkAction === 'assign' ? 'Assign Tags' : 'Remove Tags'}
                            </h2>
                            <button
                                onClick={() => setShowBulkTagModal(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-slate-400 mb-6">
                            {bulkAction === 'assign' ? 'Assign' : 'Remove'} tag {bulkAction === 'assign' ? 'to' : 'from'} {selectedMembers.size} selected member(s)
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Select Tag *
                                </label>
                                <select
                                    value={selectedTag}
                                    onChange={(e) => setSelectedTag(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none"
                                    required
                                >
                                    <option value="">Choose a tag...</option>
                                    {customTags.map((tag) => (
                                        <option key={tag.id} value={tag.id}>
                                            {tag.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={bulkNotes}
                                    onChange={(e) => setBulkNotes(e.target.value)}
                                    placeholder={`Reason for ${bulkAction === 'assign' ? 'assigning' : 'removing'} this tag...`}
                                    className="w-full px-4 py-2 bg-[#0a0f1e] rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkTagModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkTagOperation}
                                    disabled={submitting || !selectedTag}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} />
                                            {bulkAction === 'assign' ? 'Assign' : 'Remove'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberManagement;
