import React from 'react';
import { Lock, X } from 'lucide-react';

interface TagBadgeProps {
    tag: {
        id: string;
        name: string;
        color: string;
        type: 'SYSTEM' | 'CUSTOM';
        isSystem: boolean;
    };
    size?: 'sm' | 'md' | 'lg';
    onRemove?: () => void;
    showIcon?: boolean;
}

const TagBadge: React.FC<TagBadgeProps> = ({
    tag,
    size = 'md',
    onRemove,
    showIcon = true
}) => {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
    };

    const iconSizes = {
        sm: 12,
        md: 14,
        lg: 16,
    };

    // System tags: solid border + lock icon
    // Custom tags: dotted border
    const borderStyle = tag.isSystem || tag.type === 'SYSTEM'
        ? 'border-2'
        : 'border-2 border-dashed';

    return (
        <span
            className={`
                inline-flex items-center gap-1.5 rounded-full
                ${borderStyle}
                ${sizeClasses[size]}
                font-medium transition-all
            `}
            style={{
                backgroundColor: `${tag.color}20`,
                borderColor: tag.color,
                color: tag.color,
            }}
        >
            {showIcon && tag.isSystem && (
                <Lock size={iconSizes[size]} className="flex-shrink-0" />
            )}
            <span className="truncate">{tag.name}</span>
            {onRemove && !tag.isSystem && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                    aria-label="Remove tag"
                >
                    <X size={iconSizes[size]} />
                </button>
            )}
        </span>
    );
};

export default TagBadge;
