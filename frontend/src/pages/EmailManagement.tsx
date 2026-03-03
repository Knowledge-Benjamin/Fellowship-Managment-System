import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    Mail, Send, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw,
    Trash2, Eye, X, ChevronLeft, ChevronRight, Settings, Inbox,
    LayoutTemplate, Search, Filter, Users, MapPin, Tag, Link, Plus, Loader2,
    Info, ExternalLink
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type Tab = 'queue' | 'compose' | 'templates' | 'settings';

interface QueueEmail {
    id: string;
    email: string;
    subject: string;
    status: EmailStatus;
    attempts: number;
    lastAttempt: string | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
}

interface EmailPreview extends QueueEmail {
    html: string;
    text: string;
}

interface Stats { pending: number; processing: number; completed: number; failed: number; total: number; }
interface Region { id: string; name: string; }
interface TagOption { id: string; name: string; color: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EmailStatus, { label: string; icon: any; cls: string }> = {
    PENDING: { label: 'Pending', icon: Clock, cls: 'bg-amber-50 text-amber-600 border-amber-200' },
    PROCESSING: { label: 'Processing', icon: RefreshCw, cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    COMPLETED: { label: 'Sent', icon: CheckCircle, cls: 'bg-[#e9f5e1] text-[#48A111] border-[#c3e6a4]' },
    FAILED: { label: 'Failed', icon: XCircle, cls: 'bg-red-50 text-red-600 border-red-200' },
};

function StatusBadge({ status }: { status: EmailStatus }) {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

function fmt(d: string) { return new Date(d).toLocaleString(); }

// ─── Main Page ────────────────────────────────────────────────────────────────

const EmailManagement = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<Tab>('queue');

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'queue', label: 'Queue & History', icon: Inbox },
        { id: 'compose', label: 'Compose', icon: Send },
        { id: 'templates', label: 'Templates', icon: LayoutTemplate },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Email Management</h1>
                <p className="text-slate-500 mt-1 text-sm">Manage outbound emails, templates, and delivery settings</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
                {tabs.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold flex-1 justify-center transition-all
                                ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon size={15} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {tab === 'queue' && <QueueTab showToast={showToast} />}
            {tab === 'compose' && <ComposeTab showToast={showToast} />}
            {tab === 'templates' && <TemplatesTab />}
            {tab === 'settings' && <SettingsTab showToast={showToast} />}
        </div>
    );
};

// ─── Queue Tab ────────────────────────────────────────────────────────────────

function QueueTab({ showToast }: { showToast: Function }) {
    const [emails, setEmails] = useState<QueueEmail[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [preview, setPreview] = useState<EmailPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const fetchData = async (p = page) => {
        setLoading(true);
        try {
            const [qRes, sRes] = await Promise.all([
                api.get('/emails/queue', { params: { status: statusFilter, search: search || undefined, page: p, limit: 20 } }),
                api.get('/emails/stats'),
            ]);
            setEmails(qRes.data.data);
            setMeta(qRes.data.meta);
            setStats(sRes.data);
        } catch { showToast('error', 'Failed to load email queue'); }
        finally { setLoading(false); }
    };

    useEffect(() => { setPage(1); fetchData(1); }, [statusFilter, search]);
    useEffect(() => { fetchData(); }, [page]);

    const handleRetry = async (id: string) => {
        try {
            await api.post(`/emails/queue/${id}/retry`);
            showToast('success', 'Email queued for retry');
            fetchData();
        } catch (e: any) { showToast('error', e.response?.data?.error || 'Failed to retry'); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Remove this email from the queue?')) return;
        try {
            await api.delete(`/emails/queue/${id}`);
            showToast('success', 'Email removed');
            fetchData();
        } catch (e: any) { showToast('error', e.response?.data?.error || 'Failed to delete'); }
    };

    const openPreview = async (id: string) => {
        setPreviewLoading(true);
        setPreview(null);
        try {
            const res = await api.get(`/emails/queue/${id}/preview`);
            setPreview(res.data);
        } catch { showToast('error', 'Failed to load preview'); }
        finally { setPreviewLoading(false); }
    };

    const statCards = stats ? [
        { label: 'Pending', value: stats.pending, cls: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
        { label: 'Processing', value: stats.processing, cls: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
        { label: 'Sent', value: stats.completed, cls: 'text-[#48A111]', bg: 'bg-[#e9f5e1]', icon: CheckCircle },
        { label: 'Failed', value: stats.failed, cls: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
    ] : [];

    return (
        <div>
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {statCards.map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-100`}>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                                    <Icon size={16} className={s.cls} />
                                </div>
                                <p className={`text-3xl font-bold mt-1 ${s.cls}`}>{s.value}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input placeholder="Search by recipient or subject…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="input pl-10 transition-smooth w-full" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                                ${statusFilter === s ? 'text-white border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            style={statusFilter === s ? { backgroundColor: '#48A111' } : {}}>
                            {s === 'ALL' ? 'All' : STATUS_CONFIG[s as EmailStatus].label}
                        </button>
                    ))}
                </div>
                <button onClick={() => fetchData()}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all">
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* Table */}
            {loading ? <LoadingSpinner message="Loading email queue…" /> : (
                <>
                    {emails.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <Mail size={32} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No emails found</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipient</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Queued</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Last Attempt</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {emails.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800 text-sm">{e.email}</p>
                                                    {e.error && (
                                                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title={e.error}>{e.error}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{e.subject}</td>
                                                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                                                <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell whitespace-nowrap">{fmt(e.createdAt)}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell whitespace-nowrap">
                                                    {e.lastAttempt ? fmt(e.lastAttempt) : '—'}
                                                    {e.attempts > 0 && <span className="ml-1 text-slate-400">({e.attempts} tries)</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <button onClick={() => openPreview(e.id)}
                                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all" title="Preview">
                                                            <Eye size={14} />
                                                        </button>
                                                        {e.status === 'FAILED' && (
                                                            <button onClick={() => handleRetry(e.id)}
                                                                className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-[#48A111] transition-all" title="Retry">
                                                                <RefreshCw size={14} />
                                                            </button>
                                                        )}
                                                        {(e.status === 'COMPLETED' || e.status === 'FAILED') && (
                                                            <button onClick={() => handleDelete(e.id)}
                                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Delete">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {meta.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                                    <p className="text-xs text-slate-500">{meta.total} total</p>
                                    <div className="flex items-center gap-2">
                                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white transition-all">
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="text-xs font-medium text-slate-600">{page} / {meta.totalPages}</span>
                                        <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}
                                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white transition-all">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Preview Modal */}
            {(preview || previewLoading) && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">{preview?.subject || '…'}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{preview?.email}</p>
                            </div>
                            <button onClick={() => setPreview(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {previewLoading ? (
                                <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
                            ) : preview ? (
                                <iframe
                                    srcDoc={preview.html}
                                    className="w-full rounded-xl border border-slate-200"
                                    style={{ height: '480px' }}
                                    title="Email preview"
                                    sandbox="allow-same-origin"
                                />
                            ) : null}
                        </div>
                        {preview && (
                            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                                <StatusBadge status={preview.status} />
                                <p className="text-xs text-slate-400">Queued {fmt(preview.createdAt)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Compose Tab ──────────────────────────────────────────────────────────────

function ComposeTab({ showToast }: { showToast: Function }) {
    const [toMode, setToMode] = useState<'all' | 'region' | 'tag' | 'email'>('email');
    const [targetEmail, setTargetEmail] = useState('');
    const [regionId, setRegionId] = useState('');
    const [tagId, setTagId] = useState('');
    const [subject, setSubject] = useState('');
    const [html, setHtml] = useState('');
    const [text, setText] = useState('');
    const [ctaLabel, setCtaLabel] = useState('');
    const [ctaUrl, setCtaUrl] = useState('');
    const [sending, setSending] = useState(false);
    const [regions, setRegions] = useState<Region[]>([]);
    const [tags, setTags] = useState<TagOption[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        api.get('/emails/recipients').then(r => {
            setRegions(r.data.regions);
            setTags(r.data.tags);
        }).catch(() => { });
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            const payload: any = { subject, html, text: text || subject, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined };
            if (toMode === 'email') payload.targetEmail = targetEmail;
            else if (toMode === 'region') payload.regionId = regionId;
            else if (toMode === 'tag') payload.tagId = tagId;
            else payload.sendToAll = true;

            const res = await api.post('/emails/compose', payload);
            showToast('success', res.data.message);
            setSubject(''); setHtml(''); setText(''); setCtaLabel(''); setCtaUrl(''); setTargetEmail('');
        } catch (err: any) {
            showToast('error', err.response?.data?.error || 'Failed to send');
        } finally { setSending(false); }
    };

    const previewHtml = () => {
        let out = html;
        if (ctaLabel && ctaUrl) {
            out += `<div style="text-align:center;margin:28px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#48A111;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;">${ctaLabel}</a></div>`;
        }
        return out;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#e9f5e1]"><Send size={18} className="text-[#48A111]" /></div>
                    <h2 className="text-base font-bold text-slate-900">Compose Email</h2>
                </div>
                <button onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <Eye size={13} /> {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
            </div>

            <div className="p-6">
                <form onSubmit={handleSend} className="space-y-5">
                    {/* To */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recipients</label>
                        <div className="flex gap-2 flex-wrap mb-3">
                            {([
                                { id: 'email', label: 'Specific Email', icon: Mail },
                                { id: 'region', label: 'By Region', icon: MapPin },
                                { id: 'tag', label: 'By Tag', icon: Tag },
                                { id: 'all', label: 'All Members', icon: Users },
                            ] as const).map(m => (
                                <button key={m.id} type="button" onClick={() => setToMode(m.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                        ${toMode === m.id ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    style={toMode === m.id ? { backgroundColor: '#48A111' } : {}}>
                                    <m.icon size={12} /> {m.label}
                                </button>
                            ))}
                        </div>
                        {toMode === 'email' && (
                            <input type="email" required value={targetEmail} onChange={e => setTargetEmail(e.target.value)}
                                placeholder="member@example.com" className="input transition-smooth w-full" />
                        )}
                        {toMode === 'region' && (
                            <select required value={regionId} onChange={e => setRegionId(e.target.value)} className="input transition-smooth w-full">
                                <option value="">Select a region…</option>
                                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        )}
                        {toMode === 'tag' && (
                            <select required value={tagId} onChange={e => setTagId(e.target.value)} className="input transition-smooth w-full">
                                <option value="">Select a tag…</option>
                                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        )}
                        {toMode === 'all' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                This will send to <strong>all active members</strong>. Make sure the content is appropriate for a mass send.
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Subject</label>
                        <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                            placeholder="Email subject…" className="input transition-smooth w-full" />
                    </div>

                    {/* HTML Body */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Body (HTML)</label>
                        <textarea required value={html} onChange={e => setHtml(e.target.value)} rows={10}
                            placeholder="<p>Write your email content here…</p>"
                            className="input transition-smooth w-full font-mono text-xs resize-y" />
                    </div>

                    {/* Optional plain text */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Plain Text <span className="font-normal normal-case">(optional — improves deliverability)</span>
                        </label>
                        <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
                            placeholder="Plain text version of your email…"
                            className="input transition-smooth w-full text-xs resize-y" />
                    </div>

                    {/* CTA Button */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5"><Link size={13} /> Add CTA Button (optional)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Button Label</label>
                                <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)}
                                    placeholder="e.g. Register Now" className="input transition-smooth w-full text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Button URL</label>
                                <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
                                    placeholder="https://…" className="input transition-smooth w-full text-sm" />
                            </div>
                        </div>
                        {ctaLabel && ctaUrl && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-center">
                                <span className="inline-block px-5 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: '#48A111' }}>
                                    {ctaLabel}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">{ctaUrl}</p>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {showPreview && html && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Preview</label>
                            <iframe srcDoc={previewHtml()} className="w-full rounded-xl border border-slate-200"
                                style={{ height: '360px' }} title="compose preview" sandbox="allow-same-origin" />
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={sending}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={e => { if (!sending) e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#48A111'; }}>
                            {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send Email</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
    const templates = [
        {
            name: '🎉 Welcome Email',
            trigger: 'Sent when a new member is approved (self-reg or internal)',
            features: ['Fellowship number + default password', 'Personal QR code', 'Login to Account button (links to Frontend URL in Settings)'],
            editable: false,
        },
        {
            name: '✅ Registration Confirmation',
            trigger: 'Sent to self-registrants to confirm their submission is received and under review',
            features: ['Member name', 'Submission confirmation', 'What happens next guidance'],
            editable: false,
        },
        {
            name: '❌ Registration Rejection',
            trigger: 'Sent when a pending member is rejected',
            features: ['Rejection notice', 'Contact info for follow-up'],
            editable: false,
        },
        {
            name: '🔒 OTP Verification',
            trigger: 'Sent to privileged accounts (FM, Region Heads, etc.) during login',
            features: ['6-digit one-time code', 'Expires in 5 minutes'],
            editable: false,
        },
        {
            name: '🚨 Account Locked',
            trigger: 'Sent after 5 consecutive failed login attempts',
            features: ['Lock reason', 'Unlock time', 'Security advice'],
            editable: false,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-700">
                <Info size={16} className="mt-0.5 shrink-0" />
                <div>
                    <strong>System templates</strong> are managed in code. Their structure, branding, and content are consistent across all system emails.
                    To customise the <em>from name</em>, <em>reply-to</em>, or the <em>login button URL</em> in the welcome email, go to the <strong>Settings</strong> tab.
                    For one-off custom emails, use the <strong>Compose</strong> tab.
                </div>
            </div>

            {templates.map(t => (
                <div key={t.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-slate-900 text-sm">{t.name}</h3>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">System Template</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{t.trigger}</p>
                    <div className="space-y-1">
                        {t.features.map(f => (
                            <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                                <CheckCircle size={12} className="text-[#48A111] shrink-0" />
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ showToast }: { showToast: Function }) {
    const [settings, setSettings] = useState({ fromName: '', replyTo: '', frontendUrl: '', sendgridConfigured: false, sendgridFrom: null as string | null, gmailUser: null as string | null });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/emails/settings').then(r => setSettings(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/emails/settings', { fromName: settings.fromName, replyTo: settings.replyTo, frontendUrl: settings.frontendUrl });
            showToast('success', 'Settings updated');
        } catch { showToast('error', 'Failed to save settings'); }
        finally { setSaving(false); }
    };

    if (loading) return <LoadingSpinner message="Loading settings…" />;

    return (
        <div className="max-w-2xl space-y-6">
            {/* Provider status */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-4">Email Provider Status</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">SendGrid (Primary)</p>
                            <p className="text-xs text-slate-500">{settings.sendgridFrom || 'No from address configured'}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${settings.sendgridConfigured ? 'bg-[#e9f5e1] text-[#48A111]' : 'bg-red-50 text-red-600'}`}>
                            {settings.sendgridConfigured ? '✓ Configured' : '✗ Not configured'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Gmail SMTP (Fallback)</p>
                            <p className="text-xs text-slate-500">{settings.gmailUser || 'Not configured'}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${settings.gmailUser ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                            {settings.gmailUser ? 'Fallback' : 'Not configured'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Editable settings */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-[#e9f5e1]"><Settings size={18} className="text-[#48A111]" /></div>
                    <h3 className="font-bold text-slate-900 text-sm">Runtime Settings</h3>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">From Name</label>
                        <input value={settings.fromName} onChange={e => setSettings(s => ({ ...s, fromName: e.target.value }))}
                            placeholder="Manifest Fellowship" className="input transition-smooth w-full" />
                        <p className="text-xs text-slate-400 mt-1">Displayed as the sender name in email clients</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reply-To Email</label>
                        <input type="email" value={settings.replyTo} onChange={e => setSettings(s => ({ ...s, replyTo: e.target.value }))}
                            placeholder="contact@manifestfellowship.org" className="input transition-smooth w-full" />
                        <p className="text-xs text-slate-400 mt-1">Where replies from members will land. Also used in List-Unsubscribe header</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Frontend URL</label>
                        <input value={settings.frontendUrl} onChange={e => setSettings(s => ({ ...s, frontendUrl: e.target.value }))}
                            placeholder="https://fm.manifestfellowship.org" className="input transition-smooth w-full" />
                        <p className="text-xs text-slate-400 mt-1">Used in the "Login to Account" button in welcome emails. Set to your deployed frontend URL</p>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <p className="text-xs text-slate-400">⚠ Settings reset on server restart — set defaults in <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> via <code className="bg-slate-100 px-1 py-0.5 rounded">EMAIL_FROM_NAME</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">EMAIL_REPLY_TO</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">FRONTEND_URL</code></p>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                            style={{ backgroundColor: '#48A111' }}
                            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#48A111'; }}>
                            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Deliverability checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-4">📬 Deliverability Checklist</h3>
                <p className="text-xs text-slate-500 mb-4">Complete these DNS/domain steps to maximise inbox placement. These are configured outside the app.</p>
                {[
                    {
                        done: settings.sendgridConfigured,
                        title: 'SendGrid API key configured',
                        detail: 'Set SENDGRID_API_KEY in your .env file',
                    },
                    {
                        done: !!settings.sendgridFrom && !settings.sendgridFrom.includes('gmail.com'),
                        title: 'Domain-based from address',
                        detail: 'SENDGRID_FROM_EMAIL should use your own domain (e.g. noreply@yourchurch.org), not gmail.com',
                    },
                    {
                        done: false,
                        title: 'SendGrid domain authentication (DKIM + SPF)',
                        detail: 'Go to SendGrid → Settings → Sender Authentication → Authenticate Your Domain. This is the single most impactful deliverability step.',
                        link: 'https://app.sendgrid.com/settings/sender_auth',
                    },
                    {
                        done: false,
                        title: 'DMARC DNS record',
                        detail: 'Add a TXT record: _dmarc.yourdomain.com → v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
                    },
                ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl mb-2 ${item.done ? 'bg-[#f0fae8]' : 'bg-slate-50'}`}>
                        <span className={`mt-0.5 shrink-0 text-sm ${item.done ? 'text-[#48A111]' : 'text-slate-400'}`}>
                            {item.done ? '✓' : '○'}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${item.done ? 'text-[#48A111]' : 'text-slate-700'}`}>{item.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                            {item.link && (
                                <a href={item.link} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                                    Open SendGrid <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EmailManagement;
