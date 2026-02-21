import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import {
    Users, Search, Tag as TagIcon, X, Loader2, Check,
    Trash2, UserCheck, Hash, Mail, Phone, MapPin, BookOpen
} from 'lucide-react';
import TagBadge from '../components/TagBadge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
    phoneNumber: string;
    region: { id: string; name: string };
    courseRelation?: { id: string; name: string; durationYears: number };
    initialYearOfStudy?: number;
    initialSemester?: number;
    tags: Tag[];
}

interface Tag {
    id: string;
    name: string;
    color: string;
    type: 'SYSTEM' | 'CUSTOM';
    isSystem: boolean;
}

/* ── Avatar initials ── */
const Avatar = ({ name }: { name: string }) => {
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>
            {initials}
        </div>
    );
};

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

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [membersRes, tagsRes] = await Promise.all([
                api.get('/members'),
                api.get('/tags'),
            ]);
            setMembers(membersRes.data);
            setAllTags(tagsRes.data);
        } catch {
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

    const handleSelectMember = (id: string) => {
        const next = new Set(selectedMembers);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedMembers(next);
    };

    const openBulkTagModal = (action: 'assign' | 'remove') => {
        if (selectedMembers.size === 0) { showToast('error', 'Select at least one member'); return; }
        setBulkAction(action);
        setSelectedTag('');
        setBulkNotes('');
        setShowBulkTagModal(true);
    };

    const handleBulkTagOperation = async () => {
        if (!selectedTag) { showToast('error', 'Please select a tag'); return; }
        try {
            setSubmitting(true);
            const endpoint = bulkAction === 'assign'
                ? '/tags/members/tags/bulk-assign'
                : '/tags/members/tags/bulk-remove';
            await api.post(endpoint, {
                memberIds: Array.from(selectedMembers),
                tagId: selectedTag,
                notes: bulkNotes || undefined,
            });
            showToast('success', `Tag ${bulkAction === 'assign' ? 'assigned to' : 'removed from'} ${selectedMembers.size} member(s)`);
            setShowBulkTagModal(false);
            setSelectedMembers(new Set());
            fetchData();
        } catch (error: any) {
            showToast('error', error.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (memberId: string, memberName: string) => {
        if (!window.confirm(`Delete ${memberName}? Their history will be preserved.`)) return;
        try {
            await api.delete(`/members/${memberId}`);
            showToast('success', 'Member deleted');
            fetchData();
            if (selectedMembers.has(memberId)) {
                const next = new Set(selectedMembers);
                next.delete(memberId);
                setSelectedMembers(next);
            }
        } catch {
            showToast('error', 'Failed to delete member');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedMembers.size === 0) return;
        if (!window.confirm(`Delete ${selectedMembers.size} members? Their history will be preserved.`)) return;
        try {
            await api.post('/members/bulk-delete', { memberIds: Array.from(selectedMembers) });
            showToast('success', `${selectedMembers.size} members deleted`);
            setSelectedMembers(new Set());
            fetchData();
        } catch {
            showToast('error', 'Failed to delete members');
        }
    };

    const filteredMembers = members.filter(m =>
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.fellowshipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.region.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const customTags = allTags.filter(t => !t.isSystem);
    const allSelected = selectedMembers.size === filteredMembers.length && filteredMembers.length > 0;

    if (loading) return <LoadingSpinner message="Loading members..." />;

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">

            {/* Page header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Member Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage member tags and assignments</p>
                </div>
                {/* Summary pill */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
                    <Users size={18} className="text-[#48A111]" />
                    <span className="font-bold text-slate-900 text-lg">{members.length}</span>
                    <span className="text-slate-500 text-sm">total members</span>
                </div>
            </div>

            {/* Search + Bulk actions bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name, email, number or region…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition-all"
                        onFocus={e => { e.currentTarget.style.borderColor = '#48A111'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                </div>

                {/* Bulk action buttons (contextual) */}
                {selectedMembers.size > 0 && (
                    <div className="flex items-center gap-2 bg-[#e9f5e1] border border-[#48A111]/20 rounded-xl px-4 py-2">
                        <span className="text-sm font-semibold text-[#48A111] mr-1">
                            {selectedMembers.size} selected
                        </span>
                        <button
                            onClick={() => openBulkTagModal('assign')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
                        >
                            <TagIcon size={13} /> Assign Tag
                        </button>
                        <button
                            onClick={() => openBulkTagModal('remove')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
                        >
                            <X size={13} /> Remove Tag
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-100 transition-all"
                        >
                            <Trash2 size={13} /> Delete
                        </button>
                        <button
                            onClick={() => setSelectedMembers(new Set())}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                            title="Clear selection"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            {filteredMembers.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title={searchQuery ? 'No members match' : 'No members yet'}
                    description={searchQuery ? 'Try a different search term' : 'Register members to get started'}
                />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="py-3.5 px-4 w-10">
                                        {/* Custom checkbox — select all */}
                                        <button
                                            onClick={handleSelectAll}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${allSelected
                                                    ? 'border-[#48A111] bg-[#48A111]'
                                                    : 'border-slate-300 bg-white hover:border-[#48A111]'
                                                }`}
                                        >
                                            {allSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </button>
                                    </th>
                                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</th>
                                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Academic</th>
                                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tags</th>
                                    <th className="py-3.5 px-4 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredMembers.map(member => {
                                    const isSelected = selectedMembers.has(member.id);
                                    return (
                                        <tr
                                            key={member.id}
                                            className={`transition-colors ${isSelected ? 'bg-[#e9f5e1]/40' : 'hover:bg-slate-50'}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleSelectMember(member.id)}
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'border-[#48A111] bg-[#48A111]'
                                                            : 'border-slate-300 bg-white hover:border-[#48A111]'
                                                        }`}
                                                >
                                                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </button>
                                            </td>

                                            {/* Member */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={member.fullName} />
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-sm">{member.fullName}</p>
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Hash size={10} />{member.fellowshipNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="py-3 px-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-slate-700 flex items-center gap-1.5">
                                                        <Mail size={11} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[160px]">{member.email}</span>
                                                    </p>
                                                    {member.phoneNumber && (
                                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                            <Phone size={11} className="text-slate-400 shrink-0" />{member.phoneNumber}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Region */}
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                                    <MapPin size={10} className="text-slate-400" />
                                                    {member.region.name}
                                                </span>
                                            </td>

                                            {/* Academic */}
                                            <td className="py-3 px-4">
                                                {member.initialYearOfStudy && member.initialSemester ? (
                                                    <div>
                                                        <span className="text-xs font-semibold text-blue-600">
                                                            Yr {member.initialYearOfStudy}, Sem {member.initialSemester}
                                                        </span>
                                                        {member.courseRelation && (
                                                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                                <BookOpen size={9} />{member.courseRelation.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Tags */}
                                            <td className="py-3 px-4">
                                                {member.tags && member.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {member.tags.map(tag => (
                                                            <TagBadge key={tag.id} tag={tag} size="sm" showIcon={false} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No tags</span>
                                                )}
                                            </td>

                                            {/* Delete */}
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleDelete(member.id, member.fullName)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                    title="Delete member"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                            Showing <span className="font-semibold text-slate-600">{filteredMembers.length}</span> of{' '}
                            <span className="font-semibold text-slate-600">{members.length}</span> members
                            {selectedMembers.size > 0 && (
                                <span className="ml-2 text-[#48A111] font-semibold">· {selectedMembers.size} selected</span>
                            )}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                            >
                                <X size={12} /> Clear search
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Bulk Tag Modal ── */}
            {showBulkTagModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${bulkAction === 'assign' ? 'bg-[#e9f5e1]' : 'bg-red-50'}`}>
                                    {bulkAction === 'assign'
                                        ? <UserCheck size={18} className="text-[#48A111]" />
                                        : <X size={18} className="text-red-500" />
                                    }
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        {bulkAction === 'assign' ? 'Assign Tag' : 'Remove Tag'}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBulkTagModal(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Tag select */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                    Select Tag <span className="text-red-400 normal-case">*</span>
                                </label>
                                <select
                                    value={selectedTag}
                                    onChange={e => setSelectedTag(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm focus:outline-none transition-all"
                                    onFocus={e => { e.currentTarget.style.borderColor = '#48A111'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    required
                                >
                                    <option value="">Choose a tag…</option>
                                    {customTags.map(tag => (
                                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                    Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
                                </label>
                                <textarea
                                    value={bulkNotes}
                                    onChange={e => setBulkNotes(e.target.value)}
                                    placeholder={`Reason for ${bulkAction === 'assign' ? 'assigning' : 'removing'} this tag…`}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition-all resize-none"
                                    onFocus={e => { e.currentTarget.style.borderColor = '#48A111'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkTagModal(false)}
                                    className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkTagOperation}
                                    disabled={submitting || !selectedTag}
                                    className="flex-1 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{ backgroundColor: bulkAction === 'assign' ? '#48A111' : '#ef4444' }}
                                    onMouseEnter={e => { if (!e.currentTarget.disabled && bulkAction === 'assign') e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                                    onMouseLeave={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = bulkAction === 'assign' ? '#48A111' : '#ef4444'; }}
                                >
                                    {submitting ? (
                                        <><Loader2 size={15} className="animate-spin" /> Processing…</>
                                    ) : (
                                        <><Check size={15} /> {bulkAction === 'assign' ? 'Assign Tag' : 'Remove Tag'}</>
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
