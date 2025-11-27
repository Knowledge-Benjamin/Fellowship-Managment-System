import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api';
import { Scan, CheckCircle, XCircle, Zap, Camera, AlertTriangle, Loader2, RefreshCw, Hash, User } from 'lucide-react';

interface Event {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    allowGuestCheckin: boolean;
}

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
    const [activeEvent, setActiveEvent] = useState<Event | null>(null);
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
            setActiveEvent(response.data);
            if (response.data) {
                checkPermission(response.data.id);
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
        if (scanning && activeEvent && !accessDenied) {
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
                            eventId: activeEvent.id,
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
    }, [scanning, activeEvent, accessDenied]);

    const handleStartScan = () => {
        setPermissionDenied(false);
        setStatus('idle');
        setScanning(true);
        // Reset fellowship number states when switching to QR
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
        if (!fellowshipNumber || fellowshipNumber.length !== 6 || !activeEvent) return;

        setFellowshipLookupLoading(true);
        setMemberData(null);
        setShowConfirmation(false);

        try {
            const response = await api.post('/attendance/check-in', {
                fellowshipNumber: fellowshipNumber.toUpperCase(),
                method: 'FELLOWSHIP_NUMBER',
                eventId: activeEvent.id,
            });

            // Success - member lookup and check-in was successful
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
            <div className="premium-card accent-border p-8 shadow-2xl relative">
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500 opacity-5 rounded-bl-full"></div>

                {/* Header */}
                <div className="mb-8 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shrink-0 glow-primary">
                            <Scan className="text-white" size={26} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-3xl font-bold text-white">Event Check-in</h2>
                                <Zap className="text-teal-400" size={20} />
                            </div>
                            <p className="text-slate-400 text-sm">Scan QR code or enter fellowship number</p>
                        </div>
                    </div>
                </div>

                {/* Access Denied State */}
                {accessDenied && (
                    <div className="mb-6 bg-red-600/20 border-2 border-red-500 rounded-xl p-6 animate-slide-up">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="text-red-400" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-red-100 font-bold text-lg mb-2">Access Denied</h3>
                                <p className="text-red-200 text-sm mb-4 leading-relaxed">
                                    {message}
                                </p>
                                <p className="text-red-300 text-xs">
                                    Only Fellowship Managers and assigned Check-in Volunteers can access this page for the current event.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Permission Denied State */}
                {permissionDenied && (
                    <div className="mb-6 bg-yellow-600/20 border-2 border-yellow-500 rounded-xl p-6 animate-slide-up">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="text-yellow-400" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-yellow-100 font-bold text-lg mb-2">Camera Permission Required</h3>
                                <p className="text-yellow-200 text-sm mb-4 leading-relaxed">
                                    To scan QR codes, we need access to your camera. Please allow camera access when prompted by your browser.
                                </p>
                                <button
                                    onClick={handleStartScan}
                                    className="px-6 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition-all duration-300 flex items-center gap-2"
                                >
                                    <RefreshCw size={18} />
                                    <span>Try Again</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content - Only show if access is granted */}
                {!accessDenied && (
                    <>
                        {/* QR Scanner Section */}
                        {!scanning && status === 'idle' && !permissionDenied && !showConfirmation && (
                            <div className="mb-6 relative z-10">
                                <button
                                    onClick={handleStartScan}
                                    className="w-full py-5 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 border-2 bg-teal-600 border-teal-600 text-white hover:bg-teal-700 hover:scale-[1.02] shadow-lg hover:shadow-xl active:scale-100"
                                >
                                    <Camera size={24} />
                                    <span>Start QR Scanner</span>
                                </button>
                                <p className="text-center text-slate-500 text-xs mt-3">
                                    Camera access is required for scanning
                                </p>
                            </div>
                        )}

                        {/* Scanner Window */}
                        {scanning && (
                            <div className="mb-6 relative z-10 animate-scale-in">
                                <div className="relative">
                                    <div id="qr-reader" className="rounded-xl overflow-hidden border-4 border-teal-600 shadow-2xl bg-slate-900"></div>

                                    <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                                        <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                                            <p className="text-white text-sm font-medium flex items-center gap-2">
                                                <Scan size={16} className="animate-pulse" />
                                                <span>Align QR code within the box</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStopScan}
                                    className="w-full mt-4 py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 border-2 bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg active:scale-95"
                                >
                                    <XCircle size={20} />
                                    <span>Stop Scanner</span>
                                </button>
                            </div>
                        )}

                        {/* OR Divider */}
                        {!scanning && status === 'idle' && !showConfirmation && (
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-slate-700"></div>
                                <span className="text-slate-500 font-semibold">OR</span>
                                <div className="flex-1 h-px bg-slate-700"></div>
                            </div>
                        )}

                        {/* Fellowship Number Input Section */}
                        {!scanning && status === 'idle' && !showConfirmation && (
                            <div className="mb-6">
                                <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                                    <Hash size={18} className="text-teal-400" />
                                    Enter Fellowship Number
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={fellowshipNumber}
                                        onChange={(e) => setFellowshipNumber(e.target.value.toUpperCase())}
                                        placeholder="AAA001"
                                        maxLength={6}
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border-2 border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-lg tracking-wider"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && fellowshipNumber.length === 6) {
                                                handleFellowshipLookup();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleFellowshipLookup}
                                        disabled={fellowshipNumber.length !== 6 || fellowshipLookupLoading}
                                        className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
                                    >
                                        {fellowshipLookupLoading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>Checking...</span>
                                            </>
                                        ) : (
                                            <>
                                                <User size={18} />
                                                <span>Check In</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-slate-500 text-xs mt-2">
                                    Enter the 6-character fellowship number (e.g., AAA001)
                                </p>
                            </div>
                        )}

                        {/* Loading State */}
                        {status === 'loading' && (
                            <div className="bg-blue-600/20 border-2 border-blue-500 rounded-xl p-6 flex items-center gap-4 animate-slide-up">
                                <Loader2 className="text-blue-400 animate-spin" size={32} />
                                <div>
                                    <p className="text-blue-100 font-semibold text-lg">Processing Check-in...</p>
                                    <p className="text-blue-200 text-sm mt-1">Please wait a moment</p>
                                </div>
                            </div>
                        )}

                        {/* Success State */}
                        {status === 'success' && memberData && (
                            <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-6 animate-slide-up relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                        <CheckCircle className="text-green-400" size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-green-100 font-bold text-xl mb-1">{message}</p>
                                        <div className="mt-3 p-4 bg-green-950/30 rounded-lg border border-green-600/30 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-green-400" />
                                                <span className="text-green-200 text-sm font-semibold">Member Details:</span>
                                            </div>
                                            <div className="ml-6 space-y-1">
                                                <p className="text-green-100 font-medium">{memberData.fullName}</p>
                                                <p className="text-green-200 text-sm">Fellowship: {memberData.fellowshipNumber}</p>
                                                <p className="text-green-200 text-sm">Region: {memberData.region.name}</p>
                                                <p className="text-green-200 text-sm">Phone: {memberData.phoneNumber}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {status === 'error' && (
                            <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-6 animate-slide-up relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                        <XCircle className="text-red-400" size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-red-100 font-bold text-xl mb-1">{message}</p>
                                        <p className="text-red-200 text-sm mb-4">Please try again or contact an administrator</p>
                                        <button
                                            onClick={handleRetry}
                                            className="px-5 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <RefreshCw size={18} />
                                            <span>Try Again</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Instructions */}
                        {!scanning && status === 'idle' && !result && !permissionDenied && !showConfirmation && (
                            <div className="mt-6 p-6 bg-teal-600/10 rounded-xl border-2 border-teal-600/30 relative">
                                <div className="absolute -top-3 left-4 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                                    HOW IT WORKS
                                </div>
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <p className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                                            <Scan size={16} />
                                            QR Code Check-in:
                                        </p>
                                        <ol className="text-slate-300 space-y-1 list-none ml-6 text-sm">
                                            <li>• Click "Start QR Scanner"</li>
                                            <li>• Allow camera access</li>
                                            <li>• Position QR code within the box</li>
                                            <li>• Automatic check-in</li>
                                        </ol>
                                    </div>
                                    <div>
                                        <p className="text-indigo-300 font-semibold mb-2 flex items-center gap-2">
                                            <Hash size={16} />
                                            Fellowship Number Check-in:
                                        </p>
                                        <ol className="text-slate-300 space-y-1 list-none ml-6 text-sm">
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
    );
};

export default CheckIn;
