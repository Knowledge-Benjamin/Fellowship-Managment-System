import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Target, UserPlus, Loader2, CheckCircle2, Clock, Plus, Flag, Trash2, Calendar, AlertCircle, Pencil, X, Check } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';

export default function CampaignTab() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [pledges, setPledges] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPledge, setEditingPledge] = useState<{ id: string; name: string; email: string; phone1: string; phone2: string } | null>(null);

    // Form state for new pledges
    const [newPledges, setNewPledges] = useState([{ name: '', email: '', phone1: '', phone2: '' }]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [campRes, pledgeRes, eventsRes] = await Promise.all([
                api.get('/bring-one/campaigns'),
                api.get('/bring-one/my-pledges'),
                api.get('/events')
            ]);
            setCampaigns(campRes.data);
            setPledges(pledgeRes.data);

            const upcomingEvents = eventsRes.data.filter((e: any) => e.status === 'UPCOMING' || e.status === 'ONGOING');
            setEvents(upcomingEvents);
            if (upcomingEvents.length > 0) {
                setSelectedEventId(upcomingEvents[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch campaign data:', error);
            showToast('error', 'Failed to load campaign data');
        } finally {
            setLoading(false);
        }
    };

    const activeCampaign = campaigns.length > 0 ? campaigns[0] : null;

    const handleAddRow = () => {
        setNewPledges([...newPledges, { name: '', email: '', phone1: '', phone2: '' }]);
    };

    const handleRemoveRow = (index: number) => {
        if (newPledges.length === 1) return;
        setNewPledges(newPledges.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: string, value: string) => {
        const updated = [...newPledges];
        updated[index] = { ...updated[index], [field]: value };
        setNewPledges(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCampaign) return;
        if (!selectedEventId) {
            showToast('error', 'Please select a target event');
            return;
        }

        const validPledges = newPledges.filter(p => p.name.trim() && p.email.trim());
        
        if (validPledges.length === 0) {
            showToast('error', 'Please fill out at least one name and email');
            return;
        }

        try {
            setIsSubmitting(true);
            await api.post('/bring-one/pledges', {
                campaignId: activeCampaign.id,
                eventId: selectedEventId,
                pledges: validPledges.map(p => ({
                    ...p,
                    email: p.email.trim().toLowerCase()
                }))
            });
            showToast('success', 'Pledges submitted successfully!');
            setNewPledges([{ name: '', email: '', phone1: '', phone2: '' }]);
            
            // Refresh pledges
            const pledgeRes = await api.get('/bring-one/my-pledges');
            setPledges(pledgeRes.data);
        } catch (error: any) {
            console.error('Submission error:', error);
            showToast('error', error.response?.data?.message || 'Failed to submit pledges');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSavePledgeEdit = async () => {
        if (!editingPledge) return;
        try {
            await api.patch(`/bring-one/pledges/${editingPledge.id}`, {
                name: editingPledge.name,
                email: editingPledge.email,
                phone1: editingPledge.phone1 || null,
                phone2: editingPledge.phone2 || null,
            });
            showToast('success', 'Pledge updated!');
            setEditingPledge(null);
            const pledgeRes = await api.get('/bring-one/my-pledges');
            setPledges(pledgeRes.data);
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Failed to update pledge');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PLEDGED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Pledged</span>;
            case 'PENDING_APPROVAL':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Registered</span>;
            case 'JOINED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Member</span>;
            case 'ATTENDED':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e9f5e1] text-[#48A111]"><CheckCircle2 size={12}/> Attended</span>;
            case 'LAPSED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Lapsed</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-48">
                <Loader2 size={32} className="animate-spin text-[#48A111]" />
            </div>
        );
    }

    return (
        <div className="p-8 animate-fade-in space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Flag className="text-[#48A111]" size={24} /> Bring 1 Campaign
                </h2>
                
                {!activeCampaign ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 shadow-sm border-dashed">
                        <Target className="mx-auto text-slate-400 mb-3" size={32} />
                        <h3 className="text-lg font-bold text-slate-700">No Active Campaigns</h3>
                        <p className="text-slate-500 mt-2">There is currently no active Bring 1 campaign.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Campaign Info */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#e9f5e1] to-white border border-[#c5e3b0] shadow-sm relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-[#48A111] mb-2">{activeCampaign.title}</h3>
                                {activeCampaign.description && (
                                    <p className="text-slate-700 mb-4">{activeCampaign.description}</p>
                                )}
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-[#c5e3b0] text-sm font-semibold text-slate-800 shadow-sm">
                                    <UserPlus size={16} className="text-[#48A111]" />
                                    Minimum Pledges Goal: {activeCampaign.minPledges}
                                </div>
                            </div>
                            <Target size={120} className="absolute -right-10 -bottom-10 text-[#48A111] opacity-5 transform -rotate-12" />
                        </div>

                        {/* Submit Pledges Form */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Plus size={20} className="text-[#48A111]" /> Add New Pledges
                                </h3>
                                {events.length > 0 && (
                                    <div className="flex items-center gap-2 relative">
                                        <Calendar size={16} className="absolute left-3 text-slate-400" />
                                        <select
                                            value={selectedEventId}
                                            onChange={(e) => setSelectedEventId(e.target.value)}
                                            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-700 focus:outline-none focus:border-[#48A111] shadow-sm appearance-none cursor-pointer hover:bg-slate-50"
                                        >
                                            {events.map((event) => (
                                                <option key={event.id} value={event.id}>
                                                    {event.name} ({new Date(event.date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6">
                                {events.length === 0 ? (
                                    <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 flex items-center gap-2 text-sm">
                                        <AlertCircle size={16} />
                                        No upcoming events available for pledging.
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            {newPledges.map((pledge, index) => (
                                                <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs font-bold shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Full Name *" 
                                                            required
                                                            value={pledge.name}
                                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#48A111] bg-white"
                                                        />
                                                        <input 
                                                            type="email" 
                                                            placeholder="Email Address *" 
                                                            required
                                                            value={pledge.email}
                                                            onChange={(e) => handleChange(index, 'email', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#48A111] bg-white"
                                                        />
                                                        <input 
                                                            type="tel" 
                                                            placeholder="Phone 1 (Optional)" 
                                                            value={pledge.phone1}
                                                            onChange={(e) => handleChange(index, 'phone1', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#48A111] bg-white"
                                                        />
                                                        <input 
                                                            type="tel" 
                                                            placeholder="Phone 2 (Optional)" 
                                                            value={pledge.phone2}
                                                            onChange={(e) => handleChange(index, 'phone2', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#48A111] bg-white"
                                                        />
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveRow(index)}
                                                        disabled={newPledges.length === 1}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent shrink-0"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-5 flex justify-between items-center">
                                            <button 
                                                type="button" 
                                                onClick={handleAddRow}
                                                className="flex items-center gap-1.5 text-sm font-semibold text-[#48A111] hover:text-[#387f0e] px-2 py-1"
                                            >
                                                <Plus size={16} /> Add another person
                                            </button>
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className="px-6 py-2.5 bg-[#48A111] text-white font-bold rounded-xl hover:bg-[#387f0e] shadow-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Pledges'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>

                        {/* My Pledges List */}
                        {pledges.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Target size={20} className="text-[#48A111]" /> My Tracked Pledges
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                                <th className="px-6 py-3">Name</th>
                                                <th className="px-6 py-3">Contact Email</th>
                                                <th className="px-6 py-3">Event Target</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Submitted</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {pledges.map((pledge) => (
                                                <React.Fragment key={pledge.id}>
                                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                                            {editingPledge?.id === pledge.id ? (
                                                                <input className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-[#48A111]" value={editingPledge!.name} onChange={e => setEditingPledge({ ...editingPledge!, name: e.target.value })} />
                                                            ) : pledge.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">
                                                            {editingPledge?.id === pledge.id ? (
                                                                <div className="flex flex-col gap-1 min-w-[180px]">
                                                                    <input className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-[#48A111]" placeholder="Email" value={editingPledge!.email} onChange={e => setEditingPledge({ ...editingPledge!, email: e.target.value })} />
                                                                    <input className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-[#48A111]" placeholder="Phone 1" value={editingPledge!.phone1} onChange={e => setEditingPledge({ ...editingPledge!, phone1: e.target.value })} />
                                                                    <input className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-[#48A111]" placeholder="Phone 2" value={editingPledge!.phone2} onChange={e => setEditingPledge({ ...editingPledge!, phone2: e.target.value })} />
                                                                </div>
                                                            ) : pledge.email}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600 font-medium">{pledge.event.name}</td>
                                                        <td className="px-6 py-4">{getStatusBadge(pledge.status)}</td>
                                                        <td className="px-6 py-4 text-slate-400 text-right">{new Date(pledge.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4">
                                                            {editingPledge?.id === pledge.id ? (
                                                                <div className="flex gap-1.5">
                                                                    <button onClick={handleSavePledgeEdit} className="p-1.5 bg-[#48A111] text-white rounded-lg hover:bg-[#3a8a0e] transition-colors" title="Save"><Check size={14} /></button>
                                                                    <button onClick={() => setEditingPledge(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors" title="Cancel"><X size={14} /></button>
                                                                </div>
                                                            ) : pledge.status === 'PLEDGED' && new Date() < new Date(pledge.event.date) ? (
                                                                <button onClick={() => setEditingPledge({ id: pledge.id, name: pledge.name, email: pledge.email, phone1: pledge.phone1 || '', phone2: pledge.phone2 || '' })} className="p-1.5 text-slate-400 hover:text-[#48A111] hover:bg-[#e9f5e1] rounded-lg transition-colors" title="Edit pledge"><Pencil size={14} /></button>
                                                            ) : null}
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
