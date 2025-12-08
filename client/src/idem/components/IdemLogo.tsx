import React from 'react';

interface IdemLogoProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number | string;
    height?: number | string;
}

export const IdemLogo: React.FC<IdemLogoProps> = ({ className, style, width = 32, height = 32 }) => {
    return (
        <img
            src="/logo.png"
            alt="Idem Logo"
            width={width}
            height={height}
            className={className}
            style={{
                objectFit: 'contain',
                borderRadius: '22%', // Matches the visual style of the icon
                ...style
            }}
        />
    );
};
