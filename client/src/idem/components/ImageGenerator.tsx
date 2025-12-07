
import React, { useState } from 'react';
import { ImageAspect, UGCPromptCard } from '../types';
import { generateUGCPrompts } from '../services/geminiService';

interface ImageGeneratorProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const CARD_COLORS = [
    { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)', subtleBorder: 'rgba(99, 102, 241, 0.15)', accent: '#818cf8', label: '#a5b4fc', glow: 'rgba(99, 102, 241, 0.15)' },
    { bg: 'rgba(244, 63, 94, 0.1)', border: 'rgba(244, 63, 94, 0.3)', subtleBorder: 'rgba(244, 63, 94, 0.15)', accent: '#fb7185', label: '#fda4af', glow: 'rgba(244, 63, 94, 0.15)' },
    { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', subtleBorder: 'rgba(16, 185, 129, 0.15)', accent: '#34d399', label: '#6ee7b7', glow: 'rgba(16, 185, 129, 0.15)' },
    { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', subtleBorder: 'rgba(245, 158, 11, 0.15)', accent: '#fbbf24', label: '#fcd34d', glow: 'rgba(245, 158, 11, 0.15)' },
    { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)', subtleBorder: 'rgba(6, 182, 212, 0.15)', accent: '#22d3ee', label: '#67e8f9', glow: 'rgba(6, 182, 212, 0.15)' },
    { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', subtleBorder: 'rgba(168, 85, 247, 0.15)', accent: '#a78bfa', label: '#c4b5fd', glow: 'rgba(168, 85, 247, 0.15)' },
    { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.3)', subtleBorder: 'rgba(236, 72, 153, 0.15)', accent: '#f472b6', label: '#f9a8d4', glow: 'rgba(236, 72, 153, 0.15)' },
    { bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.3)', subtleBorder: 'rgba(20, 184, 166, 0.15)', accent: '#2dd4bf', label: '#5eead4', glow: 'rgba(20, 184, 166, 0.15)' },
];

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ identityImages }) => {
    const [textPrompt, setTextPrompt] = useState('');
    const [promptCount, setPromptCount] = useState(5);
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('9:16');
    const [generatedPrompts, setGeneratedPrompts] = useState<UGCPromptCard[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

    const handleGeneratePrompts = async () => {
        if (!textPrompt.trim()) {
            setError("Please describe the type of content you want to create.");
            return;
        }
        
        const apiKey = sessionStorage.getItem("gemini_api_key");
        if (!apiKey) {
            setError("Please enter your Gemini API key in Tab 1 first.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        setGeneratedPrompts([]);
        setCopiedIds(new Set());
        
        try {
            const prompts = await generateUGCPrompts({
                contentDescription: textPrompt,
                count: promptCount,
                aspectRatio: aspectRatio
            });
            
            setGeneratedPrompts(prompts);
            
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate prompts");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyPrompt = async (prompt: UGCPromptCard) => {
        await navigator.clipboard.writeText(prompt.fullPrompt);
        setCopiedIds(prev => new Set(prev).add(prompt.id));
    };

    const getCardColor = (index: number) => CARD_COLORS[index % CARD_COLORS.length];

    const hasIdentity = identityImages?.headshot || identityImages?.bodyshot;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '95%',
            margin: '0 auto',
            width: '100%',
            paddingTop: '1rem'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', background: '#eab308', borderRadius: '50%' }} />
                <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#eab308' }}>Social Media / UGC</h2>
            </div>

            {/* Top Control Bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: hasIdentity ? 'auto 1fr auto auto' : '1fr auto auto',
                gap: '1rem',
                background: 'rgba(24, 26, 31, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                alignItems: 'stretch'
            }}>
                {/* Identity Images Panel */}
                {hasIdentity && (
                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        background: 'rgba(34, 197, 94, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        alignItems: 'center'
                    }}>
                        {identityImages?.headshot && (
                            <div style={{ position: 'relative' }}>
                                <img 
                                    src={identityImages.headshot}
                                    alt="Headshot"
                                    data-testid="img-identity-headshot"
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '2px solid rgba(34, 197, 94, 0.4)'
                                    }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    bottom: '-4px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '0.5rem',
                                    background: 'rgba(34, 197, 94, 0.9)',
                                    color: 'white',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>Head</span>
                            </div>
                        )}
                        {identityImages?.bodyshot && (
                            <div style={{ position: 'relative' }}>
                                <img 
                                    src={identityImages.bodyshot}
                                    alt="Bodyshot"
                                    data-testid="img-identity-bodyshot"
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '2px solid rgba(34, 197, 94, 0.4)'
                                    }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    bottom: '-4px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '0.5rem',
                                    background: 'rgba(34, 197, 94, 0.9)',
                                    color: 'white',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>Body</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Prompt Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                    <label style={{
                        fontSize: '0.6rem',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        color: '#94a3b8',
                        letterSpacing: '0.05em'
                    }}>Describe Your Content</label>
                    <textarea
                        data-testid="input-social-prompt"
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder="Day in the life content, outfit posts, coffee shop aesthetic, gym selfies..."
                        style={{
                            width: '100%',
                            minHeight: '60px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            fontSize: '0.85rem',
                            color: 'white',
                            resize: 'none',
                            outline: 'none',
                            lineHeight: '1.4'
                        }}
                    />
                </div>

                {/* Settings Group */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    minWidth: '200px'
                }}>
                    {/* Prompt Count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', minWidth: '50px' }}>Count</label>
                        <input
                            type="range"
                            data-testid="slider-prompt-count"
                            min={1}
                            max={25}
                            value={promptCount}
                            onChange={(e) => setPromptCount(parseInt(e.target.value))}
                            style={{
                                flex: 1,
                                height: '6px',
                                borderRadius: '3px',
                                background: `linear-gradient(to right, #eab308 0%, #eab308 ${((promptCount - 1) / 24) * 100}%, rgba(255,255,255,0.1) ${((promptCount - 1) / 24) * 100}%, rgba(255,255,255,0.1) 100%)`,
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        />
                        <span style={{ 
                            fontSize: '1rem', 
                            fontWeight: 'bold', 
                            color: '#fde047',
                            minWidth: '2rem',
                            textAlign: 'right'
                        }}>
                            {promptCount}
                        </span>
                    </div>

                    {/* Aspect Ratio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', minWidth: '50px' }}>Ratio</label>
                        <select
                            data-testid="select-social-aspect-ratio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                            style={{
                                flex: 1,
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                background: '#1a1d23',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                color: '#e5e7eb',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                outline: 'none'
                            }}
                        >
                            <option value="9:16">9:16 Stories</option>
                            <option value="1:1">1:1 Square</option>
                            <option value="4:5">4:5 Portrait</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>

                    {/* Identity Status (if no images) */}
                    {!hasIdentity && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(107, 114, 128, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(107, 114, 128, 0.2)'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                <circle cx="12" cy="8" r="5" />
                                <path d="M20 21a8 8 0 1 0-16 0" />
                            </svg>
                            <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>No identity - create in Tab 1</span>
                        </div>
                    )}
                </div>

                {/* Generate Button */}
                <button
                    data-testid="button-generate-social"
                    onClick={handleGeneratePrompts}
                    disabled={isGenerating || !textPrompt.trim()}
                    style={{
                        padding: '1rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: (isGenerating || !textPrompt.trim()) ? '#374151' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                        color: (isGenerating || !textPrompt.trim()) ? '#9ca3af' : 'black',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: (isGenerating || !textPrompt.trim()) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: !textPrompt.trim() ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        alignSelf: 'stretch'
                    }}
                >
                    {isGenerating ? (
                        <>
                            <div style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid rgba(0,0,0,0.3)',
                                borderTopColor: 'black',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Generate
                        </>
                    )}
                </button>
            </div>

            {/* Error Message */}
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

            {/* Output Section */}
            <div style={{
                background: 'rgba(24, 26, 31, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Output Header */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e5e7eb', margin: 0 }}>
                        Output
                    </h2>
                    {generatedPrompts.length > 0 && (
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                            {generatedPrompts.length} prompts generated • {copiedIds.size} copied
                        </span>
                    )}
                </div>

                {/* Content Area */}
                {!generatedPrompts.length && !isGenerating ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                        textAlign: 'center',
                        padding: '2rem'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'rgba(234, 179, 8, 0.1)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.5">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                        </div>
                        <p style={{ fontSize: '0.9rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.25rem' }}>
                            Ready to Create UGC Prompts
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            Describe your content above and click Generate
                        </p>
                    </div>
                ) : isGenerating ? (
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
                        <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Creating {promptCount} UGC prompts...</p>
                    </div>
                ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                        gap: '1rem',
                        maxHeight: '60vh',
                        overflow: 'auto',
                        paddingRight: '0.5rem'
                    }}>
                        {generatedPrompts.map((prompt, index) => {
                            const color = getCardColor(index);
                            const isCopied = copiedIds.has(prompt.id);
                            
                            return (
                                <div 
                                    key={prompt.id}
                                    data-testid={`prompt-card-${index}`}
                                    style={{
                                        background: color.bg,
                                        borderRadius: '12px',
                                        border: `1px solid ${color.border}`,
                                        overflow: 'hidden',
                                        transition: 'all 0.3s',
                                        boxShadow: isCopied ? `0 0 20px ${color.glow}` : 'none'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem 1rem',
                                        background: `linear-gradient(135deg, ${color.bg}, rgba(0,0,0,0.3))`,
                                        borderBottom: `1px solid ${color.border}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: color.bg,
                                                border: `1px solid ${color.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: color.accent,
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {index + 1}
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                fontWeight: 'bold', 
                                                color: isCopied ? color.label : color.accent, 
                                                textTransform: 'uppercase', 
                                                letterSpacing: '0.05em' 
                                            }}>
                                                {isCopied ? 'Copied' : 'Prompt'}
                                            </span>
                                        </div>
                                        <button
                                            data-testid={`button-copy-prompt-${index}`}
                                            onClick={() => handleCopyPrompt(prompt)}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '6px',
                                                border: `1px solid ${color.border}`,
                                                background: isCopied ? color.bg : 'rgba(255,255,255,0.05)',
                                                color: color.accent,
                                                fontSize: '0.7rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isCopied ? (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {/* Card Content */}
                                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {/* Scenario - Main highlight */}
                                        <div style={{
                                            background: `linear-gradient(135deg, ${color.bg}, rgba(0,0,0,0.2))`,
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            border: `1px solid ${color.border}`
                                        }}>
                                            <span style={{ fontSize: '0.65rem', color: color.accent, fontWeight: '600', textTransform: 'uppercase' }}>Scenario</span>
                                            <p style={{ fontSize: '0.85rem', color: '#e5e7eb', margin: '0.25rem 0 0 0', lineHeight: '1.4' }}>{prompt.scenario}</p>
                                        </div>
                                        
                                        {/* Details Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.2)', 
                                                borderRadius: '6px', 
                                                padding: '0.5rem 0.75rem',
                                                border: `1px solid ${color.subtleBorder}`
                                            }}>
                                                <span style={{ fontSize: '0.6rem', color: color.label, fontWeight: '600', textTransform: 'uppercase' }}>Setting</span>
                                                <p style={{ fontSize: '0.75rem', color: '#c4c4c4', margin: '0.2rem 0 0 0' }}>{prompt.setting}</p>
                                            </div>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.2)', 
                                                borderRadius: '6px', 
                                                padding: '0.5rem 0.75rem',
                                                border: `1px solid ${color.subtleBorder}`
                                            }}>
                                                <span style={{ fontSize: '0.6rem', color: color.label, fontWeight: '600', textTransform: 'uppercase' }}>Outfit</span>
                                                <p style={{ fontSize: '0.75rem', color: '#c4c4c4', margin: '0.2rem 0 0 0' }}>{prompt.outfit}</p>
                                            </div>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.2)', 
                                                borderRadius: '6px', 
                                                padding: '0.5rem 0.75rem',
                                                border: `1px solid ${color.subtleBorder}`
                                            }}>
                                                <span style={{ fontSize: '0.6rem', color: color.label, fontWeight: '600', textTransform: 'uppercase' }}>Pose</span>
                                                <p style={{ fontSize: '0.75rem', color: '#c4c4c4', margin: '0.2rem 0 0 0' }}>{prompt.pose}</p>
                                            </div>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.2)', 
                                                borderRadius: '6px', 
                                                padding: '0.5rem 0.75rem',
                                                border: `1px solid ${color.subtleBorder}`
                                            }}>
                                                <span style={{ fontSize: '0.6rem', color: color.label, fontWeight: '600', textTransform: 'uppercase' }}>Lighting</span>
                                                <p style={{ fontSize: '0.75rem', color: '#c4c4c4', margin: '0.2rem 0 0 0' }}>{prompt.lighting}</p>
                                            </div>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.2)', 
                                                borderRadius: '6px', 
                                                padding: '0.5rem 0.75rem',
                                                border: `1px solid ${color.subtleBorder}`
                                            }}>
                                                <span style={{ fontSize: '0.6rem', color: color.label, fontWeight: '600', textTransform: 'uppercase' }}>Camera</span>
                                                <p style={{ fontSize: '0.75rem', color: '#c4c4c4', margin: '0.2rem 0 0 0' }}>{prompt.camera}</p>
                                            </div>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.2)', 
                                                borderRadius: '6px', 
                                                padding: '0.5rem 0.75rem',
                                                border: `1px solid ${color.subtleBorder}`
                                            }}>
                                                <span style={{ fontSize: '0.6rem', color: color.label, fontWeight: '600', textTransform: 'uppercase' }}>Imperfections</span>
                                                <p style={{ fontSize: '0.75rem', color: '#c4c4c4', margin: '0.2rem 0 0 0' }}>{prompt.imperfections}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageGenerator;
