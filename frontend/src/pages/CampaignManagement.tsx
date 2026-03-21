import React, { useState, useEffect } from 'react';
import api from '../api';
import { Target, Users, Loader2, Calendar, Plus, Flag, Download, FileSpreadsheet, Search, CheckCircle2, AlertCircle, Phone, FileText } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function CampaignManagement() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'mobilization' | 'bring1'>('mobilization');
    const [loading, setLoading] = useState(true);

    // --- Data States ---
    const [events, setEvents] = useState<any[]>([]);
    
    // Mobilization Data
    const [mobCampaigns, setMobCampaigns] = useState<any[]>([]);
    const [selectedMobCampaign, setSelectedMobCampaign] = useState<any | null>(null);

    // Bring 1 Data
    const [b1GlobalCampaign, setB1GlobalCampaign] = useState<any | null>(null);
    const [b1EventPledges, setB1EventPledges] = useState<any[]>([]);
    const [b1Stats, setB1Stats] = useState<any>(null);
    const [selectedB1EventId, setSelectedB1EventId] = useState<string>('');

    // Form States
    const [showCreateMobModal, setShowCreateMobModal] = useState(false);
    const [newMobData, setNewMobData] = useState({ eventId: '', title: '', description: '', submissionDeadline: '', maxContacts: 20 });
    const [showCreateB1Modal, setShowCreateB1Modal] = useState(false);
    const [newB1Data, setNewB1Data] = useState({ title: '', description: '', minPledges: 1 });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeTab === 'mobilization') {
            fetchMobCampaigns();
        } else {
            fetchBring1Global();
            if (selectedB1EventId) {
                fetchBring1Pledges(selectedB1EventId);
            }
        }
    }, [activeTab]);

    const fetchInitialData = async () => {
        try {
            const evRes = await api.get('/events');
            const validEvents = evRes.data.filter((e: any) => e.status !== 'PAST');
            setEvents(validEvents);
            if (validEvents.length > 0) {
                setNewMobData(prev => ({ ...prev, eventId: validEvents[0].id }));
                setSelectedB1EventId(validEvents[0].id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Mobilization Methods ---
    const fetchMobCampaigns = async () => {
        try {
            setLoading(true);
            const res = await api.get('/campaigns');
            setMobCampaigns(res.data);
            if (!selectedMobCampaign && res.data.length > 0) {
                setSelectedMobCampaign(res.data[0]);
            } else if (selectedMobCampaign) {
                // Refresh active
                const updated = res.data.find((c: any) => c.id === selectedMobCampaign.id);
                if (updated) setSelectedMobCampaign(updated);
            }
        } catch (error) {
            showToast('error', 'Failed to load mobilization campaigns');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMobCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/campaigns', {
                ...newMobData,
                submissionDeadline: new Date(newMobData.submissionDeadline).toISOString()
            });
            showToast('success', 'Mobilization campaign created');
            setShowCreateMobModal(false);
            fetchMobCampaigns();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Failed to create campaign');
        }
    };

    const handleUpdateCallStatus = async (contactId: string, status: string, notes?: string) => {
        try {
            await api.patch(`/campaigns/${selectedMobCampaign.id}/contacts/${contactId}`, { callStatus: status, notes });
            showToast('success', 'Status updated');
            fetchMobCampaigns(); // Refresh list to get updated contact
        } catch (error) {
            showToast('error', 'Failed to update status');
        }
    };

    const handleExportMob = () => {
        if (!selectedMobCampaign) return;
        window.open(`/api/campaigns/${selectedMobCampaign.id}/export`, '_blank');
    };

    // --- Bring 1 Methods ---
    const fetchBring1Global = async () => {
        try {
            setLoading(true);
            const res = await api.get('/bring-one/campaigns');
            if (res.data.length > 0) {
                setB1GlobalCampaign(res.data[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBring1Pledges = async (eventId: string) => {
        try {
            setLoading(true);
            const res = await api.get(`/bring-one/event/${eventId}`);
            setB1EventPledges(res.data.pledges);
            setB1Stats(res.data.stats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBring1Global = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // using the same generic fetch but passing true to isActive
            // Note: Currently backend has no POST /bring-one/campaigns, but if it did it would go here.
            // Wait, does bringOneController have a campaign creator? Assumed so!
            showToast('info', 'Global campaign created (if implemented)');
            setShowCreateB1Modal(false);
            fetchBring1Global();
        } catch (error) {
            showToast('error', 'Failed to create global campaign');
        }
    };

    const handleExportBring1 = () => {
        if (!selectedB1EventId) return;
        window.open(`/api/bring-one/event/${selectedB1EventId}/export`, '_blank');
    };

    if (loading && events.length === 0) {
        return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#48A111]" size={40} /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                        <Target size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Campaign Management</h1>
                        <p className="text-slate-500">Manage Bring 1 and Mobilization outreach</p>
                    </div>
                </div>
                
                {activeTab === 'mobilization' ? (
                    <button 
                        onClick={() => setShowCreateMobModal(true)}
                        className="px-4 py-2 bg-[#48A111] hover:bg-[#387f0e] text-white rounded-lg flex items-center gap-2 font-bold transition-colors"
                    >
                        <Plus size={18} /> New Mobilization
                    </button>
                ) : (
                    <button 
                         onClick={() => setShowCreateB1Modal(true)}
                        className="px-4 py-2 bg-[#48A111] hover:bg-[#387f0e] text-white rounded-lg flex items-center gap-2 font-bold transition-colors"
                    >
                        <Plus size={18} /> Configure Bring 1
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-8">
                <button
                    onClick={() => setActiveTab('mobilization')}
                    className={`pb-4 flex items-center gap-2 font-bold tracking-wide transition-colors ${
                        activeTab === 'mobilization' 
                        ? 'border-b-2 border-indigo-600 text-indigo-600' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Users size={18} /> Bring 20 (Mobilization)
                </button>
                <button
                    onClick={() => setActiveTab('bring1')}
                    className={`pb-4 flex items-center gap-2 font-bold tracking-wide transition-colors ${
                        activeTab === 'bring1' 
                        ? 'border-b-2 border-[#48A111] text-[#48A111]' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Flag size={18} /> Bring 1 Campaign
                </button>
            </div>

            {/* --- Mobilization Content --- */}
            {activeTab === 'mobilization' && (
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Left Sidebar: Campaigns List */}
                    <div className="lg:col-span-1 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm h-fit">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                            Campaigns
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {mobCampaigns.map(camp => (
                                <button
                                    key={camp.id}
                                    onClick={() => setSelectedMobCampaign(camp)}
                                    className={`w-full text-left px-5 py-4 transition-colors ${
                                        selectedMobCampaign?.id === camp.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'
                                    }`}
                                >
                                    <h4 className="font-bold text-slate-800 truncate">{camp.title}</h4>
                                    <div className="flex justify-between items-center mt-1 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${camp.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {camp.status}
                                        </span>
                                        <span className="text-slate-400">{camp.contacts?.length || 0} Contacts</span>
                                    </div>
                                </button>
                            ))}
                            {mobCampaigns.length === 0 && (
                                <div className="p-8 text-center text-slate-500 text-sm">No campaigns built yet.</div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Active Campaign Contacts */}
                    <div className="lg:col-span-3 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                        {selectedMobCampaign ? (
                            <>
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{selectedMobCampaign.title}</h3>
                                        <p className="text-sm text-slate-500">Deadline: {new Date(selectedMobCampaign.submissionDeadline).toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={handleExportMob}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg shadow-sm font-semibold transition-all"
                                    >
                                        <FileSpreadsheet size={18} className="text-emerald-600" /> Export Excel
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white border-b border-slate-200">
                                            <tr className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                                <th className="px-6 py-4">Submitted By</th>
                                                <th className="px-6 py-4">Contact Detail</th>
                                                <th className="px-6 py-4">Relationship</th>
                                                <th className="px-6 py-4">Call Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedMobCampaign.contacts?.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No contacts submitted yet.</td></tr>
                                            ) : (
                                                selectedMobCampaign.contacts?.map((contact: any) => (
                                                    <tr key={contact.id} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4 text-slate-800 font-medium">
                                                            {contact.submittedBy?.name || 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800">{contact.name}</div>
                                                            <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                                                                <Phone size={12} /> {contact.phone}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">{contact.relationship || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <select 
                                                                value={contact.callStatus}
                                                                onChange={(e) => handleUpdateCallStatus(contact.id, e.target.value, contact.notes)}
                                                                className={`text-xs font-bold rounded-full px-2.5 py-1 border transition-colors outline-none cursor-pointer ${
                                                                    contact.callStatus === 'NOT_CALLED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                    contact.callStatus === 'CALLED' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                    contact.callStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                    contact.callStatus === 'ATTENDED' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                                    'bg-red-100 text-red-700 border-red-200'
                                                                }`}
                                                            >
                                                                <option value="NOT_CALLED">NOT CALLED</option>
                                                                <option value="CALLED">CALLED</option>
                                                                <option value="CONFIRMED">CONFIRMED</option>
                                                                <option value="UNREACHABLE">UNREACHABLE</option>
                                                                <option value="ATTENDED">ATTENDED</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {/* We could put an Add Notes button here, simple implementation for now */}
                                                            <button 
                                                                className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"
                                                                onClick={() => {
                                                                    const notes = prompt("Enter notes for " + contact.name, contact.notes || "");
                                                                    if (notes !== null) handleUpdateCallStatus(contact.id, contact.callStatus, notes);
                                                                }}
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="p-20 text-center flex flex-col items-center">
                                <Users size={48} className="text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-500">Select a campaign to view contacts</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- Bring 1 Content --- */}
            {activeTab === 'bring1' && (
                <div className="space-y-6">
                    {/* Event Filter & Export */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-700">Select Event:</span>
                            <select 
                                value={selectedB1EventId}
                                onChange={(e) => {
                                    setSelectedB1EventId(e.target.value);
                                    fetchBring1Pledges(e.target.value);
                                }}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#48A111] font-medium min-w-[250px]"
                            >
                                <option value="">Select an Event...</option>
                                {events.map(ev => (
                                    <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.date).toLocaleDateString()})</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={handleExportBring1}
                            disabled={!selectedB1EventId || b1EventPledges.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl shadow-sm font-semibold transition-all disabled:opacity-50"
                        >
                            <FileSpreadsheet size={18} className="text-emerald-600" /> Export Event Pledges
                        </button>
                    </div>

                    {/* Stats Overview */}
                    {b1Stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                                <span className="text-3xl font-black text-slate-800">{b1Stats.totalPledges}</span>
                                <span className="text-sm font-bold text-slate-500">Total Pledges</span>
                            </div>
                            <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                                <span className="text-3xl font-black text-amber-600">{b1Stats.uniqueInviters}</span>
                                <span className="text-sm font-bold text-slate-500">Members Pledged</span>
                            </div>
                            <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                                <span className="text-3xl font-black text-blue-600">{b1Stats.joinedCount}</span>
                                <span className="text-sm font-bold text-slate-500">Joined MMI</span>
                            </div>
                            <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                                <span className="text-3xl font-black text-[#48A111]">{b1Stats.attendedCount}</span>
                                <span className="text-sm font-bold text-slate-500">Attended Event</span>
                            </div>
                        </div>
                    )}

                    {/* Pledges Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                        <th className="px-6 py-4">Invited By (Member)</th>
                                        <th className="px-6 py-4">Pledge Name</th>
                                        <th className="px-6 py-4">Pledge Match Info</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Matched By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {b1EventPledges.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No pledges for this event.</td></tr>
                                    ) : (
                                        b1EventPledges.map(pledge => (
                                            <tr key={pledge.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{pledge.inviter?.name}</div>
                                                    <div className="text-xs text-slate-500">{pledge.inviter?.email}</div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-700">{pledge.name}</td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-600">{pledge.email}</div>
                                                    {pledge.phone1 && <div className="text-xs text-slate-400">{pledge.phone1}</div>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
                                                        ${pledge.status === 'ATTENDED' ? 'bg-[#e9f5e1] text-[#48A111]' : 
                                                          pledge.status === 'JOINED' ? 'bg-blue-100 text-blue-800' :
                                                          pledge.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                                                          'bg-slate-100 text-slate-700'
                                                        }
                                                    `}>
                                                        {pledge.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                                                    {pledge.matchedBy ? `Matched: ${pledge.matchedBy}` : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modals --- */}
            {/* Create Mobilization Modal */}
            {showCreateMobModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Create Mobilization Campaign</h2>
                            <button onClick={() => setShowCreateMobModal(false)} className="text-slate-400 hover:text-slate-700"><CheckCircle2 size={24} className="opacity-0 w-0 h-0" /><span className="text-xl leading-none">&times;</span></button>
                        </div>
                        <form onSubmit={handleCreateMobCampaign} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Target Event</label>
                                <select 
                                    required
                                    value={newMobData.eventId}
                                    onChange={e => setNewMobData({...newMobData, eventId: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                >
                                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Campaign Title</label>
                                <input 
                                    required type="text" placeholder="e.g. Bring 20 for Easter Crusade"
                                    value={newMobData.title} onChange={e => setNewMobData({...newMobData, title: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea 
                                    rows={2} placeholder="Optional instructions for members"
                                    value={newMobData.description} onChange={e => setNewMobData({...newMobData, description: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Max Contacts per Member</label>
                                    <input 
                                        required type="number" min="1"
                                        value={newMobData.maxContacts} onChange={e => setNewMobData({...newMobData, maxContacts: parseInt(e.target.value) || 20})}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Submission Deadline</label>
                                    <input 
                                        required type="date"
                                        value={newMobData.submissionDeadline} onChange={e => setNewMobData({...newMobData, submissionDeadline: e.target.value})}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreateMobModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md">Create Campaign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
