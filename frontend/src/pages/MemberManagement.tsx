import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import {
    Users, Search, Tag as TagIcon, X, Loader2, Check,
    Trash2, UserCheck, Hash, Mail, Phone, MapPin, BookOpen, Pencil,
    Edit2, ChevronDown, ChevronUp, CheckCircle, XCircle
} from 'lucide-react';
import TagBadge from '../components/TagBadge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomSelect from '../components/CustomSelect';

interface Member {
    id: string;
    fullName: string;
    email: string;
    fellowshipNumber: string;
    phoneNumber: string;
    gender: string;
    region: { id: string; name: string };
    courseRelation?: { id: string; name: string; durationYears: number };
    residenceId?: string;
    hostelName?: string;
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

interface EditChange { field: string; oldValue: string; newValue: string; }
interface EditRequest {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    changes: EditChange[];
    reason: string;
    createdAt: string;
    member: { id: string; fullName: string; fellowshipNumber: string; email: string; region?: { name: string } | null; };
}

interface RefData { id: string; name: string; }

/* ── Edit modal ── */
function EditMemberModal({
    member, regions, colleges, courses, residences, onClose, onSaved,
}: {
    member: Member;
    regions: RefData[]; colleges: RefData[]; courses: RefData[]; residences: RefData[];
    onClose: () => void;
    onSaved: (updated: Partial<Member>) => void;
}) {
    const { showToast } = useToast();
    const [form, setForm] = useState({
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber,
        gender: member.gender,
        regionId: member.region?.id ?? '',
        courseId: member.courseRelation?.id ?? '',
        initialYearOfStudy: member.initialYearOfStudy?.toString() ?? '',
        initialSemester: member.initialSemester?.toString() ?? '',
        residenceId: member.residenceId ?? '',
        hostelName: member.hostelName ?? '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.fullName.trim()) { showToast('error', 'Full name is required'); return; }
        if (!form.email.trim()) { showToast('error', 'Email is required'); return; }
        if (!form.regionId) { showToast('error', 'Region is required'); return; }
        try {
            setSaving(true);
            const res = await api.patch(`/members/${member.id}`, {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim(),
                gender: form.gender,
                regionId: form.regionId,
                courseId: form.courseId || null,
                initialYearOfStudy: form.initialYearOfStudy ? parseInt(form.initialYearOfStudy, 10) : null,
                initialSemester: form.initialSemester ? parseInt(form.initialSemester, 10) : null,
                residenceId: form.residenceId || null,
                hostelName: form.hostelName.trim() || null,
            });
            showToast('success', `${form.fullName} updated`);
            onSaved(res.data.member);
        } catch (err: any) {
            showToast('error', err.response?.data?.message ?? 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div>
                        <h2 className="font-bold text-slate-900 flex items-center gap-2"><Pencil size={14} className="text-[#48A111]" /> Edit Member</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{member.fellowshipNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Personal */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Personal</p>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                                <input className="input" value={form.fullName} onChange={e => set('fullName')(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
                                <input className="input" type="email" value={form.email} onChange={e => set('email')(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone</label>
                                <input className="input" type="tel" value={form.phoneNumber} onChange={e => set('phoneNumber')(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gender</label>
                                <CustomSelect value={form.gender} onChange={set('gender')}
                                    options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} />
                            </div>
                        </div>
                    </div>

                    {/* Academic */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Academic</p>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Course</label>
                                <CustomSelect value={form.courseId} onChange={set('courseId')}
                                    options={[{ value: '', label: 'None' }, ...courses.map(c => ({ value: c.id, label: c.name }))]} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Year of Study</label>
                                    <CustomSelect value={form.initialYearOfStudy} onChange={set('initialYearOfStudy')}
                                        options={[{ value: '', label: 'Not set' }, ...[1,2,3,4,5,6,7].map(y => ({ value: String(y), label: `Year ${y}` }))]} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Semester</label>
                                    <CustomSelect value={form.initialSemester} onChange={set('initialSemester')}
                                        options={[{ value: '', label: 'Not set' }, { value: '1', label: 'Sem 1' }, { value: '2', label: 'Sem 2' }]} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Residence</label>
                                <CustomSelect value={form.residenceId} onChange={set('residenceId')}
                                    options={[{ value: '', label: 'None' }, ...residences.map(r => ({ value: r.id, label: r.name }))]} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hostel / Hall</label>
                                <input className="input" value={form.hostelName} onChange={e => set('hostelName')(e.target.value)} placeholder="e.g. Complex Hall" />
                            </div>
                        </div>
                    </div>

                    {/* Assignment */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Assignment</p>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Region <span className="text-red-400">*</span></label>
                            <CustomSelect value={form.regionId} onChange={set('regionId')}
                                options={[{ value: '', label: 'Select region', disabled: true }, ...regions.map(r => ({ value: r.id, label: r.name }))]} />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#48A111' }}>
                            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);

    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [showBulkTagModal, setShowBulkTagModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'assign' | 'remove'>('assign');
    const [selectedTag, setSelectedTag] = useState('');
    const [bulkNotes, setBulkNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Edit modal
    const [editTarget, setEditTarget] = useState<Member | null>(null);

    // Reference data for edit modal
    const [regions, setRegions] = useState<RefData[]>([]);
    const [colleges, setColleges] = useState<RefData[]>([]);
    const [courses, setCourses] = useState<RefData[]>([]);
    const [residences, setResidences] = useState<RefData[]>([]);

    // Tabs
    const [activeTab, setActiveTab] = useState<'members' | 'editRequests'>('members');

    // Edit requests
    const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    useEffect(() => {
        const to = setTimeout(() => {
            fetchData(page, searchQuery);
        }, 300);
        return () => clearTimeout(to);
    }, [searchQuery, page]);

    useEffect(() => {
        // Load reference data once for the edit modal
        Promise.all([
            api.get('/regions').then(r => setRegions(r.data)),
            api.get('/colleges').then(r => setColleges(r.data)),
            api.get('/courses').then(r => setCourses(r.data)),
            api.get('/residences').then(r => setResidences(r.data)),
        ]).catch(() => {});
    }, []);

    const fetchEditRequests = async () => {
        try {
            setLoadingRequests(true);
            const res = await api.get('/members/edit-requests?status=PENDING');
            setEditRequests(res.data);
        } catch { /* silent */ }
        finally { setLoadingRequests(false); }
    };

    useEffect(() => {
        if (activeTab === 'editRequests') fetchEditRequests();
    }, [activeTab]);

    const handleReview = async (reqId: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            setReviewingId(reqId);
            await api.patch(`/members/edit-requests/${reqId}`, { status, reviewNote: reviewNote.trim() || undefined });
            showToast('success', `Request ${status.toLowerCase()}`);
            setReviewNote('');
            setExpandedReqId(null);
            setEditRequests(prev => prev.filter(r => r.id !== reqId));
        } catch (err: any) {
            showToast('error', err.response?.data?.message ?? 'Action failed');
        } finally {
            setReviewingId(null);
        }
    };

    const fetchData = async (currentPage = page, search = searchQuery) => {
        try {
            setLoading(true);
            const [membersRes, tagsRes] = await Promise.all([
                api.get('/members', { params: { page: currentPage, limit: 50, search } }),
                api.get('/tags'),
            ]);
            setMembers(membersRes.data.data || []);
            setTotalPages(membersRes.data.meta?.totalPages || 1);
            setTotalMembers(membersRes.data.meta?.total || 0);
            setAllTags(tagsRes.data);
        } catch {
            showToast('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedMembers.size === members.length && members.length > 0) {
            setSelectedMembers(new Set());
        } else {
            setSelectedMembers(new Set(members.map(m => m.id)));
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

    const customTags = allTags.filter(t => !t.isSystem);
    const allSelected = selectedMembers.size === members.length && members.length > 0;

    // Use a skeleton/spinner just for the table when paginating instead of full page block
    // if (loading && members.length === 0) return <LoadingSpinner message="Loading members..." />;

    return (
        <div className="max-w-7xl mx-auto animate-fade-in relative">
            {loading && members.length > 0 && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                    <Loader2 className="animate-spin text-[#48A111] w-8 h-8" />
                </div>
            )}

            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Member Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage member details, tags, and review edit requests</p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
                    <Users size={18} className="text-[#48A111]" />
                    <span className="font-bold text-slate-900 text-lg">{totalMembers}</span>
                    <span className="text-slate-500 text-sm">total match{totalMembers === 1 ? '' : 'es'}</span>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'members'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <span className="flex items-center gap-2"><Users size={14} /> Members</span>
                </button>
                <button
                    onClick={() => setActiveTab('editRequests')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'editRequests'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <Edit2 size={14} /> Edit Requests
                        {editRequests.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{editRequests.length}</span>
                        )}
                    </span>
                </button>
            </div>
            {/* ── Members Tab ── */}
            {activeTab === 'members' && (<>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name, email, number or region…"
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
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
            {members.length === 0 && !loading ? (
                <EmptyState
                    icon={Users}
                    title={searchQuery ? 'No members match' : 'No members yet'}
                    description={searchQuery ? 'Try a different search term' : 'Register members to get started'}
                />
            ) : members.length === 0 && loading ? (
                <LoadingSpinner message="Loading members..." />
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
                                {members.map((member: any) => {
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
                                                        {member.tags.map((tag: Tag) => (
                                                            <TagBadge key={tag.id} tag={tag} size="sm" showIcon={false} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No tags</span>
                                                )}
                                            </td>

                                            {/* Edit */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditTarget(member)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-[#e9f5e1] hover:text-[#48A111] transition-all"
                                                        title="Edit member"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(member.id, member.fullName)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                                        title="Delete member"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{totalMembers > 0 ? (page - 1) * 50 + 1 : 0}</span> to <span className="font-semibold text-slate-700">{Math.min(page * 50, totalMembers)}</span> of <span className="font-semibold text-slate-700">{totalMembers}</span> members
                            {selectedMembers.size > 0 && (
                                <span className="ml-2 text-[#48A111] font-semibold">· {selectedMembers.size} selected</span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setPage(p => Math.max(1, p - 1)); }}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <div className="px-4 py-2 flex items-center justify-center text-sm font-semibold text-slate-700">
                                {page} / {totalPages}
                            </div>
                            <button
                                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }}
                                disabled={page >= totalPages}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>)}

            {/* ── Edit Requests Tab ── */}
            {activeTab === 'editRequests' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-50"><Edit2 className="text-amber-500" size={20} /></div>
                            Profile Edit Requests
                            {editRequests.length > 0 && (
                                <span className="text-sm px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-semibold">
                                    {editRequests.length} pending
                                </span>
                            )}
                        </h2>
                        <button onClick={fetchEditRequests} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
                            <Loader2 size={12} className={loadingRequests ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>

                    {loadingRequests ? (
                        <div className="text-center py-10 text-slate-400"><Loader2 className="animate-spin mx-auto" size={28} /></div>
                    ) : editRequests.length === 0 ? (
                        <div className="text-center py-14 bg-slate-50 border border-slate-200 rounded-2xl">
                            <CheckCircle className="mx-auto mb-3" style={{ color: '#48A111' }} size={40} />
                            <p className="text-slate-500 font-medium">No pending edit requests</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {editRequests.map(req => (
                                <div key={req.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    {/* Header row */}
                                    <button
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                        onClick={() => setExpandedReqId(expandedReqId === req.id ? null : req.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-sm border border-amber-100">
                                                {req.member.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-bold">{req.member.fullName}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{req.member.fellowshipNumber}</p>
                                                {req.member.region && (
                                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={9} /> {req.member.region.name}</p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 ml-2">
                                                {req.changes.map((c, i) => (
                                                    <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium capitalize">
                                                        {c.field.replace(/([A-Z])/g, ' $1')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400 shrink-0">
                                            <span className="text-xs">{new Date(req.createdAt).toLocaleDateString()}</span>
                                            {expandedReqId === req.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </button>

                                    {/* Expanded body */}
                                    {expandedReqId === req.id && (
                                        <div className="px-5 pb-5 pt-4 border-t border-slate-100 bg-slate-50 space-y-4">
                                            {/* Changes diff */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Changes Requested</p>
                                                {req.changes.map((c, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm">
                                                        <span className="font-semibold text-slate-700 capitalize w-32 shrink-0">{c.field.replace(/([A-Z])/g, ' $1')}</span>
                                                        <span className="text-slate-400 line-through truncate max-w-[150px]">{c.oldValue || '—'}</span>
                                                        <span className="font-bold shrink-0" style={{ color: '#48A111' }}>→ {c.newValue}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Reason */}
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                                <p className="text-xs font-bold text-amber-600 mb-1.5 uppercase tracking-wider">Member's Reason</p>
                                                <p className="text-sm text-amber-900 leading-relaxed font-medium">{req.reason}</p>
                                            </div>

                                            {/* Review note */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Review Note (optional)</label>
                                                <textarea
                                                    value={reviewNote}
                                                    onChange={e => setReviewNote(e.target.value)}
                                                    placeholder="Leave a note for the member…"
                                                    rows={2}
                                                    maxLength={500}
                                                    className="input resize-none"
                                                />
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleReview(req.id, 'APPROVED')}
                                                    disabled={reviewingId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all disabled:opacity-60"
                                                    style={{ backgroundColor: '#48A111' }}
                                                >
                                                    <CheckCircle size={16} />
                                                    {reviewingId === req.id ? 'Processing…' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => handleReview(req.id, 'REJECTED')}
                                                    disabled={reviewingId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 text-sm font-bold transition-all disabled:opacity-60"
                                                >
                                                    <XCircle size={16} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {editTarget && (
                <EditMemberModal
                    member={editTarget}
                    regions={regions} colleges={colleges} courses={courses} residences={residences}
                    onClose={() => setEditTarget(null)}
                    onSaved={(updated) => {
                        setMembers(ms => ms.map(m => m.id === editTarget.id ? { ...m, ...updated } : m));
                        setEditTarget(null);
                    }}
                />
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
