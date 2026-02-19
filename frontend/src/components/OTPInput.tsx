import React, { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OTPInputProps {
    length?: number;
    onComplete: (otp: string) => void;
    loading?: boolean;
    isError?: boolean;
    isSuccess?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, onComplete, loading = false, isError = false, isSuccess = false }) => {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Call onComplete when all digits are entered
        if (newOtp.every((digit) => digit !== '')) {
            onComplete(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                // If current input is empty, move to previous and clear it
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                inputRefs.current[index - 1]?.focus();
            } else {
                // Clear current input
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }

        // Handle arrow keys
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain').trim();

        // Only process if it's all digits
        if (!/^\d+$/.test(pastedData)) return;

        const digits = pastedData.slice(0, length).split('');
        const newOtp = [...otp];

        digits.forEach((digit, index) => {
            if (index < length) {
                newOtp[index] = digit;
            }
        });

        setOtp(newOtp);

        // Focus last filled input or next empty input
        const lastFilledIndex = Math.min(digits.length - 1, length - 1);
        inputRefs.current[lastFilledIndex]?.focus();

        // Call onComplete if all filled
        if (newOtp.every((digit) => digit !== '')) {
            onComplete(newOtp.join(''));
        }
    };

    return (
        <div className="flex gap-2 justify-center mb-6">
            {otp.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={loading}
                    className={`w-8 h-10 text-center text-lg font-bold bg-slate-50 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        ${isError ? 'text-red-500' : 'text-slate-900'} 
                        ${isError
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : isSuccess
                                ? 'border-[#48A111] focus:border-[#48A111] focus:ring-[#48A111]/20'
                                : digit
                                    ? 'border-[#F2B50B] focus:border-[#F2B50B] focus:ring-[#F2B50B]/20'
                                    : 'border-slate-200 focus:border-[#48A111] focus:ring-[#48A111]/20'}
                    `}
                    autoComplete="off"
                    autoFocus={index === 0}
                />
            ))}
        </div>
    );
};

export default OTPInput;
