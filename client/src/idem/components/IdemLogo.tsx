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
            {/* Background Container */}
            <rect width="100" height="100" rx="28" fill="#0A0A0A" />
            
            <defs>
                <linearGradient id="grad_purple" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#A78BFA" /> {/* Light Purple */}
                    <stop offset="100%" stopColor="#6366F1" /> {/* Indigo */}
                </linearGradient>
                
                <linearGradient id="grad_teal" x1="20" y1="80" x2="80" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" /> {/* Cyan */}
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.8" /> {/* Sky Blue */}
                </linearGradient>

                 <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* The Teal Chevron (Inverted V) - Bottom Layer */}
            <path
                d="M28 72 L50 42 L72 72"
                stroke="url(#grad_teal)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ mixBlendMode: 'screen' }} 
            />

            {/* The Purple M - Top Layer */}
            <path
                d="M28 72 L28 28 L50 52 L72 28 L72 72"
                stroke="url(#grad_purple)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            
             {/* Intersection Overlay (Optional for blend effect) */}
             {/* We can simulate the intersection blend by redrawing the chevron segment with transparency if needed, 
                 but the simple overlap might be enough. 
                 Let's try to match the image: The teal line crosses the purple line.
                 In the image, the teal line seems to be 'behind' the vertical legs but 'intersects' the V.
                 Actually, looking closely at the user image:
                 The teal line starts from the bottom corners (same as M).
                 It goes UP to the center.
                 It is transparent/blended.
                 
                 Let's stick to the current pathing.
             */}
        </svg>
    );
};
