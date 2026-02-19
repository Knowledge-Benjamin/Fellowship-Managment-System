import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api';
import { Scan, CheckCircle, XCircle, Zap, Camera, AlertTriangle, Loader2, RefreshCw, Hash, User } from 'lucide-react';
import EventSelector from '../components/EventSelector';
import type { Event } from '../types/event';

interface MemberData {
    id: string;
    fullName: string;
    fellowshipNumber: string;
    phoneNumber: string;
    region: {
        id: string;
        name: string;
    };
}

const CheckIn = () => {
    const [activeEvents, setActiveEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [result, setResult] = useState('');
    const [scanning, setScanning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
    const [message, setMessage] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Fellowship number check-in states
    const [fellowshipNumber, setFellowshipNumber] = useState('');
    const [fellowshipLookupLoading, setFellowshipLookupLoading] = useState(false);
    const [memberData, setMemberData] = useState<MemberData | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const checkPermission = async (eventId: string) => {
        try {
            const response = await api.get(`/volunteers/${eventId}/check-permission`);
            if (!response.data.hasPermission) {
                setAccessDenied(true);
                setMessage('You do not have permission to perform check-ins for this event.');
            }
        } catch (error) {
            console.error('Failed to check permission:', error);
            setAccessDenied(true);
            setMessage('Unable to verify check-in permissions. Access denied for security.');
        }
    };

    const fetchActiveEvent = async () => {
        try {
            const response = await api.get('/events/active');
            const events = Array.isArray(response.data) ? response.data : [response.data];
            setActiveEvents(events);
            if (events.length === 1) {
                setSelectedEvent(events[0]);
                checkPermission(events[0].id);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                setMessage('No active event. Please wait for an event to start.');
            } else {
                setMessage('Failed to load event information');
            }
        }
    };

    useEffect(() => {
        fetchActiveEvent();
    }, []);

    useEffect(() => {
        if (scanning && selectedEvent && !accessDenied) {
            setPermissionDenied(false);

            const scanner = new Html5QrcodeScanner(
                'qr-reader',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    showZoomSliderIfSupported: true,
                },
                false
            );

            scannerRef.current = scanner;

            scanner.render(
                async (decodedText) => {
                    setResult(decodedText);
                    setStatus('loading');
                    setScanning(false);
                    scanner.clear();

                    try {
                        const response = await api.post('/attendance/check-in', {
                            qrCode: decodedText,
                            method: 'QR',
                            eventId: selectedEvent.id,
                        });
                        setStatus('success');
                        setMessage(`${response.data.member.fullName} checked in successfully!`);
                        setTimeout(() => {
                            setStatus('idle');
                            setResult('');
                        }, 4000);
                    } catch (error: any) {
                        console.error(error);
                        setStatus('error');
                        setMessage(error?.response?.data?.error || 'Check-in Failed. Please try again.');
                        setTimeout(() => setStatus('idle'), 5000);
                    }
                },
                (errorMessage) => {
                    if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowedError')) {
                        setPermissionDenied(true);
                        setScanning(false);
                        scanner.clear();
                    }
                }
            );

            return () => {
                scanner.clear().catch((error) => {
                    console.error('Failed to clear scanner', error);
                });
            };
        }
    }, [scanning, selectedEvent, accessDenied]);

    const handleStartScan = () => {
        setPermissionDenied(false);
        setStatus('idle');
        setScanning(true);
        setFellowshipNumber('');
        setShowConfirmation(false);
        setMemberData(null);
    };

    const handleStopScan = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
        }
        setScanning(false);
    };

    const handleFellowshipLookup = async () => {
        if (!fellowshipNumber || fellowshipNumber.length !== 6 || !selectedEvent) return;

        setFellowshipLookupLoading(true);
        setMemberData(null);
        setShowConfirmation(false);

        try {
            const response = await api.post('/attendance/check-in', {
                fellowshipNumber: fellowshipNumber.toUpperCase(),
                method: 'FELLOWSHIP_NUMBER',
                eventId: selectedEvent.id,
            });

            setMemberData(response.data.member);
            setShowConfirmation(true);
            setStatus('success');
            setMessage(`${response.data.member.fullName} checked in successfully!`);

            setTimeout(() => {
                setStatus('idle');
                setFellowshipNumber('');
                setShowConfirmation(false);
                setMemberData(null);
            }, 4000);
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setMessage(error?.response?.data?.error || 'Check-in failed. Please verify the fellowship number.');
            setTimeout(() => setStatus('idle'), 5000);
        } finally {
            setFellowshipLookupLoading(false);
        }
    };

    const handleRetry = () => {
        setStatus('idle');
        setResult('');
        setPermissionDenied(false);
        setFellowshipNumber('');
        setShowConfirmation(false);
        setMemberData(null);
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 relative overflow-hidden">

                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-40" style={{ backgroundColor: '#e9f5e1' }} />

                <div className="relative">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#e9f5e1', color: '#48A111', outline: '1.5px solid #c5e3b0' }}>
                            <Scan className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900">Event Check-in</h2>
                                <Zap className="w-5 h-5" style={{ color: '#F2B50B' }} />
                            </div>
                            <p className="text-slate-500 text-sm">Scan QR code or enter fellowship number</p>
                        </div>
                    </div>

                    {/* Access Denied State */}
                    {accessDenied && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5 animate-slide-up">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="text-red-500" size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-red-700 font-bold text-base mb-1">Access Denied</h3>
                                    <p className="text-red-600 text-sm mb-2 leading-relaxed">{message}</p>
                                    <p className="text-red-400 text-xs">
                                        Only Fellowship Managers and assigned Check-in Volunteers can access this page for the current event.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Permission Denied State */}
                    {permissionDenied && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-5 animate-slide-up">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="text-yellow-600" size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-yellow-800 font-bold text-base mb-1">Camera Permission Required</h3>
                                    <p className="text-yellow-700 text-sm mb-4 leading-relaxed">
                                        To scan QR codes, we need access to your camera. Please allow camera access when prompted by your browser.
                                    </p>
                                    <button
                                        onClick={handleStartScan}
                                        className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
                                        style={{ backgroundColor: '#48A111' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                                    >
                                        <RefreshCw size={16} />
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Event Selector */}
                    <EventSelector
                        events={activeEvents}
                        selectedEvent={selectedEvent}
                        onEventChange={(event: Event) => {
                            setSelectedEvent(event);
                            checkPermission(event.id);
                        }}
                    />

                    {/* Main Content - Only show if access is granted */}
                    {!accessDenied && selectedEvent && (
                        <>
                            {/* QR Scanner Button */}
                            {!scanning && status === 'idle' && !permissionDenied && !showConfirmation && (
                                <div className="mb-6">
                                    <button
                                        onClick={handleStartScan}
                                        className="w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-3 text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                                        style={{ backgroundColor: '#48A111' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                                    >
                                        <Camera size={22} />
                                        Start QR Scanner
                                    </button>
                                    <p className="text-center text-slate-400 text-xs mt-2">
                                        Camera access is required for scanning
                                    </p>
                                </div>
                            )}

                            {/* Scanner Window */}
                            {scanning && (
                                <div className="mb-6 animate-scale-in">
                                    <div className="relative">
                                        <div id="qr-reader" className="rounded-xl overflow-hidden shadow-lg" style={{ border: '3px solid #48A111' }} />
                                        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                                            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                                                <p className="text-white text-sm font-medium flex items-center gap-2">
                                                    <Scan size={14} className="animate-pulse" />
                                                    Align QR code within the box
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleStopScan}
                                        className="w-full mt-4 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 text-white bg-red-500 hover:bg-red-600 shadow-md transition-all active:scale-95"
                                    >
                                        <XCircle size={18} />
                                        Stop Scanner
                                    </button>
                                </div>
                            )}

                            {/* OR Divider */}
                            {!scanning && status === 'idle' && !showConfirmation && (
                                <div className="flex items-center gap-4 my-5">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-slate-400 text-sm font-semibold">OR</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                            )}

                            {/* Fellowship Number Input */}
                            {!scanning && status === 'idle' && !showConfirmation && (
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                                        <Hash size={16} style={{ color: '#48A111' }} />
                                        Enter Fellowship Number
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={fellowshipNumber}
                                            onChange={(e) => setFellowshipNumber(e.target.value.toUpperCase())}
                                            placeholder="AAA001"
                                            maxLength={6}
                                            className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-lg tracking-widest focus:outline-none transition-all"
                                            style={{}}
                                            onFocus={(e) => { e.currentTarget.style.borderColor = '#48A111'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)'; }}
                                            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && fellowshipNumber.length === 6) {
                                                    handleFellowshipLookup();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleFellowshipLookup}
                                            disabled={fellowshipNumber.length !== 6 || fellowshipLookupLoading}
                                            className="px-5 py-3 rounded-xl text-white font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                            style={{ backgroundColor: '#48A111' }}
                                            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#48A111')}
                                        >
                                            {fellowshipLookupLoading ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>Checking...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <User size={16} />
                                                    <span>Check In</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-slate-400 text-xs mt-2">
                                        Enter the 6-character fellowship number (e.g., AAA001)
                                    </p>
                                </div>
                            )}

                            {/* Loading State */}
                            {status === 'loading' && (
                                <div className="rounded-xl p-5 flex items-center gap-4 animate-slide-up border" style={{ backgroundColor: '#e9f5e1', borderColor: '#c5e3b0' }}>
                                    <Loader2 className="animate-spin shrink-0" style={{ color: '#48A111' }} size={28} />
                                    <div>
                                        <p className="font-semibold text-slate-900">Processing Check-in...</p>
                                        <p className="text-slate-500 text-sm mt-0.5">Please wait a moment</p>
                                    </div>
                                </div>
                            )}

                            {/* Success State */}
                            {status === 'success' && memberData && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-slide-up relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: '#48A111' }} />
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#e9f5e1' }}>
                                            <CheckCircle size={24} style={{ color: '#48A111' }} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-lg text-slate-900 mb-3">{message}</p>
                                            <div className="p-4 bg-white rounded-xl border border-green-100 space-y-1.5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <User size={15} style={{ color: '#48A111' }} />
                                                    <span className="text-slate-600 text-sm font-semibold">Member Details</span>
                                                </div>
                                                <div className="ml-5 space-y-1">
                                                    <p className="text-slate-900 font-medium">{memberData.fullName}</p>
                                                    <p className="text-slate-500 text-sm">Fellowship: {memberData.fellowshipNumber}</p>
                                                    <p className="text-slate-500 text-sm">Region: {memberData.region.name}</p>
                                                    <p className="text-slate-500 text-sm">Phone: {memberData.phoneNumber}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {status === 'error' && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-5 animate-slide-up relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-xl" />
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <XCircle className="text-red-500" size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-lg mb-1">{message}</p>
                                            <p className="text-slate-500 text-sm mb-4">Please try again or contact an administrator</p>
                                            <button
                                                onClick={handleRetry}
                                                className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all text-sm flex items-center gap-2"
                                            >
                                                <RefreshCw size={15} />
                                                Try Again
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* How It Works Instructions */}
                            {!scanning && status === 'idle' && !result && !permissionDenied && !showConfirmation && (
                                <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 relative">
                                    <div className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#48A111' }}>
                                        HOW IT WORKS
                                    </div>
                                    <div className="space-y-4 pt-1">
                                        <div>
                                            <p className="font-semibold text-sm mb-1.5 flex items-center gap-2" style={{ color: '#48A111' }}>
                                                <Scan size={14} />
                                                QR Code Check-in:
                                            </p>
                                            <ol className="text-slate-500 space-y-0.5 list-none ml-5 text-sm">
                                                <li>• Click "Start QR Scanner"</li>
                                                <li>• Allow camera access</li>
                                                <li>• Position QR code within the box</li>
                                                <li>• Automatic check-in</li>
                                            </ol>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm mb-1.5 flex items-center gap-2" style={{ color: '#F2B50B' }}>
                                                <Hash size={14} />
                                                Fellowship Number Check-in:
                                            </p>
                                            <ol className="text-slate-500 space-y-0.5 list-none ml-5 text-sm">
                                                <li>• Enter 6-character fellowship number</li>
                                                <li>• Click "Check In"</li>
                                                <li>• System verifies and checks in member</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckIn;
