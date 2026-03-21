import React, { useState, useEffect } from 'react';
import api from '../api';
import { Target, Users, Loader2, Calendar, Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export default function Campaigns() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    
    // State for the currently selected campaign to submit to
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const [newContacts, setNewContacts] = useState([{ name: '', phone: '', email: '', relationship: '' }]);
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
            if (data.length > 0 && !activeCampaignId) {
                // Default to first campaign
                setActiveCampaignId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
            showToast('error', 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setNewContacts([...newContacts, { name: '', phone: '', email: '', relationship: '' }]);
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
            setNewContacts([{ name: '', phone: '', email: '', relationship: '' }]);
            fetchCampaigns(); // refresh to show updated progress
        } catch (error: any) {
            console.error('Submit error:', error);
            showToast('error', error.response?.data?.message || 'Failed to submit contacts');
        } finally {
            setIsSubmitting(false);
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

    const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];
    const userSubmittedCount = activeCampaign.contacts?.length || 0;
    const isFull = userSubmittedCount >= activeCampaign.maxContacts;
    
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
                    {campaigns.map(camp => (
                        <button
                            key={camp.id}
                            onClick={() => setActiveCampaignId(camp.id)}
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
                                {camp.contacts?.length >= camp.maxContacts && (
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
                                    <span>{camp.contacts?.length || 0} / {camp.maxContacts}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#48A111] transition-all duration-500"
                                        style={{ width: `${Math.min(100, ((camp.contacts?.length || 0) / camp.maxContacts) * 100)}%` }}
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
                                        You can submit {activeCampaign.maxContacts - userSubmittedCount} more contacts.
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
                    
                    {/* Previously Submitted List */}
                    {activeCampaign.contacts && activeCampaign.contacts.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 pt-5">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex justify-between items-center">
                                Already Submitted Contacts
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs">{activeCampaign.contacts.length} Total</span>
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {activeCampaign.contacts.map((c: any) => (
                                    <div key={c.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-1">
                                        <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                                        <div className="text-xs text-slate-500 flex justify-between">
                                            <span>{c.phone}</span>
                                            {c.relationship && <span className="text-slate-400 bg-slate-200/50 px-1.5 rounded">{c.relationship}</span>}
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
