import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import { Link2, Plus, Copy, CheckCircle, XCircle, Clock, Users, Loader2, X, Calendar } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface RegToken {
    id: string;
    token: string;
    label?: string;
    expiresAt: string;
    maxUses?: number;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
    url: string;
    pendingCount: number;
}

const RegistrationTokens = () => {
    const { showToast } = useToast();
    const [tokens, setTokens] = useState<RegToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Create form
    const [label, setLabel] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [maxUses, setMaxUses] = useState('');

    const fetchTokens = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reg-tokens');
            setTokens(res.data);
        } catch {
            showToast('error', 'Failed to load registration tokens');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTokens(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expiresAt) { showToast('error', 'Expiry date is required'); return; }
        try {
            setCreating(true);
            await api.post('/reg-tokens', {
                label: label || undefined,
                expiresAt: new Date(expiresAt).toISOString(),
                maxUses: maxUses ? parseInt(maxUses) : undefined,
            });
            showToast('success', 'Registration link created');
            setShowModal(false);
            setLabel(''); setExpiresAt(''); setMaxUses('');
            fetchTokens();
        } catch {
            showToast('error', 'Failed to create token');
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!window.confirm('Deactivate this registration link? Members who already submitted are unaffected.')) return;
        try {
            await api.patch(`/reg-tokens/${id}/revoke`);
            showToast('success', 'Link deactivated');
            fetchTokens();
        } catch {
            showToast('error', 'Failed to revoke link');
        }
    };

    const copyLink = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getStatus = (t: RegToken) => {
        if (!t.isActive) return { label: 'Revoked', color: 'bg-slate-100 text-slate-500' };
        if (new Date(t.expiresAt) < new Date()) return { label: 'Expired', color: 'bg-red-50 text-red-500' };
        if (t.maxUses && t.usedCount >= t.maxUses) return { label: 'Full', color: 'bg-amber-50 text-amber-600' };
        return { label: 'Active', color: 'bg-[#e9f5e1] text-[#48A111]' };
    };

    if (loading) return <LoadingSpinner message="Loading registration links…" />;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Registration Links</h1>
                    <p className="text-slate-500 mt-1 text-sm">Generate and manage self-registration invite links</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    style={{ backgroundColor: '#48A111' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#48A111'; }}>
                    <Plus size={16} /> Generate New Link
                </button>
            </div>

            {/* Token list */}
            {tokens.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <Link2 size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No registration links yet</p>
                    <p className="text-slate-400 text-sm mt-1">Generate a link and share it with members to self-register</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tokens.map(t => {
                        const status = getStatus(t);
                        const isLive = status.label === 'Active';
                        return (
                            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                                            {t.label && <span className="text-sm font-semibold text-slate-800">{t.label}</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono truncate mt-1">{t.url}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Clock size={11} /> Expires {new Date(t.expiresAt).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Users size={11} /> {t.usedCount}{t.maxUses ? `/${t.maxUses}` : ''} uses</span>
                                            {t.pendingCount > 0 && (
                                                <span className="flex items-center gap-1 text-[#48A111] font-semibold">
                                                    <CheckCircle size={11} /> {t.pendingCount} pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => copyLink(t.url, t.id)}
                                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                                            title="Copy link">
                                            {copiedId === t.id
                                                ? <CheckCircle size={16} className="text-[#48A111]" />
                                                : <Copy size={16} />}
                                        </button>
                                        {isLive && (
                                            <button onClick={() => handleRevoke(t.id)}
                                                className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                                                title="Revoke link">
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[#e9f5e1]"><Link2 size={18} className="text-[#48A111]" /></div>
                                <h2 className="text-base font-bold text-slate-900">Generate Registration Link</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                                <X size={17} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Label <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                                <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. March 2026 Intake"
                                    className="input transition-smooth" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Expiry Date <span className="text-red-400 normal-case font-normal">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                                        required className="input pl-10 transition-smooth" min={new Date().toISOString().slice(0, 16)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Uses <span className="font-normal normal-case text-slate-400">(leave blank for unlimited)</span></label>
                                <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="e.g. 200"
                                    min={1} className="input transition-smooth" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating}
                                    className="flex-1 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={e => { if (!creating) e.currentTarget.style.backgroundColor = '#F2B50B'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#48A111'; }}>
                                    {creating ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><Link2 size={15} /> Generate</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationTokens;
