import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const Toast = ({ id, type, message, duration = 4000, onClose }: ToastProps) => {
    const [progress, setProgress] = useState(100);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev - (100 / (duration / 50));
                if (newProgress <= 0) {
                    clearInterval(interval);
                    handleClose();
                    return 0;
                }
                return newProgress;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
    };

    const icons = {
        success: <CheckCircle className="w-6 h-6" />,
        error: <XCircle className="w-6 h-6" />,
        warning: <AlertTriangle className="w-6 h-6" />,
        info: <Info className="w-6 h-6" />,
    };

    // Standard light theme styling
    const styles = {
        success: 'bg-white border-green-200 text-slate-800 shadow-xl shadow-green-100',
        error: 'bg-white border-red-200 text-slate-800 shadow-xl shadow-red-100',
        warning: 'bg-white border-yellow-200 text-slate-800 shadow-xl shadow-yellow-100',
        info: 'bg-white border-blue-200 text-slate-800 shadow-xl shadow-blue-100',
    };

    const iconBgStyles = {
        success: 'bg-green-50 text-green-600',
        error: 'bg-red-50 text-red-600',
        warning: 'bg-yellow-50 text-yellow-600',
        info: 'bg-blue-50 text-blue-600',
    };

    const progressStyles = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    };

    const topBarStyles = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    };

    return (
        <div
            className={`
                pointer-events-auto max-w-md w-full rounded-xl border-2 shadow-2xl overflow-hidden
                transition-all duration-300 ease-out
                ${styles[type]}
                ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
            `}
            role="alert"
            aria-live="polite"
        >
            {/* Top accent bar */}
            <div className={`h-1 w-full ${topBarStyles[type]}`}></div>

            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Icon with glassmorphic background */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBgStyles[type]}`}>
                        {icons[type]}
                    </div>

                    {/* Message */}
                    <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-semibold leading-relaxed">{message}</p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-1 hover:bg-slate-100 rounded-full p-1"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-50 linear ${progressStyles[type]}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Toast;
