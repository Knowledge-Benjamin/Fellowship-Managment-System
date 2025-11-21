import { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import api from '../api';
import { Scan, CheckCircle, XCircle, Square, Camera, Zap } from 'lucide-react';

const CheckIn = () => {
    const [result, setResult] = useState('');
    const [scanning, setScanning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleScan = async (data: any) => {
        if (data) {
            setResult(data?.text);
            setScanning(false);
            try {
                const serviceId = 'default-service-id';
                await api.post('/attendance/check-in', {
                    memberId: 'lookup-needed',
                    method: 'QR',
                    serviceId
                });
                setStatus('success');
                setMessage('Check-in Successful!');
                setTimeout(() => {
                    setStatus('idle');
                    setResult('');
                }, 3000);
            } catch (error) {
                console.error(error);
                setStatus('error');
                setMessage('Check-in Failed. Please try again.');
                setTimeout(() => setStatus('idle'), 3000);
            }
        }
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
                                <h2 className="text-3xl font-bold text-white">QR Check-in</h2>
                                <Zap className="text-teal-400" size={20} />
                            </div>
                            <p className="text-slate-400 text-sm">Scan your QR code to check in instantly</p>
                        </div>
                    </div>
                </div>

                {/* Scanner Control */}
                <div className="mb-6 relative z-10">
                    <button
                        onClick={() => setScanning(!scanning)}
                        className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 border-2 ${scanning
                            ? 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg'
                            : 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700 shadow-lg'
                            }`}
                    >
                        {scanning ? (
                            <>
                                <Square size={20} fill="currentColor" />
                                <span>Stop Scanner</span>
                            </>
                        ) : (
                            <>
                                <Camera size={20} />
                                <span>Start Scanner</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Scanner Window */}
                {scanning && (
                    <div className="mb-6 overflow-hidden rounded-xl border-4 border-teal-600 shadow-2xl animate-scale-in relative">
                        <div className="aspect-video bg-slate-900 relative">
                            <QrReader
                                onResult={(result, error) => {
                                    if (!!result) {
                                        handleScan(result);
                                    }
                                    if (!!error) {
                                        console.info(error);
                                    }
                                }}
                                constraints={{ facingMode: 'environment' }}
                                className="w-full h-full"
                            />
                            {/* Scanner overlay corners */}
                            <div className="absolute inset-4 pointer-events-none">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-400"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-400"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-400"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-400"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-5 flex items-start gap-3 animate-slide-up relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
                        <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={24} />
                        <div>
                            <p className="text-green-100 font-semibold text-lg">{message}</p>
                            <p className="text-green-200 text-sm mt-1">Welcome to the fellowship!</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-5 flex items-start gap-3 animate-slide-up relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
                        <XCircle className="text-red-400 shrink-0 mt-0.5" size={24} />
                        <div>
                            <p className="text-red-100 font-semibold text-lg">{message}</p>
                            <p className="text-red-200 text-sm mt-1">Please contact an administrator</p>
                        </div>
                    </div>
                )}

                {/* Last Scan Result */}
                {result && status === 'idle' && (
                    <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border-2 border-slate-700 relative">
                        <div className="absolute top-0 left-4 -mt-3 px-2 bg-[#151d30] text-slate-400 text-xs font-semibold">
                            LAST SCAN
                        </div>
                        <p className="text-white font-mono text-sm break-all pt-2">{result}</p>
                    </div>
                )}

                {/* Instructions */}
                {!scanning && status === 'idle' && (
                    <div className="mt-6 p-6 bg-teal-600/10 rounded-xl border-2 border-teal-600/30 relative">
                        <div className="absolute -top-3 left-4 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                            HOW IT WORKS
                        </div>
                        <ol className="text-slate-300 space-y-2.5 list-none pt-2">
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">1</span>
                                <span>Click "Start Scanner" to activate your device camera</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">2</span>
                                <span>Position your QR code within the scanning frame</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">3</span>
                                <span>Wait for automatic detection and confirmation</span>
                            </li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckIn;
