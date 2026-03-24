import React, { useState, useEffect } from 'react';
import api from '../api';
import { Target, Users, Loader2, Calendar, Plus, Trash2, CheckCircle2, AlertCircle, AlertTriangle, Phone } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function Campaigns() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    
    // State for the currently selected campaign to submit to
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const [activeCampaignDetail, setActiveCampaignDetail] = useState<any | null>(null);
    const [newContacts, setNewContacts] = useState([{ name: '', phone: '', email: '', relationship: '', callStatus: 'PENDING' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await api.get('/campaigns');
            const data = res.data;
            setCampaigns(data);
            if (data.length > 0) {
                const firstId = activeCampaignId || data[0].id;
                setActiveCampaignId(firstId);
                fetchCampaignDetail(firstId);
            }
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
            showToast('error', 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaignDetail = async (id: string) => {
        try {
            const res = await api.get(`/campaigns/${id}`);
            setActiveCampaignDetail(res.data);
        } catch (error) {
            console.error('Failed to fetch campaign detail:', error);
        }
    };

    const handleAddRow = () => {
        setNewContacts([...newContacts, { name: '', phone: '', email: '', relationship: '', callStatus: 'PENDING' }]);
    };

    const handleRemoveRow = (index: number) => {
        if (newContacts.length === 1) return;
        setNewContacts(newContacts.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: string, value: string) => {
        const updated = [...newContacts];
        updated[index] = { ...updated[index], [field]: value };
        setNewContacts(updated);
    };

    const handleSubmitContacts = async (e: React.FormEvent, campaign: any) => {
        e.preventDefault();
        
        const validContacts = newContacts.filter(c => c.name.trim() && c.phone.trim());
        if (validContacts.length === 0) {
            showToast('error', 'Please provide at least a name and phone number for one contact');
            return;
        }

        const remainingSlots = campaign.maxContacts - (campaign.contacts?.length || 0);
        if (validContacts.length > remainingSlots) {
            showToast('error', `You can only submit ${remainingSlots} more contacts for this campaign`);
            return;
        }

        try {
            setIsSubmitting(true);
            await api.post(`/campaigns/${campaign.id}/contacts`, { contacts: validContacts });
            showToast('success', 'Contacts submitted successfully!');
            setNewContacts([{ name: '', phone: '', email: '', relationship: '', callStatus: 'PENDING' }]);
            fetchCampaigns(); // refresh to show updated progress
            fetchCampaignDetail(campaign.id); // also refresh detail view
        } catch (error: any) {
            console.error('Submit error:', error);
            showToast('error', error.response?.data?.message || 'Failed to submit contacts');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCallStatus = async (campaignId: string, contactId: string, callStatus: string) => {
        try {
            await api.patch(`/campaigns/${campaignId}/contacts/${contactId}`, { callStatus });
            fetchCampaignDetail(campaignId);
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 animate-fade-in">
                <Loader2 size={40} className="animate-spin text-[#48A111]" />
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xl mt-8 animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-slate-100 flex items-center justify-center mx-auto mb-6">
                    <Target size={40} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">No Active Campaigns</h2>
                <p className="text-slate-500 text-lg">There are currently no open mobilization campaigns. Check back later!</p>
            </div>
        );
    }

    const activeCampaign = campaigns.find((c: any) => c.id === activeCampaignId) || campaigns[0];
    // Use _count.contacts (from list view) for progress tracking
    const userSubmittedCount = activeCampaignDetail?.contacts?.length || 0;
    const totalContactCount = activeCampaign._count?.contacts || 0;
    const isFull = userSubmittedCount >= activeCampaign.maxContacts;
    const remainingSlots = activeCampaign.maxContacts - userSubmittedCount;
    
    const deadlineStr = new Date(activeCampaign.submissionDeadline).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
    });
    
    const now = new Date();
    const deadlineDate = new Date(activeCampaign.submissionDeadline);
    const isPastDeadline = now > deadlineDate;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[#e9f5e1] text-[#48A111]">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Mobilization Campaigns</h1>
                        <p className="text-slate-500 text-sm">Contribute to ongoing fellowship outreach efforts</p>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Col: Campaign Selector */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">Open Campaigns</h3>
                    {campaigns.map((camp: any) => (
                        <button
                            key={camp.id}
                            onClick={() => {
                                setActiveCampaignId(camp.id);
                                fetchCampaignDetail(camp.id);
                            }}
                            className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                                activeCampaignId === camp.id 
                                ? 'bg-white border-[#48A111] shadow-md ring-1 ring-[#48A111]' 
                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className={`font-bold ${activeCampaignId === camp.id ? 'text-[#48A111]' : 'text-slate-800'}`}>
                                    {camp.title}
                                </h4>
                                {(camp._count?.contacts || 0) >= camp.maxContacts && (
                                    <CheckCircle2 size={16} className="text-[#48A111]" />
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                                <Calendar size={12} /> Ends {new Date(camp.submissionDeadline).toLocaleDateString()}
                            </div>
                            
                            {/* Mini Progress Bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span>Progress</span>
                                    <span>{camp._count?.contacts || 0} / {camp.maxContacts}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#48A111] transition-all duration-500"
                                        style={{ width: `${Math.min(100, ((camp._count?.contacts || 0) / camp.maxContacts) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Right Col: Active Campaign Details & Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Campaign Header */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e9f5e1] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{activeCampaign.title}</h2>
                            <p className="text-slate-600 mb-6">{activeCampaign.description || 'No description provided.'}</p>
                            
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <Calendar className="text-slate-400" size={18} />
                                    <span className="text-sm font-semibold text-slate-700">Deadline: {deadlineStr}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <Users className="text-slate-400" size={18} />
                                    <span className="text-sm font-semibold text-slate-700">Goal: Up to {activeCampaign.maxContacts} contacts</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#e9f5e1] rounded-xl border border-[#c5e3b0]">
                                    <CheckCircle2 className="text-[#48A111]" size={18} />
                                    <span className="text-sm font-semibold text-[#387f0e]">My submitted: {userSubmittedCount} / {activeCampaign.maxContacts}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submission Section */}
                    {isPastDeadline ? (
                        <div className="p-8 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                            <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
                            <h3 className="text-xl font-bold text-amber-800 mb-1">Submission Closed</h3>
                            <p className="text-amber-700 font-medium">The deadline for this campaign has passed.</p>
                        </div>
                    ) : isFull ? (
                        <div className="p-8 bg-[#e9f5e1] rounded-2xl border border-[#c5e3b0] text-center">
                            <CheckCircle2 size={40} className="mx-auto text-[#48A111] mb-3" />
                            <h3 className="text-xl font-bold text-[#387f0e] mb-1">Target Reached!</h3>
                            <p className="text-[#48A111] font-medium">You have successfully submitted your maximum allowed contacts ({activeCampaign.maxContacts}) for this campaign.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Plus className="text-[#48A111]" /> Submit Contacts
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        You can submit {remainingSlots} more contacts.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-extrabold text-[#48A111]">{userSubmittedCount}</span>
                                    <span className="text-slate-400 font-bold"> / {activeCampaign.maxContacts}</span>
                                </div>
                            </div>

                            <form onSubmit={(e) => handleSubmitContacts(e, activeCampaign)} className="p-6">
                                <div className="space-y-4">
                                    {newContacts.map((contact, index) => (
                                        <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs font-bold shrink-0 mt-2">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input 
                                                    type="text" 
                                                    placeholder="Full Name *" 
                                                    required
                                                    value={contact.name}
                                                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-1 focus:ring-[#48A111] outline-none transition-all text-sm bg-white"
                                                />
                                                <input 
                                                    type="tel" 
                                                    placeholder="Phone Number *" 
                                                    required
                                                    value={contact.phone}
                                                    onChange={(e) => handleChange(index, 'phone', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-1 focus:ring-[#48A111] outline-none transition-all text-sm bg-white"
                                                />
                                                <input 
                                                    type="email" 
                                                    placeholder="Email (Optional)" 
                                                    value={contact.email}
                                                    onChange={(e) => handleChange(index, 'email', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-1 focus:ring-[#48A111] outline-none transition-all text-sm bg-white"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Relationship (e.g. Friend, Colleague)" 
                                                    value={contact.relationship}
                                                    onChange={(e) => handleChange(index, 'relationship', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-1 focus:ring-[#48A111] outline-none transition-all text-sm bg-white"
                                                />
                                                <select
                                                    value={contact.callStatus}
                                                    onChange={(e) => handleChange(index, 'callStatus', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-1 focus:ring-[#48A111] outline-none transition-all text-sm bg-white font-medium text-slate-700"
                                                >
                                                    <option value="PENDING">Status: Pending</option>
                                                    <option value="CONFIRMED">Status: Confirmed</option>
                                                    <option value="NOT_CONFIRMED">Status: Dropped Out</option>
                                                </select>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveRow(index)}
                                                disabled={newContacts.length === 1}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent mt-1"
                                                title="Remove row"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={handleAddRow}
                                        disabled={userSubmittedCount + newContacts.length >= activeCampaign.maxContacts}
                                        className="flex items-center gap-2 text-sm font-bold text-[#48A111] hover:bg-[#e9f5e1] px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                    >
                                        <Plus size={18} /> Add Another Contact Row
                                    </button>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || userSubmittedCount + newContacts.length > activeCampaign.maxContacts}
                                        className="w-full md:w-auto px-8 py-3 bg-[#48A111] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Contacts'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    {/* Previously Submitted Contacts with Call Status Tracking */}
                    {activeCampaignDetail?.contacts && activeCampaignDetail.contacts.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                    My Submitted Contacts
                                </h3>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">
                                    {activeCampaignDetail.contacts.length} Total
                                </span>
                            </div>
                            
                            {/* Duplicate warning banner */}
                            {activeCampaignDetail.contacts.some((c: any) => c.isDuplicate) && (
                                <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700 text-sm">
                                    <AlertTriangle size={16} className="shrink-0" />
                                    <span><strong>Note:</strong> Some contacts are flagged as duplicates — they share a phone number or email already on this campaign.</span>
                                </div>
                            )}

                            <div className="p-4 grid sm:grid-cols-2 gap-3">
                                {activeCampaignDetail.contacts.map((c: any) => (
                                    <div key={c.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${c.isDuplicate ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-slate-50'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                    {c.name}
                                                    {c.isDuplicate && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full">DUPLICATE</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Phone size={11} /> {c.phone}
                                                    {c.email && <span className="ml-2 text-slate-400">{c.email}</span>}
                                                </div>
                                                {c.relationship && (
                                                    <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded mt-1 inline-block">{c.relationship}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Call status tracker */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Follow-up Status</label>
                                            <select
                                                value={c.callStatus}
                                                onChange={(e) => handleUpdateCallStatus(activeCampaign.id, c.id, e.target.value)}
                                                className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-colors outline-none cursor-pointer ${
                                                    c.callStatus === 'PENDING'       ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                    c.callStatus === 'CONFIRMED'     ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                                       'bg-red-100 text-red-700 border-red-200'
                                                }`}
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="CONFIRMED">Confirmed Attending</option>
                                                <option value="NOT_CONFIRMED">Not Confirmed</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
