import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Target, Users, Loader2, Plus, Flag, FileSpreadsheet, CheckCircle2, Phone, FileText, Edit2, Trash2, AlertTriangle, PieChart, MessageCircle } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import ContactChatModal from '../components/Campaigns/ContactChatModal';

export default function CampaignManagement() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'mobilization' | 'bring1'>('mobilization');
    const [loading, setLoading] = useState(true);

    // --- Data States ---
    const [events, setEvents] = useState<Array<Record<string, unknown> & { id: string; name: string; date: string; status?: string }>>([]);
    
    // Mobilization Data
    const [mobCampaigns, setMobCampaigns] = useState<Array<Record<string, unknown> & { id: string; title: string; status: string; _count?: { contacts: number } }>>([]);
    const [selectedMobCampaign, setSelectedMobCampaign] = useState<Record<string, unknown> & { id: string; title: string; submissionDeadline: string; contacts?: Array<Record<string, unknown> & { id: string; name: string; isDuplicate?: boolean; duplicateMatches?: Array<{id: string, name: string}>; phone?: string; email?: string; transportNeed?: string; location?: string; relationship?: string; callStatus?: string; notes?: string; calledBy?: { fullName: string }; submittedBy?: { fullName: string; fellowshipNumber?: string } }> } | null>(null);

    // Bring 1 Data
    const [b1GlobalCampaign, setB1GlobalCampaign] = useState<Record<string, unknown> | null>(null);
    const [b1EventPledges, setB1EventPledges] = useState<Array<Record<string, unknown> & { id: string; name: string; email?: string; phone1?: string; status?: string; matchedBy?: string; inviter?: { fullName: string; fellowshipNumber?: string } }>>([]);
    const [b1Stats, setB1Stats] = useState<{ totalPledges: number; uniqueInviters: number; joinedCount: number; attendedCount: number } | null>(null);
    const [selectedB1EventId, setSelectedB1EventId] = useState<string>('');

    // Pagination States
    const [mobCurrentPage, setMobCurrentPage] = useState(1);
    const [b1CurrentPage, setB1CurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    // Form States
    const [showCreateMobModal, setShowCreateMobModal] = useState(false);
    const [newMobData, setNewMobData] = useState<{ eventId: string; title: string; description: string; submissionDeadline: string; maxContacts: number; manualTarget?: number | null }>({ eventId: '', title: '', description: '', submissionDeadline: '', maxContacts: 20 });
    const [editMobData, setEditMobData] = useState<Record<string, unknown> & { id: string; title: string; description: string; submissionDeadline: string; maxContacts: number; manualTarget?: number | null } | null>(null);

    const [showCreateB1Modal, setShowCreateB1Modal] = useState(false);
    const [newB1Data, setNewB1Data] = useState<{ title: string; description: string; minPledges: number; manualTarget?: number | null }>({ title: '', description: '', minPledges: 1 });
    const [editB1Data, setEditB1Data] = useState<Record<string, unknown> & { id: string; title: string; description: string; minPledges: number; manualTarget?: number | null } | null>(null);

    // Chat State
    const [chatEntity, setChatEntity] = useState<{ id: string; name: string; type: 'BRING_ONE' | 'MOBILIZATION' } | null>(null);

    // Retrieve userId from localStorage auth token or decoded token
    // Actually, we can fetch it once or assume the backend validates it based on the token.
    // The chat modal expects `currentUserId` so we should parse the JWT.
    const getUserIdFromToken = () => {
        const token = localStorage.getItem('token');
        if (!token) return '';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id;
        } catch {
            return '';
        }
    };
    const currentUserId = getUserIdFromToken();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchInitialData = async () => {
        try {
            const evRes = await api.get('/events');
            const validEvents = evRes.data.filter((e: { status: string }) => e.status !== 'PAST');
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
            const res = await api.get('/campaigns?adminView=true');
            setMobCampaigns(res.data);
            if (!selectedMobCampaign && res.data.length > 0) {
                loadMobCampaignDetail(res.data[0].id);
            } else if (selectedMobCampaign) {
                // Reload full detail for currently selected campaign
                loadMobCampaignDetail(selectedMobCampaign.id);
            }
        } catch {
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
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            showToast('error', error.response?.data?.message || 'Failed to create campaign');
        }
    };

    const loadMobCampaignDetail = async (id: string) => {
        try {
            const res = await api.get(`/campaigns/${id}?adminView=true`);
            setSelectedMobCampaign(res.data);
            setMobCurrentPage(1); // Reset pagination on new campaign load
        } catch {
            showToast('error', 'Failed to load campaign detail');
        }
    };

    const jumpToMobContact = (contactId: string) => {
        if (!selectedMobCampaign || !selectedMobCampaign.contacts) return;
        
        const index = selectedMobCampaign.contacts.findIndex((c: { id: string }) => c.id === contactId);
        if (index !== -1) {
            const targetPage = Math.floor(index / PAGE_SIZE) + 1;
            setMobCurrentPage(targetPage);
            
            // Allow state to update and DOM to re-render, then scroll
            setTimeout(() => {
                const el = document.getElementById(`contact-row-${contactId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Provide a visual highlight
                    el.classList.add('bg-yellow-100', 'transition-all', 'duration-500');
                    setTimeout(() => el.classList.remove('bg-yellow-100'), 3000);
                }
            }, 100);
        }
    };

    const handleUpdateMobCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editMobData) return;
        try {
            await api.patch(`/campaigns/${editMobData.id}`, {
                title: editMobData.title,
                description: editMobData.description,
                submissionDeadline: new Date(editMobData.submissionDeadline).toISOString(),
                maxContacts: Number(editMobData.maxContacts),
                manualTarget: String(editMobData.manualTarget) === "" || editMobData.manualTarget === null ? null : Number(editMobData.manualTarget)
            });
            showToast('success', 'Mobilization campaign updated');
            setEditMobData(null);
            fetchMobCampaigns();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            showToast('error', error.response?.data?.message || 'Failed to update campaign');
        }
    };

    const handleDeleteMobCampaign = async () => {
        if (!selectedMobCampaign) return;
        if (!window.confirm('Are you sure you want to delete this campaign? All contacts will be permanently lost.')) return;
        try {
            await api.delete(`/campaigns/${selectedMobCampaign.id}`);
            showToast('success', 'Campaign deleted');
            setSelectedMobCampaign(null);
            fetchMobCampaigns();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            showToast('error', error.response?.data?.message || 'Failed to delete campaign');
        }
    };

    const handleUpdateCallStatus = async (contactId: string, status: string, notes?: string) => {
        if (!selectedMobCampaign) return;
        try {
            await api.patch(`/campaigns/${selectedMobCampaign.id}/contacts/${contactId}`, { callStatus: status, notes });
            showToast('success', 'Status updated');
            loadMobCampaignDetail(selectedMobCampaign.id); // Reload full detail to refresh contact rows
        } catch {
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
            setB1CurrentPage(1); // Reset pagination on new event
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBring1Global = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/bring-one/campaigns', newB1Data);
            
            // The backend requires us to update the newly created campaign to be active
            // Actually, we should just fetch to get its ID, then patch it to active
            const res = await api.get('/bring-one/campaigns');
            if (res.data.length > 0) {
                const newCampaignId = res.data[0].id; // assuming ordered by newest
                await api.patch(`/bring-one/campaigns/${newCampaignId}`, { isActive: true });
            }

            showToast('success', 'Bring 1 campaign configured and activated!');
            setShowCreateB1Modal(false);
            setNewB1Data({ title: '', description: '', minPledges: 1 });
            fetchBring1Global();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            showToast('error', error.response?.data?.message || 'Failed to create campaign');
        }
    };

    const handleUpdateBring1Global = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editB1Data) return;
        try {
            await api.patch(`/bring-one/campaigns/${editB1Data.id}`, {
                title: editB1Data.title,
                description: editB1Data.description,
                minPledges: Number(editB1Data.minPledges),
                manualTarget: String(editB1Data.manualTarget) === "" || editB1Data.manualTarget === null ? null : Number(editB1Data.manualTarget)
            });
            showToast('success', 'Bring 1 campaign updated');
            setEditB1Data(null);
            fetchBring1Global();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            showToast('error', error.response?.data?.message || 'Failed to update campaign');
        }
    };

    const handleDeleteBring1Global = async () => {
        if (!b1GlobalCampaign) return;
        if (!window.confirm('Are you sure you want to delete the current Bring 1 configuration? All related pledges will be permanently deleted.')) return;
        try {
            await api.delete(`/bring-one/campaigns/${b1GlobalCampaign.id}`);
            showToast('success', 'Bring 1 campaign deleted');
            setB1GlobalCampaign(null);
            setB1EventPledges([]);
            setB1Stats(null);
            fetchBring1Global();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            showToast('error', error.response?.data?.message || 'Failed to delete Bring 1 campaign');
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
                        className="px-4 py-2 bg-[#48A111] hover:bg-[#387f0e] text-white rounded-lg flex items-center gap-2 font-bold transition-colors shadow-sm"
                    >
                        <Plus size={18} /> New Mobilization
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        {!b1GlobalCampaign ? (
                            <button 
                                 onClick={() => setShowCreateB1Modal(true)}
                                className="px-4 py-2 bg-[#48A111] hover:bg-[#387f0e] text-white rounded-lg flex items-center gap-2 font-bold transition-colors shadow-sm"
                            >
                                <Plus size={18} /> Configure Bring 1
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setEditB1Data(b1GlobalCampaign as NonNullable<typeof editB1Data>)}
                                    className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-colors"
                                >
                                    <Edit2 size={18} /> Edit Config
                                </button>
                                <button 
                                    onClick={handleDeleteBring1Global}
                                    className="px-4 py-2 bg-white border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-colors"
                                >
                                    <Trash2 size={18} /> Delete Config
                                </button>
                            </>
                        )}
                    </div>
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
                            {mobCampaigns.map((camp) => (
                                <button
                                    key={camp.id}
                                    onClick={() => loadMobCampaignDetail(camp.id)}
                                    className={`w-full text-left px-5 py-4 transition-colors ${
                                        selectedMobCampaign?.id === camp.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'
                                    }`}
                                >
                                    <h4 className="font-bold text-slate-800 truncate">{camp.title}</h4>
                                    <div className="flex justify-between items-center mt-1 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${camp.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {camp.status}
                                        </span>
                                        <span className="text-slate-400">{camp._count?.contacts || 0} Contacts</span>
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
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setEditMobData(selectedMobCampaign as NonNullable<typeof editMobData>)}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg shadow-sm font-semibold transition-all"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={handleDeleteMobCampaign}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-lg shadow-sm font-semibold transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button 
                                            onClick={handleExportMob}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 hover:border-emerald-300 text-emerald-700 rounded-lg shadow-sm font-semibold transition-all"
                                        >
                                            <FileSpreadsheet size={18} /> Export
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/campaign-management/mob/${selectedMobCampaign.id}/report`)}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 rounded-lg shadow-sm font-semibold transition-all"
                                        >
                                            <PieChart size={18} /> View Report
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white border-b border-slate-200">
                                            <tr className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                                                <th className="px-6 py-4">Submitted By</th>
                                                <th className="px-6 py-4">Contact Detail</th>
                                                <th className="px-6 py-4">Relationship</th>
                                                <th className="px-6 py-4">Follow-up Status</th>
                                                <th className="px-6 py-4 text-right">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedMobCampaign.contacts?.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No contacts submitted yet.</td></tr>
                                            ) : (
                                                selectedMobCampaign.contacts?.slice((mobCurrentPage - 1) * PAGE_SIZE, mobCurrentPage * PAGE_SIZE).map((contact) => (
                                                    <tr id={`contact-row-${contact.id}`} key={contact.id} className={`${contact.isDuplicate ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800">{contact.submittedBy?.fullName || 'Unknown'}</div>
                                                            <div className="text-xs text-slate-500">{contact.submittedBy?.fellowshipNumber || ''}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800 flex items-center flex-wrap gap-1.5">
                                                                {contact.name}
                                                                {contact.isDuplicate && (
                                                                    <div className="flex gap-1">
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full flex items-center gap-0.5">
                                                                            <AlertTriangle size={9} /> DUPLICATE OF:
                                                                        </span>
                                                                        {contact.duplicateMatches?.map((match) => (
                                                                            <button 
                                                                                key={match.id}
                                                                                onClick={() => jumpToMobContact(match.id)}
                                                                                className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-full flex items-center gap-0.5 transition-colors"
                                                                            >
                                                                                {match.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                                                                <Phone size={12} /> {contact.phone}
                                                            </div>
                                                            {contact.email && <div className="text-xs text-slate-400 mt-0.5">{contact.email}</div>}
                                                            {contact.transportNeed && contact.transportNeed !== 'PENDING' && (
                                                                <div className="mt-1">
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded inline-block font-bold ${contact.transportNeed === 'NEEDS_TRANSPORT' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {contact.transportNeed === 'NEEDS_TRANSPORT' ? `Needs Transport${contact.location ? ` (${contact.location})` : ''}` : 'No Transport Needed'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">{contact.relationship || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                <select 
                                                                    value={contact.callStatus}
                                                                    onChange={(e) => handleUpdateCallStatus(contact.id, e.target.value, contact.notes)}
                                                                    className={`text-xs font-bold rounded-full px-2.5 py-1 border transition-colors outline-none cursor-pointer ${
                                                                        contact.callStatus === 'PENDING'       ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                        contact.callStatus === 'CONFIRMED'     ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                                                                'bg-red-100 text-red-700 border-red-200'
                                                                    }`}
                                                                >
                                                                    <option value="PENDING">PENDING</option>
                                                                    <option value="CONFIRMED">CONFIRMED</option>
                                                                    <option value="NOT_CONFIRMED">NOT CONFIRMED</option>
                                                                </select>
                                                                {contact.calledBy && (
                                                                    <span className="text-[10px] text-slate-400">by {contact.calledBy.fullName}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    title={contact.isDuplicate ? "Mark as Not Duplicate" : "Mark as Duplicate"}
                                                                    className={`${contact.isDuplicate ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'} p-1.5 rounded transition-colors`}
                                                                    onClick={() => api.patch(`/campaigns/${selectedMobCampaign.id}/contacts/${contact.id}`, { isDuplicate: !contact.isDuplicate }).then(() => loadMobCampaignDetail(selectedMobCampaign.id))}
                                                                >
                                                                    <AlertTriangle size={15} />
                                                                </button>
                                                                <button 
                                                                    className="text-cyan-600 hover:bg-cyan-50 p-1.5 rounded relative text-left"
                                                                    title="Open Micro-Chat"
                                                                    onClick={() => setChatEntity({ id: contact.id, name: contact.name, type: 'MOBILIZATION' })}
                                                                >
                                                                    <MessageCircle size={16} />
                                                                    {(((contact as unknown) as { _count?: { messages: number } })._count?.messages ?? 0) > 0 && (
                                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                                                    )}
                                                                </button>
                                                                <button 
                                                                    className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"
                                                                    onClick={() => {
                                                                        const notes = prompt("Enter notes for " + contact.name, contact.notes || "");
                                                                        if (notes !== null) handleUpdateCallStatus(contact.id, contact.callStatus || '', notes);
                                                                    }}
                                                                >
                                                                    <FileText size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {selectedMobCampaign.contacts && selectedMobCampaign.contacts.length > PAGE_SIZE && (
                                    <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50">
                                        <span className="text-sm text-slate-500 font-medium">
                                            Showing {(mobCurrentPage - 1) * PAGE_SIZE + 1} to {Math.min(mobCurrentPage * PAGE_SIZE, selectedMobCampaign.contacts.length)} of {selectedMobCampaign.contacts.length}
                                        </span>
                                        <div className="flex gap-2">
                                            <button disabled={mobCurrentPage === 1} onClick={() => setMobCurrentPage(p => p - 1)} className="px-3 py-1.5 bg-white border border-slate-200 font-bold text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Prev</button>
                                            <button disabled={selectedMobCampaign.contacts && mobCurrentPage * PAGE_SIZE >= selectedMobCampaign.contacts.length} onClick={() => setMobCurrentPage(p => p + 1)} className="px-3 py-1.5 bg-white border border-slate-200 font-bold text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
                                        </div>
                                    </div>
                                )}
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
                        <div className="flex gap-2">
                            <button 
                                onClick={handleExportBring1}
                                disabled={!selectedB1EventId || b1EventPledges.length === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl shadow-sm font-semibold transition-all disabled:opacity-50"
                            >
                                <FileSpreadsheet size={18} className="text-emerald-600" /> Export Event Pledges
                            </button>
                            <button 
                                onClick={() => navigate(`/campaign-management/bring1/${b1GlobalCampaign?.id}/report`)}
                                disabled={!b1GlobalCampaign}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 rounded-xl shadow-sm font-semibold transition-all disabled:opacity-50"
                            >
                                <PieChart size={18} /> View Bring 1 Report
                            </button>
                        </div>
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
                                        b1EventPledges.slice((b1CurrentPage - 1) * PAGE_SIZE, b1CurrentPage * PAGE_SIZE).map(pledge => (
                                            <tr key={pledge.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{pledge.inviter?.fullName || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-500">{pledge.inviter?.fellowshipNumber || ''}</div>
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
                                                    <div className="flex items-center justify-between">
                                                        <span>{pledge.matchedBy ? `Matched: ${pledge.matchedBy}` : '-'}</span>
                                                        <button 
                                                            className="text-cyan-600 hover:bg-cyan-50 p-1.5 rounded relative ml-2"
                                                            title="Open Micro-Chat"
                                                            onClick={() => setChatEntity({ id: pledge.id, name: pledge.name, type: 'BRING_ONE' })}
                                                        >
                                                            <MessageCircle size={16} />
                                                            {(((pledge as unknown) as { _count?: { messages: number } })._count?.messages ?? 0) > 0 && (
                                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {b1EventPledges.length > PAGE_SIZE && (
                            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50">
                                <span className="text-sm text-slate-500 font-medium">
                                    Showing {(b1CurrentPage - 1) * PAGE_SIZE + 1} to {Math.min(b1CurrentPage * PAGE_SIZE, b1EventPledges.length)} of {b1EventPledges.length}
                                </span>
                                <div className="flex gap-2">
                                    <button disabled={b1CurrentPage === 1} onClick={() => setB1CurrentPage(p => p - 1)} className="px-3 py-1.5 bg-white border border-slate-200 font-bold text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Prev</button>
                                    <button disabled={b1CurrentPage * PAGE_SIZE >= b1EventPledges.length} onClick={() => setB1CurrentPage(p => p + 1)} className="px-3 py-1.5 bg-white border border-slate-200 font-bold text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
                                </div>
                            </div>
                        )}
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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Manual Override Target</label>
                                    <input 
                                        type="number" min="1" placeholder="Auto-calculated if empty"
                                        onChange={e => {
                                            const val = e.target.value;
                                            setNewMobData(prev => ({ ...prev, manualTarget: val ? parseInt(val) : null }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="col-span-2">
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

            {/* Create Bring 1 Modal */}
            {showCreateB1Modal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-[#e9f5e1] to-white">
                            <h2 className="text-xl font-bold text-[#48A111] flex items-center gap-2">
                                <Flag size={20} /> Configure Bring 1 Campaign
                            </h2>
                            <button onClick={() => setShowCreateB1Modal(false)} className="text-slate-400 hover:text-slate-700">
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateBring1Global} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Campaign Title</label>
                                <input 
                                    required type="text" placeholder="e.g. Bring 1 For Sunday Service"
                                    value={newB1Data.title} onChange={e => setNewB1Data({...newB1Data, title: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#48A111]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea 
                                    rows={2} placeholder="Optional instructions for members"
                                    value={newB1Data.description} onChange={e => setNewB1Data({...newB1Data, description: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#48A111] resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Minimum Pledges Goal</label>
                                <input 
                                    required type="number" min="1"
                                    value={newB1Data.minPledges} onChange={e => setNewB1Data({...newB1Data, minPledges: parseInt(e.target.value) || 1})}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#48A111]"
                                />
                                <p className="text-xs text-slate-500 mt-1">Target number of pledges each member should bring.</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Manual Override Target</label>
                                <input 
                                    type="number" min="1" placeholder="Auto-calculated if empty"
                                    onChange={e => {
                                        const val = e.target.value;
                                        setNewB1Data(prev => ({ ...prev, manualTarget: val ? parseInt(val) : null }));
                                    }}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#48A111]"
                                />
                                <p className="text-xs text-slate-500 mt-1">Overrides the automatic Target formula.</p>
                            </div>
                            
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-sm mt-4">
                                <AlertTriangle size={15} className="shrink-0 text-amber-500 mt-0.5" />
                                <p><strong>Note:</strong> Creating this campaign will automatically set it as the active Bring 1 Campaign ecosystem-wide. Previous campaigns will be deactivated.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreateB1Modal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-[#48A111] hover:bg-[#387f0e] rounded-xl shadow-md">Create & Activate</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Mobilization Modal */}
            {editMobData && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <Edit2 size={20} className="text-indigo-600" /> Edit Mobilization
                            </h3>
                        </div>
                        <form onSubmit={handleUpdateMobCampaign} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Campaign Title</label>
                                <input 
                                    type="text" required
                                    value={editMobData.title}
                                    onChange={e => setEditMobData({...editMobData, title: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea 
                                    value={editMobData.description || ''}
                                    onChange={e => setEditMobData({...editMobData, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600 transition-colors min-h-[80px]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Deadline</label>
                                    <input 
                                        type="date" required
                                        value={editMobData.submissionDeadline.split('T')[0]}
                                        onChange={e => setEditMobData({...editMobData, submissionDeadline: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Max Contacts</label>
                                    <input 
                                        type="number" required min="1"
                                        value={editMobData.maxContacts}
                                        onChange={e => setEditMobData({...editMobData, maxContacts: Number(e.target.value)})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600 transition-colors"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Manual Override Target</label>
                                    <input 
                                        type="number" min="1" placeholder="Auto-calculated if empty"
                                        value={editMobData.manualTarget || ''}
                                        onChange={e => setEditMobData({...editMobData, manualTarget: e.target.value ? parseInt(e.target.value) : null})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-600 transition-colors"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setEditMobData(null)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Bring 1 Modal */}
            {editB1Data && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <Edit2 size={20} className="text-[#48A111]" /> Edit Bring 1 Config
                            </h3>
                        </div>
                        <form onSubmit={handleUpdateBring1Global} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Initiative Title</label>
                                <input 
                                    type="text" required
                                    placeholder="e.g. Bring 1 Campaign"
                                    value={editB1Data.title}
                                    onChange={e => setEditB1Data({...editB1Data, title: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#48A111] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description (Optional)</label>
                                <textarea 
                                    value={editB1Data.description || ''}
                                    onChange={e => setEditB1Data({...editB1Data, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#48A111] transition-colors min-h-[80px]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Min Pledges/Member</label>
                                    <input 
                                        type="number" required min="1"
                                        value={editB1Data.minPledges}
                                        onChange={e => setEditB1Data({...editB1Data, minPledges: Number(e.target.value)})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#48A111] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Override Target</label>
                                    <input 
                                        type="number" min="1" placeholder="Auto-calculated"
                                        value={editB1Data.manualTarget || ''}
                                        onChange={e => setEditB1Data({...editB1Data, manualTarget: e.target.value ? parseInt(e.target.value) : null})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#48A111] transition-colors"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setEditB1Data(null)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-[#48A111] hover:bg-[#387f0e] text-white text-sm font-bold rounded-lg shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat Modal Layer */}
            {chatEntity && (
                <ContactChatModal 
                    isOpen={!!chatEntity}
                    entityId={chatEntity.id}
                    entityName={chatEntity.name}
                    type={chatEntity.type}
                    currentUserId={currentUserId}
                    onClose={() => setChatEntity(null)} 
                    onMessagesRead={() => {
                        if (activeTab === 'mobilization' && selectedMobCampaign) loadMobCampaignDetail(selectedMobCampaign.id);
                        if (activeTab === 'bring1') fetchBring1Pledges(selectedB1EventId);
                    }}
                />
            )}
        </div>
    );
}
