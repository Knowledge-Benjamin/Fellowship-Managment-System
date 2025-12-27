import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = 'Loading...'
}) => {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <Loader className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                <p className="text-gray-400">{message}</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
