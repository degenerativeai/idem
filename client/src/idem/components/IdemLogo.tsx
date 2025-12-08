import React from 'react';

interface IdemLogoProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number | string;
    height?: number | string;
}

export const IdemLogo: React.FC<IdemLogoProps> = ({ className, style, width = 32, height = 32 }) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
        >
            <defs>
                <linearGradient id="idem_grad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Main Central Diamond/Prism Shape - Abstract, not a letter */}
            <path
                d="M50 5 L95 50 L50 95 L5 50 Z"
                fill="url(#idem_grad)"
                opacity="0.2"
            />

            {/* Internal Geometry - "The Core" */}
            <path
                d="M50 20 L80 50 L50 80 L20 50 Z"
                stroke="url(#idem_grad)"
                strokeWidth="6"
                strokeLinejoin="round"
                filter="url(#glow)"
            />

            {/* Center Spark */}
            <circle cx="50" cy="50" r="8" fill="#e9d5ff" />
        </svg>
    );
};
