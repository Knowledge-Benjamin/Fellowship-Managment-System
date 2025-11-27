import React, { useState, useEffect } from 'react';
import api from '../api';
import QRCode from 'react-qr-code';
import { useToast } from '../components/ToastProvider';
import { UserPlus, CheckCircle, Download, RotateCcw, Sparkles, Copy, Mail, MapPin } from 'lucide-react';

interface Region {
    id: string;
    name: string;
}

const Registration = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [regions, setRegions] = useState<Region[]>([]);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        gender: 'MALE',
        regionId: '',
        course: '',
        yearOfStudy: 1,
    });
    const [createdMember, setCreatedMember] = useState<{ fullName: string; fellowshipNumber: string; defaultPassword?: string; qrCode: string; region?: { name: string } } | null>(null);

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
            // Auto-select if only one region exists or if it's the first load and we want a default
            if (response.data.length === 1) {
                setFormData(prev => ({ ...prev, regionId: response.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch regions:', error);
            showToast('error', 'Failed to load regions. Please refresh the page.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/members', formData);
            setCreatedMember(response.data);
            showToast('success', 'Member registered successfully!');
        } catch (error: any) {
            console.error('Registration error:', error);
            const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCreatedMember(null);
        setFormData({
            fullName: '',
            email: '',
            phoneNumber: '',
            gender: 'MALE',
            regionId: '',
            course: '',
            yearOfStudy: 1,
        });
    };

    const downloadQRCode = () => {
        const svg = document.getElementById('qr-code');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `${createdMember?.fullName}-QR.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        }
    };

    if (createdMember) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/10 text-teal-400 mb-4 ring-1 ring-teal-500/20">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-teal-200 to-teal-400 bg-clip-text text-transparent">
                        Registration Successful!
                    </h2>
                    <p className="text-slate-400">
                        Member has been added to the fellowship database.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Member Details Card */}
                    <div className="glass-card p-6 space-y-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-teal-400" />
                                Account Details
                            </h3>

                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</label>
                                    <p className="text-slate-200 font-medium">{createdMember.fullName}</p>
                                </div>

                                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fellowship Number</label>
                                    <p className="text-teal-400 font-mono font-bold text-lg">{createdMember.fellowshipNumber}</p>
                                </div>

                                {createdMember.region && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Region</label>
                                        <p className="text-slate-200">{createdMember.region.name}</p>
                                    </div>
                                )}

                                {createdMember.defaultPassword && (
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Default Password</label>
                                        <div className="flex items-center justify-between">
                                            <p className="text-slate-200 font-mono">{createdMember.defaultPassword}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(createdMember.defaultPassword!);
                                                    showToast('success', 'Password copied!');
                                                }}
                                                className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-slate-400 hover:text-white"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                                <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>A confirmation email has been sent to the member with these details.</p>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Card */}
                    <div className="glass-card p-6 flex flex-col items-center justify-center space-y-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative w-full flex flex-col items-center space-y-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 self-start">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Member QR Code
                            </h3>

                            <div className="p-4 bg-white rounded-xl shadow-lg shadow-black/20">
                                <QRCode
                                    id="qr-code"
                                    value={createdMember.qrCode}
                                    size={200}
                                    level="H"
                                />
                            </div>

                            <button
                                onClick={downloadQRCode}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 hover:border-slate-600 w-full justify-center"
                            >
                                <Download className="w-4 h-4" />
                                Download QR Code
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleReset}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Register Another Member
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Register New Member</h2>
                            <p className="text-slate-400">Enter member details to generate fellowship number and QR code</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                Full Name
                                <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. John Doe"
                                className="input transition-smooth"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                Email Address
                                <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="email"
                                placeholder="john@example.com"
                                className="input transition-smooth"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    Phone Number
                                    <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="+256 700 000 000"
                                    className="input transition-smooth"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    Gender
                                    <span className="text-red-400">*</span>
                                </label>
                                <select
                                    className="input transition-smooth cursor-pointer"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>
                        </div>

                        {/* Region */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-teal-400" />
                                Region
                                <span className="text-red-400">*</span>
                            </label>
                            <select
                                className="input transition-smooth cursor-pointer"
                                value={formData.regionId}
                                onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                                required
                            >
                                <option value="">Select a region</option>
                                {regions.map((region) => (
                                    <option key={region.id} value={region.id}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>
                            {regions.length === 0 && (
                                <p className="text-xs text-amber-400 mt-1">
                                    No regions available. Please ask a manager to add regions.
                                </p>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Course */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Course (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science"
                                    className="input transition-smooth"
                                    value={formData.course}
                                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                                />
                            </div>

                            {/* Year of Study */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Year of Study (Optional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="7"
                                    className="input transition-smooth"
                                    value={formData.yearOfStudy}
                                    onChange={(e) => setFormData({ ...formData, yearOfStudy: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-8 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Register Member
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Registration;
