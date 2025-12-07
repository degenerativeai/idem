
import React, { useState } from 'react';
import { ImageAspect } from '../types';

interface PromptCard {
    id: string;
    scenario: string;
    setting: string;
    outfit: string;
    pose: string;
    lighting: string;
    camera: string;
    imperfections: string;
    fullPrompt: string;
}

interface ImageGeneratorProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ identityImages }) => {
    const [textPrompt, setTextPrompt] = useState('');
    const [promptCount, setPromptCount] = useState(5);
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('9:16');
    const [generatedPrompts, setGeneratedPrompts] = useState<PromptCard[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleGeneratePrompts = async () => {
        if (!textPrompt.trim()) {
            setError("Please describe the type of content you want to create.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        setGeneratedPrompts([]);
        
        try {
            // TODO: Replace with actual prompt generation using user's directive
            // For now, show placeholder to demonstrate the UI
            const placeholders: PromptCard[] = [];
            for (let i = 0; i < promptCount; i++) {
                placeholders.push({
                    id: `prompt-${i}`,
                    scenario: `Scenario ${i + 1} based on: ${textPrompt}`,
                    setting: 'Awaiting directive implementation',
                    outfit: 'Awaiting directive implementation',
                    pose: 'Awaiting directive implementation',
                    lighting: 'Awaiting directive implementation',
                    camera: 'Awaiting directive implementation',
                    imperfections: 'Awaiting directive implementation',
                    fullPrompt: `[Placeholder] Generate ${promptCount} UGC prompts for: ${textPrompt}`
                });
            }
            
            // Simulate generation delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            setGeneratedPrompts(placeholders);
            
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate prompts");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyPrompt = async (prompt: PromptCard) => {
        await navigator.clipboard.writeText(prompt.fullPrompt);
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
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
                    <label style={labelStyle}>Describe Your Content</label>
                    <textarea
                        data-testid="input-social-prompt"
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder="What type of UGC content do you want to create?

Examples:
• Day in the life content for a fitness influencer
• Outfit of the day posts for fall fashion
• Coffee shop aesthetic moments
• Museum and art gallery visits
• Morning routine content"
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
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
                                    <line x1="4" y1="21" x2="4" y2="14" />
                                    <line x1="4" y1="10" x2="4" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12" y2="3" />
                                    <line x1="20" y1="21" x2="20" y2="16" />
                                    <line x1="20" y1="12" x2="20" y2="3" />
                                    <line x1="1" y1="14" x2="7" y2="14" />
                                    <line x1="9" y1="8" x2="15" y2="8" />
                                    <line x1="17" y1="16" x2="23" y2="16" />
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e5e7eb', margin: 0 }}>
                                    Number of Prompts
                                </p>
                                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
                                    Generate {promptCount} unique prompts
                                </p>
                            </div>
                        </div>
                        <span style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: 'bold', 
                            color: '#fde047',
                            minWidth: '2rem',
                            textAlign: 'right'
                        }}>
                            {promptCount}
                        </span>
                    </div>
                    <input
                        type="range"
                        data-testid="slider-prompt-count"
                        min={1}
                        max={25}
                        value={promptCount}
                        onChange={(e) => setPromptCount(parseInt(e.target.value))}
                        style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            background: `linear-gradient(to right, #eab308 0%, #eab308 ${((promptCount - 1) / 24) * 100}%, rgba(255,255,255,0.1) ${((promptCount - 1) / 24) * 100}%, rgba(255,255,255,0.1) 100%)`,
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#6b7280' }}>
                        <span>1</span>
                        <span>25</span>
                    </div>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Aspect Ratio</label>
                        <select
                            data-testid="select-social-aspect-ratio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: '#1a1d23',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                color: '#e5e7eb',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                outline: 'none',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23eab308' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.75rem center',
                                paddingRight: '2.5rem'
                            }}
                        >
                            <option value="9:16" style={{ background: '#1a1d23', color: '#e5e7eb' }}>9:16 (Stories)</option>
                            <option value="1:1" style={{ background: '#1a1d23', color: '#e5e7eb' }}>1:1 (Square)</option>
                            <option value="4:5" style={{ background: '#1a1d23', color: '#e5e7eb' }}>4:5 (Portrait)</option>
                            <option value="16:9" style={{ background: '#1a1d23', color: '#e5e7eb' }}>16:9 (Landscape)</option>
                            <option value="4:3" style={{ background: '#1a1d23', color: '#e5e7eb' }}>4:3</option>
                            <option value="3:4" style={{ background: '#1a1d23', color: '#e5e7eb' }}>3:4</option>
                        </select>
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
                    onClick={handleGeneratePrompts}
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
                            Generating {promptCount} Prompts...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Generate Prompts
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
                        {generatedPrompts.length > 0 && (
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                                {generatedPrompts.length} prompts generated
                            </span>
                        )}
                    </div>
                </div>

                <div style={{
                    ...panelStyle,
                    minHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '80vh',
                    overflow: 'auto'
                }}>
                    {!generatedPrompts.length && !isGenerating ? (
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
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <line x1="10" y1="9" x2="8" y2="9" />
                                </svg>
                            </div>
                            <p style={{ fontSize: '1rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                Ready to Create UGC Prompts
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', maxWidth: '300px' }}>
                                Describe the type of content you want and set the number of prompts to generate.
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
                                    <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Creating {promptCount} UGC prompts...</p>
                                </div>
                            )}
                            
                            {generatedPrompts.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {generatedPrompts.map((prompt, index) => (
                                        <div 
                                            key={prompt.id}
                                            data-testid={`prompt-card-${index}`}
                                            style={{
                                                background: copiedId === prompt.id ? 'rgba(234, 179, 8, 0.05)' : 'rgba(0,0,0,0.4)',
                                                borderRadius: '12px',
                                                border: copiedId === prompt.id ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                overflow: 'hidden',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem 1rem',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ 
                                                        fontSize: '0.7rem', 
                                                        fontWeight: 'bold', 
                                                        color: '#eab308', 
                                                        textTransform: 'uppercase', 
                                                        letterSpacing: '0.05em' 
                                                    }}>
                                                        Prompt {index + 1}
                                                    </span>
                                                </div>
                                                <button
                                                    data-testid={`button-copy-prompt-${index}`}
                                                    onClick={() => handleCopyPrompt(prompt)}
                                                    style={{
                                                        padding: copiedId === prompt.id ? '0.5rem 1rem' : '0.4rem 0.75rem',
                                                        borderRadius: '6px',
                                                        border: copiedId === prompt.id ? '2px solid #eab308' : 'none',
                                                        background: copiedId === prompt.id ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255,255,255,0.05)',
                                                        color: copiedId === prompt.id ? '#fde047' : '#9ca3af',
                                                        fontSize: copiedId === prompt.id ? '0.75rem' : '0.65rem',
                                                        fontWeight: copiedId === prompt.id ? '700' : '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {copiedId === prompt.id ? (
                                                        <>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </svg>
                                                            Copy
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            
                                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.65rem', color: '#eab308', fontWeight: '600', textTransform: 'uppercase' }}>Scenario</span>
                                                    <p style={{ fontSize: '0.85rem', color: '#e5e7eb', margin: '0.25rem 0 0 0' }}>{prompt.scenario}</p>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Setting</span>
                                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{prompt.setting}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Outfit</span>
                                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{prompt.outfit}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Pose</span>
                                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{prompt.pose}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Lighting</span>
                                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{prompt.lighting}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Camera</span>
                                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{prompt.camera}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Imperfections</span>
                                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>{prompt.imperfections}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
