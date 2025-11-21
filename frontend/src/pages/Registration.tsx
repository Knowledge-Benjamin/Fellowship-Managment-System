import React, { useState } from 'react';
import api from '../api';
import QRCode from 'react-qr-code';
import { UserPlus, CheckCircle, Download, RotateCcw, Sparkles } from 'lucide-react';

const Registration = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        gender: 'MALE',
        residence: '',
        course: '',
        yearOfStudy: 1,
    });
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await api.post('/members', formData);
            setQrCode(response.data.qrCode);
        } catch (error) {
            alert('Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setQrCode(null);
        setFormData({
            fullName: '',
            phoneNumber: '',
            gender: 'MALE',
            residence: '',
            course: '',
            yearOfStudy: 1,
        });
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            {!qrCode ? (
                <div className="premium-card accent-border corner-accent p-8 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8 relative">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shrink-0 glow-primary">
                                <UserPlus className="text-white" size={26} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-3xl font-bold text-white">New Member</h2>
                                    <Sparkles className="text-indigo-400" size={20} />
                                </div>
                                <p className="text-slate-400 text-sm">Complete the form to join the fellowship</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div className="space-y-2 group">
                            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                Full Name
                                <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className="input transition-smooth"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

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

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Residence */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Residence</label>
                                <input
                                    type="text"
                                    placeholder="Hostel or Location"
                                    className="input transition-smooth"
                                    value={formData.residence}
                                    onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                                />
                            </div>

                            {/* Year of Study */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300">Year of Study</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="7"
                                    placeholder="1"
                                    className="input transition-smooth"
                                    value={formData.yearOfStudy}
                                    onChange={(e) => setFormData({ ...formData, yearOfStudy: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        {/* Course */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300">Course</label>
                            <input
                                type="text"
                                placeholder="Your Course of Study"
                                className="input transition-smooth"
                                value={formData.course}
                                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary w-full py-4 text-base font-semibold rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    <span>Register & Generate QR Code</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="premium-card p-8 shadow-2xl text-center animate-scale-in relative overflow-hidden">
                    {/* Success Indicator */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>

                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="text-green-500" size={40} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Registration Successful!</h2>
                    <p className="text-slate-400 mb-8">Your QR code has been generated</p>

                    {/* QR Code Display */}
                    <div className="relative inline-block mb-8">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl">
                            <QRCode value={qrCode} size={256} />
                        </div>
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            QR
                        </div>
                    </div>

                    <p className="text-slate-300 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                        Save this QR code to your phone. You'll need it for check-ins at fellowship events.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-center flex-wrap">
                        <button
                            onClick={() => alert('QR Code download feature coming soon!')}
                            className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-all duration-300 flex items-center gap-2 border border-slate-700"
                        >
                            <Download size={20} />
                            <span>Download</span>
                        </button>
                        <button
                            onClick={handleReset}
                            className="btn btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
                        >
                            <RotateCcw size={20} />
                            <span>Register Another</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Registration;
