
import React, { useState } from 'react';
import { ImageAspect, ImageProvider } from '../types';

interface ImageGeneratorProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ identityImages }) => {
    const [styleMode, setStyleMode] = useState<'candid' | 'studio'>('candid');
    const [textPrompt, setTextPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [provider, setProvider] = useState<ImageProvider>('google');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('9:16');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateImage = async () => {
        if (!textPrompt.trim()) {
            setError("Please enter a prompt description first.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const apiKey = sessionStorage.getItem('gemini_api_key');
            if (!apiKey) throw new Error("API key not found");
            
            const referenceImages: string[] = [];
            if (identityImages?.headshot) {
                referenceImages.push(identityImages.headshot);
            }
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
            
            const stylePrefix = styleMode === 'studio' 
                ? 'Professional studio photography, polished and elegant. ' 
                : 'Candid amateur photo style, authentic and natural. ';
            
            const fullPrompt = stylePrefix + textPrompt;
            
            const parts: any[] = [{ text: fullPrompt }];
            referenceImages.forEach(img => {
                const mimeMatch = img.match(/^data:([^;]+);base64,/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                const b64 = img.includes('base64,') ? img.split('base64,')[1] : img;
                parts.push({ inlineData: { mimeType, data: b64 } });
            });
            
            const payload = {
                contents: [{ parts }],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"]
                }
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Generation failed: ${errText}`);
            }
            
            const data = await response.json();
            const cand = data.candidates?.[0];
            
            if (cand?.content?.parts) {
                for (const part of cand.content.parts) {
                    if (part.inlineData?.data) {
                        setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
                        return;
                    }
                }
            }
            
            throw new Error("No image in response");
            
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate image");
        } finally {
            setIsGenerating(false);
        }
    };

    const panelStyle: React.CSSProperties = {
        background: 'rgba(24, 26, 31, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex', flexDirection: 'column', gap: '1rem'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: '0.4rem',
        display: 'block',
        letterSpacing: '0.05em'
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2rem',
            maxWidth: '95%',
            margin: '0 auto',
            width: '100%',
            alignItems: 'start',
            paddingTop: '1rem'
        }}>
            <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', background: '#eab308', borderRadius: '50%' }} />
                    <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#eab308' }}>Social Media / UGC</h2>
                </div>

                <div style={panelStyle}>
                    <label style={labelStyle}>Describe Your Scene</label>
                    <textarea
                        data-testid="input-social-prompt"
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder="Describe the vibe, outfit, scene, and mood you want...

Example: 'Influencer in cozy fall outfit holding coffee at a trendy cafe, warm lighting, instagram aesthetic'"
                        style={{
                            width: '100%',
                            minHeight: '180px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            fontSize: '0.85rem',
                            color: 'white',
                            resize: 'vertical',
                            outline: 'none',
                            lineHeight: '1.5'
                        }}
                    />
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(234, 179, 8, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e5e7eb', margin: 0 }}>
                                    Style Mode
                                </p>
                                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
                                    {styleMode === 'candid' ? 'Amateur / Candid' : 'Studio / Professional'}
                                </p>
                            </div>
                        </div>
                        <button
                            data-testid="toggle-social-style"
                            onClick={() => setStyleMode(s => s === 'candid' ? 'studio' : 'candid')}
                            style={{
                                width: '48px',
                                height: '26px',
                                borderRadius: '13px',
                                background: styleMode === 'studio' ? '#eab308' : '#374151',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: styleMode === 'studio' ? '25px' : '3px',
                                transition: 'left 0.2s'
                            }} />
                        </button>
                    </div>
                </div>

                <div style={panelStyle}>
                    <label style={labelStyle}>Aspect Ratio</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {(['9:16', '1:1', '16:9', '4:3', '3:4'] as ImageAspect[]).map((ratio) => (
                            <button
                                key={ratio}
                                data-testid={`aspect-${ratio.replace(':', '-')}`}
                                onClick={() => setAspectRatio(ratio)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: aspectRatio === ratio ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                                    background: aspectRatio === ratio ? 'rgba(234, 179, 8, 0.15)' : 'rgba(0,0,0,0.2)',
                                    color: aspectRatio === ratio ? '#fde047' : '#9ca3af',
                                    fontSize: '0.75rem',
                                    fontWeight: aspectRatio === ratio ? '600' : '400',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: identityImages?.headshot ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={identityImages?.headshot ? '#22c55e' : '#6b7280'} strokeWidth="2">
                                <circle cx="12" cy="8" r="5" />
                                <path d="M20 21a8 8 0 1 0-16 0" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e5e7eb', margin: 0 }}>
                                Identity Reference
                            </p>
                            <p style={{ fontSize: '0.7rem', color: identityImages?.headshot ? '#86efac' : '#9ca3af', margin: 0 }}>
                                {identityImages?.headshot ? 'Using identity from Tab 1' : 'No identity loaded - create one in Tab 1'}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    data-testid="button-generate-social"
                    onClick={handleGenerateImage}
                    disabled={isGenerating || !textPrompt.trim()}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: (isGenerating || !textPrompt.trim()) ? '#374151' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                        color: (isGenerating || !textPrompt.trim()) ? '#9ca3af' : 'black',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: (isGenerating || !textPrompt.trim()) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: !textPrompt.trim() ? 0.5 : 1
                    }}
                >
                    {isGenerating ? (
                        <>
                            <div style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(0,0,0,0.3)',
                                borderTopColor: 'black',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Generate Image
                        </>
                    )}
                </button>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5',
                        fontSize: '0.8rem'
                    }}>
                        {error}
                    </div>
                )}
            </div>

            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#e5e7eb', margin: 0 }}>
                            Output
                        </h2>
                        {generatedImage && (
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                                Ready to download
                            </span>
                        )}
                    </div>
                </div>

                <div style={{
                    ...panelStyle,
                    minHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {!generatedImage && !isGenerating ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            textAlign: 'center',
                            padding: '3rem'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: 'rgba(234, 179, 8, 0.1)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8" cy="8" r="2" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                            </div>
                            <p style={{ fontSize: '1rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                Ready to Create
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', maxWidth: '300px' }}>
                                Describe the scene you want and click Generate to create social media content.
                            </p>
                        </div>
                    ) : (
                        <>
                            {isGenerating && (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '1rem'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        border: '3px solid rgba(234, 179, 8, 0.2)',
                                        borderTopColor: '#eab308',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Creating your image...</p>
                                </div>
                            )}
                            
                            {generatedImage && (
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Generated Result</label>
                                    <div style={{
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(234, 179, 8, 0.3)'
                                    }}>
                                        <img 
                                            src={generatedImage} 
                                            alt="Generated social media content" 
                                            style={{ width: '100%', display: 'block' }}
                                            data-testid="img-social-result"
                                        />
                                    </div>
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '0.75rem', 
                                        marginTop: '1rem',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <button
                                            data-testid="button-regenerate-social"
                                            onClick={handleGenerateImage}
                                            disabled={isGenerating}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                background: 'rgba(107, 114, 128, 0.15)',
                                                border: '1px solid rgba(107, 114, 128, 0.3)',
                                                color: '#9ca3af',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M23 4v6h-6" />
                                                <path d="M1 20v-6h6" />
                                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                            </svg>
                                            Regenerate
                                        </button>
                                        <a
                                            href={generatedImage}
                                            download="social-media-image.png"
                                            data-testid="button-download-social"
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                background: 'rgba(234, 179, 8, 0.15)',
                                                color: '#fde047',
                                                fontSize: '0.8rem',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            Download
                                        </a>
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

export default ImageGenerator;
