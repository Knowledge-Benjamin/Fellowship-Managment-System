import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import {
    CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2,
    MapPin, AlertTriangle,
    ThumbsUp, ThumbsDown, Building, BookOpen,
    Copy, MessageCircle, Sparkles
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomSelect from '../components/CustomSelect';

interface Region { id: string; name: string; }
interface College { id: string; name: string; }
interface Course { id: string; name: string; }
interface Residence { id: string; name: string; type: string; }

interface PendingMember {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: string;
    registrationMode: string;
    isMakerereStudent: boolean;
    regionId?: string;
    region?: Region;
    collegeId?: string;
    collegeSuggestion?: string;
    courseId?: string;
    courseSuggestion?: string;
    initialYearOfStudy?: number;
    initialSemester?: number;
    residenceId?: string;
    residenceSuggestion?: string;
    hostelName?: string;
    familyId?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    submittedAt: string;
    token: { label?: string; token: string };
}

interface CreatedCredentials {
    fullName: string;
    fellowshipNumber: string;
    defaultPassword?: string;
}

// ── Field badge (resolved vs. suggestion vs. missing) ─────────────────────────
function FieldBadge({ resolved, suggestion, label }: { resolved?: string | null; suggestion?: string | null; label: string }) {
    if (resolved) return <span className="inline-flex items-center gap-1 text-xs text-[#48A111] bg-[#e9f5e1] px-2 py-0.5 rounded-full"><CheckCircle size={10} />{label}: {resolved}</span>;
    if (suggestion) return <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle size={10} />{label}: "{suggestion}" (unresolved)</span>;
    return <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{label}: not provided</span>;
}

// ── Approval modal ────────────────────────────────────────────────────────────
function ApproveModal({
    pending, regions, colleges, courses, residences,
    onApprove, onClose,
}: {
    pending: PendingMember;
    regions: Region[]; colleges: College[]; courses: Course[]; residences: Residence[];
    onApprove: () => void; onClose: () => void;
}) {
    const { showToast } = useToast();
    const [edits, setEdits] = useState({
        regionId: pending.regionId ?? '',
        collegeId: pending.collegeId ?? '',
        courseId: pending.courseId ?? '',
        residenceId: pending.residenceId ?? '',
        familyId: pending.familyId ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ fullName: string; fellowshipNumber: string; defaultPassword?: string; email?: string } | null>(null);

    const handleApprove = async () => {
        if (!edits.regionId) { showToast('error', 'Region must be assigned before approving'); return; }
        try {
            setSaving(true);
            await api.patch(`/pending-members/${pending.id}`, {
                regionId: edits.regionId || null,
                collegeId: edits.collegeId || null,
                courseId: edits.courseId || null,
                residenceId: edits.residenceId || null,
                familyId: edits.familyId || null,
            });
            const res = await api.post(`/pending-members/${pending.id}/approve`);
            showToast('success', `${pending.fullName} approved and activated!`);

            if (res.data?.member) {
                setCreatedCredentials(res.data.member);
            } else {
                onApprove();
            }
        } catch (err: any) {
            showToast('error', err.response?.data?.error ?? 'Approval failed');
        } finally {
            setSaving(false);
        }
    };

    // ── Credentials success screen ────────────────────────────────────────────
    if (createdCredentials) {
        const urlObj = new URL(window.location.href);
        const frontendUrl = `${urlObj.protocol}//${urlObj.host}`;
        const whatsappMsg = `Hello ${createdCredentials.fullName},\n\nYour Makerere Manifest Fellowship registration is approved! 🎉\n\nHere are your login credentials:\n📧 Email: *${createdCredentials.email || '(check your inbox)'}*\n🔑 Fellowship ID: *${createdCredentials.fellowshipNumber}*\n🔐 Temporary Password: *${createdCredentials.defaultPassword || createdCredentials.fellowshipNumber}*\n\nPlease log in at ${frontendUrl} and change your password on first login.\n\n_God bless you! — Makerere Manifest Fellowship_`;
        const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden text-center">
                    <div className="bg-[#e9f5e1] py-8 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-[#48A111]">
                            <Sparkles size={32} />
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Member Approved!</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {createdCredentials.fullName} is now registered. A welcome email has been sent. You can also share credentials directly via WhatsApp.
                            </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-3">
                            {createdCredentials.email && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                    <p className="text-sm font-mono text-slate-700">{createdCredentials.email}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Fellowship Number</p>
                                <p className="text-lg font-mono font-bold text-slate-900">{createdCredentials.fellowshipNumber}</p>
                            </div>
                            {createdCredentials.defaultPassword && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Default Password</p>
                                    <p className="text-sm font-mono font-semibold text-slate-700">{createdCredentials.defaultPassword}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20BE5C] text-white font-semibold rounded-xl shadow-lg transition-all"
                            >
                                {/* Official WhatsApp logo */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" fill="white">
                                    <path d="M24 4C12.95 4 4 12.95 4 24c0 3.55.94 6.9 2.59 9.77L4 44l10.52-2.55A19.85 19.85 0 0 0 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4zm0 36c-3.17 0-6.13-.85-8.67-2.33l-.62-.37-6.25 1.52 1.57-5.98-.4-.65A15.93 15.93 0 0 1 8 24c0-8.82 7.18-16 16-16s16 7.18 16 16-7.18 16-16 16zm8.85-11.65c-.48-.24-2.84-1.4-3.28-1.56-.44-.16-.76-.24-1.08.24-.32.48-1.24 1.56-1.52 1.88-.28.32-.56.36-1.04.12-.48-.24-2.03-.75-3.87-2.38-1.43-1.27-2.4-2.84-2.68-3.32-.28-.48-.03-.74.21-.98.22-.22.48-.56.72-.84.24-.28.32-.48.48-.8.16-.32.08-.6-.04-.84-.12-.24-1.08-2.6-1.48-3.56-.4-.96-.8-.84-1.08-.84l-.92-.02c-.32 0-.84.12-1.28.6-.44.48-1.68 1.64-1.68 4s1.72 4.64 1.96 4.96c.24.32 3.38 5.16 8.2 7.24 1.14.48 2.04.76 2.74.98 1.15.36 2.2.3 3.03.18.92-.14 2.84-1.16 3.24-2.28.4-1.12.4-2.08.28-2.28-.12-.2-.44-.32-.92-.56z" />
                                </svg>
                                Send via WhatsApp
                            </a>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(whatsappMsg);
                                    showToast('success', 'Message copied to clipboard');
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                            >
                                <Copy size={18} /> Copy Message
                            </button>
                            <button
                                onClick={() => onApprove()}
                                className="w-full py-3 px-4 text-slate-400 hover:text-slate-600 font-semibold text-sm transition-colors"
                            >
                                Done, close this
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Default approval form ─────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
                    <div>
                        <h2 className="font-bold text-slate-900">Approve Registration</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{pending.fullName} · {pending.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><XCircle size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Region — required */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <MapPin size={11} /> Region <span className="text-red-400">*</span>
                        </label>
                        <CustomSelect value={edits.regionId} onChange={v => setEdits(p => ({ ...p, regionId: v }))} required
                            placeholder="Assign region"
                            options={[{ value: '', label: 'Select region', disabled: true }, ...regions.map(r => ({ value: r.id, label: r.name }))]} />
                        {!edits.regionId && <p className="text-xs text-red-400">Region must be set before approval.</p>}
                    </div>

                    {/* College */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <Building size={11} /> College
                        </label>
                        {pending.collegeSuggestion && !pending.collegeId && (
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                Suggestion: <strong>"{pending.collegeSuggestion}"</strong> — select a match or leave blank to auto-create.
                            </p>
                        )}
                        <CustomSelect value={edits.collegeId} onChange={v => setEdits(p => ({ ...p, collegeId: v }))}
                            placeholder="Match college"
                            options={[{ value: '', label: 'Leave blank (use suggestion or skip)' }, ...colleges.map(c => ({ value: c.id, label: c.name }))]} />
                    </div>

                    {/* Course */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <BookOpen size={11} /> Course
                        </label>
                        {pending.courseSuggestion && !pending.courseId && (
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                Suggestion: <strong>"{pending.courseSuggestion}"</strong> — select a match or leave blank to auto-create.
                            </p>
                        )}
                        <CustomSelect value={edits.courseId} onChange={v => setEdits(p => ({ ...p, courseId: v }))}
                            placeholder="Match course"
                            options={[{ value: '', label: 'Leave blank (use suggestion or skip)' }, ...courses.map(c => ({ value: c.id, label: c.name }))]} />
                    </div>

                    {/* Residence */}
                    {pending.residenceSuggestion && !pending.residenceId && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Residence</label>
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                Suggestion: <strong>"{pending.residenceSuggestion}"</strong>
                            </p>
                            <CustomSelect value={edits.residenceId} onChange={v => setEdits(p => ({ ...p, residenceId: v }))}
                                placeholder="Match residence"
                                options={[{ value: '', label: 'Leave blank (auto-create)' }, ...residences.map(r => ({ value: r.id, label: r.name }))]} />
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button onClick={handleApprove} disabled={saving || !edits.regionId}
                            className="flex-1 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#48A111' }}>
                            {saving ? <><Loader2 size={14} className="animate-spin" /> Approving…</> : <><ThumbsUp size={14} /> Approve</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PendingMembers = () => {
    const { showToast } = useToast();
    const [pending, setPending] = useState<PendingMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [approveTarget, setApproveTarget] = useState<PendingMember | null>(null);

    // Reject state
    const [rejectTarget, setRejectTarget] = useState<PendingMember | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Reference data
    const [regions, setRegions] = useState<Region[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [residences, setResidences] = useState<Residence[]>([]);

    const fetchPending = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/pending-members');
            setPending(res.data);
        } catch {
            showToast('error', 'Failed to load pending registrations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPending();
        Promise.all([
            api.get('/regions').then(r => setRegions(r.data)),
            api.get('/colleges').then(r => setColleges(r.data)),
            api.get('/courses').then(r => setCourses(r.data)),
            api.get('/residences').then(r => setResidences(r.data)),
        ]).catch(() => { });
    }, []);

    const handleReject = async () => {
        if (!rejectTarget) return;
        try {
            setRejecting(true);
            await api.post(`/pending-members/${rejectTarget.id}/reject`, { reviewNote: rejectNote });
            showToast('success', 'Registration rejected');
            setRejectTarget(null); setRejectNote('');
            fetchPending();
        } catch {
            showToast('error', 'Failed to reject');
        } finally {
            setRejecting(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading pending registrations…" />;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pending Registrations</h1>
                    <p className="text-slate-500 mt-1 text-sm">{pending.length} submission{pending.length !== 1 ? 's' : ''} awaiting review</p>
                </div>
                {pending.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold border border-amber-200">
                        <AlertTriangle size={14} /> {pending.length} pending
                    </div>
                )}
            </div>

            {pending.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <CheckCircle size={32} className="text-[#48A111] mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">All caught up!</p>
                    <p className="text-slate-400 text-sm mt-1">No pending registrations to review.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pending.map(p => {
                        const isExpanded = expanded === p.id;
                        const hasUnresolved = (!p.regionId) || (p.collegeSuggestion && !p.collegeId) || (p.courseSuggestion && !p.courseId);
                        return (
                            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Summary row */}
                                <div className="p-5 flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl font-bold text-white flex items-center justify-center shrink-0 text-sm"
                                        style={{ backgroundColor: '#48A111' }}>
                                        {p.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-900">{p.fullName}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.registrationMode === 'READMISSION' ? 'bg-amber-50 text-amber-600' : 'bg-[#e9f5e1] text-[#48A111]'}`}>
                                                {p.registrationMode === 'READMISSION' ? '🔄 Returning' : '🌟 New'}
                                            </span>
                                            {hasUnresolved && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 flex items-center gap-1"><AlertTriangle size={9} /> Needs attention</span>}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-0.5 truncate">{p.email} · {p.gender} · submitted {new Date(p.submittedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => setApproveTarget(p)}
                                            className="px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.03]"
                                            style={{ backgroundColor: '#48A111' }}>
                                            <ThumbsUp size={12} /> Approve
                                        </button>
                                        <button onClick={() => setRejectTarget(p)}
                                            className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-100 transition-all">
                                            <ThumbsDown size={12} /> Reject
                                        </button>
                                        <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            <FieldBadge label="Region" resolved={p.region?.name} />
                                            <FieldBadge label="College" resolved={p.collegeId ? colleges.find(c => c.id === p.collegeId)?.name : undefined} suggestion={p.collegeSuggestion} />
                                            <FieldBadge label="Course" resolved={p.courseId ? courses.find(c => c.id === p.courseId)?.name : undefined} suggestion={p.courseSuggestion} />
                                            {p.initialYearOfStudy && <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Year {p.initialYearOfStudy}, Sem {p.initialSemester}</span>}
                                            {p.hostelName && <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Hostel: {p.hostelName}</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">Phone: {p.phoneNumber} · Token: {p.token?.label ?? p.token?.token?.substring(0, 12) + '…'}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Approve modal */}
            {approveTarget && (
                <ApproveModal
                    pending={approveTarget}
                    regions={regions} colleges={colleges} courses={courses} residences={residences}
                    onApprove={() => { setApproveTarget(null); fetchPending(); }}
                    onClose={() => setApproveTarget(null)}
                />
            )}

            {/* Reject modal */}
            {rejectTarget && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <h2 className="font-bold text-slate-900">Reject Registration</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{rejectTarget.fullName}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason <span className="font-normal normal-case text-slate-400">(optional — will be emailed)</span></label>
                                <textarea rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                                    className="input mt-2 resize-none" placeholder="e.g. Duplicate entry, unverifiable details…" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                                    className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleReject} disabled={rejecting}
                                    className="flex-1 px-5 py-2.5 rounded-xl text-white font-semibold text-sm bg-red-500 hover:bg-red-600 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {rejecting ? <><Loader2 size={14} className="animate-spin" /> Rejecting…</> : <><ThumbsDown size={14} /> Reject</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingMembers;
