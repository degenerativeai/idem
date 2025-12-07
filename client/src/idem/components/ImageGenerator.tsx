
import React, { useState, useRef } from 'react';
import { ImageAspect, UGCPromptCard } from '../types';
import { generateUGCPrompts } from '../services/geminiService';

interface ImageGeneratorProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
    onNavigateToTab?: (tab: number) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ identityImages, onNavigateToTab }) => {
    const [textPrompt, setTextPrompt] = useState('');
    const [promptCount, setPromptCount] = useState(5);
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('9:16');
    const [generatedPrompts, setGeneratedPrompts] = useState<UGCPromptCard[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
    
    const [localHeadshot, setLocalHeadshot] = useState<string | null>(null);
    const [localBodyshot, setLocalBodyshot] = useState<string | null>(null);
    
    const headInputRef = useRef<HTMLInputElement>(null);
    const bodyInputRef = useRef<HTMLInputElement>(null);

    const effectiveHeadshot = localHeadshot || identityImages?.headshot;
    const effectiveBodyshot = localBodyshot || identityImages?.bodyshot;
    const hasIdentity = effectiveHeadshot || effectiveBodyshot;

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'head' | 'body') => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await fileToBase64(file);
            if (type === 'head') setLocalHeadshot(base64);
            else setLocalBodyshot(base64);
        } catch (err) {
            console.error("Upload failed", err);
        }
    };

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

            {/* Top Control Bar - Compact Layout */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                background: 'rgba(24, 26, 31, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Left Side - Describe + Controls (matching reference height) */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    flex: 1,
                    padding: '1rem 1.25rem 1.25rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    {/* Describe Box - fills available space */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, marginBottom: '1rem' }}>
                        <label style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            color: '#94a3b8',
                            letterSpacing: '0.1em'
                        }}>Describe Your Content</label>
                        <textarea
                            data-testid="input-social-prompt"
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                            placeholder="Day in the life content, outfit posts, coffee shop aesthetic, gym selfies..."
                            style={{
                                width: '100%',
                                flex: 1,
                                minHeight: '180px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '1rem',
                                fontSize: '0.9rem',
                                color: 'white',
                                resize: 'none',
                                outline: 'none',
                                lineHeight: '1.5'
                            }}
                        />
                    </div>

                    {/* Controls Row - Count, Ratio, Generate (at bottom) */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '1rem',
                        alignItems: 'end'
                    }}>
                        {/* Prompt Count */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                            <label style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Count</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                        </div>

                        {/* Aspect Ratio */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Ratio</label>
                            <select
                                data-testid="select-social-aspect-ratio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '8px',
                                    background: '#1a1d23',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    color: '#e5e7eb',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    outline: 'none'
                                }}
                            >
                                <option value="9:16">9:16</option>
                                <option value="1:1">1:1</option>
                                <option value="4:5">4:5</option>
                                <option value="16:9">16:9</option>
                                <option value="4:3">4:3</option>
                                <option value="3:4">3:4</option>
                            </select>
                        </div>

                        {/* Generate Button */}
                        <button
                            data-testid="button-generate-social"
                            onClick={handleGeneratePrompts}
                            disabled={isGenerating || !textPrompt.trim()}
                            style={{
                                padding: '0.6rem 1.25rem',
                                borderRadius: '8px',
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
                                whiteSpace: 'nowrap'
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
                                    ...
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
                </div>

                {/* Right Side - Large Reference Images Box */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem 1.25rem',
                    background: hasIdentity ? 'rgba(34, 197, 94, 0.08)' : 'rgba(107, 114, 128, 0.08)',
                    borderRadius: '12px',
                    border: `1px solid ${hasIdentity ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`,
                    minWidth: '460px'
                }}>
                    <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase', 
                        color: hasIdentity ? '#4ade80' : '#9ca3af',
                        letterSpacing: '0.1em',
                        textAlign: 'center'
                    }}>
                        Reference
                    </span>
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        {/* Headshot - Large Portrait */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {effectiveHeadshot ? (
                                <div style={{ position: 'relative' }}>
                                    <img 
                                        src={effectiveHeadshot}
                                        alt="Headshot"
                                        data-testid="img-identity-headshot"
                                        style={{
                                            width: '200px',
                                            height: '280px',
                                            objectFit: 'cover',
                                            borderRadius: '12px',
                                            border: '3px solid rgba(34, 197, 94, 0.5)'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '-10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.7rem',
                                        background: 'rgba(34, 197, 94, 0.95)',
                                        color: 'white',
                                        padding: '4px 16px',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Head</span>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => headInputRef.current?.click()}
                                    style={{
                                        width: '200px',
                                        height: '280px',
                                        borderRadius: '12px',
                                        border: '2px dashed rgba(107, 114, 128, 0.4)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'rgba(0,0,0,0.2)',
                                        transition: 'all 0.2s'
                                    }}
                                    data-testid="upload-headshot"
                                >
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '10px', fontWeight: 'bold' }}>HEAD</span>
                                </div>
                            )}
                            <input
                                ref={headInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'head')}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Bodyshot - Large Portrait */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {effectiveBodyshot ? (
                                <div style={{ position: 'relative' }}>
                                    <img 
                                        src={effectiveBodyshot}
                                        alt="Bodyshot"
                                        data-testid="img-identity-bodyshot"
                                        style={{
                                            width: '200px',
                                            height: '280px',
                                            objectFit: 'cover',
                                            borderRadius: '12px',
                                            border: '3px solid rgba(34, 197, 94, 0.5)'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '-10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.7rem',
                                        background: 'rgba(34, 197, 94, 0.95)',
                                        color: 'white',
                                        padding: '4px 16px',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Body</span>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => bodyInputRef.current?.click()}
                                    style={{
                                        width: '200px',
                                        height: '280px',
                                        borderRadius: '12px',
                                        border: '2px dashed rgba(107, 114, 128, 0.4)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'rgba(0,0,0,0.2)',
                                        transition: 'all 0.2s'
                                    }}
                                    data-testid="upload-bodyshot"
                                >
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '10px', fontWeight: 'bold' }}>BODY</span>
                                </div>
                            )}
                            <input
                                ref={bodyInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'body')}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Create Identity Button */}
                    {!hasIdentity && onNavigateToTab && (
                        <button
                            onClick={() => onNavigateToTab(0)}
                            data-testid="button-create-identity"
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#a5b4fc',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="5" />
                                <path d="M20 21a8 8 0 1 0-16 0" />
                            </svg>
                            Go to Tab 1
                        </button>
                    )}
                </div>
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
                        gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', 
                        gap: '1rem'
                    }}>
                        {generatedPrompts.map((prompt, index) => {
                            const isCopied = copiedIds.has(prompt.id);
                            
                            return (
                                <div 
                                    key={prompt.id}
                                    data-testid={`prompt-card-${index}`}
                                    style={{
                                        position: 'relative',
                                        background: '#181a1f',
                                        borderRadius: '12px',
                                        border: isCopied ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s',
                                        boxShadow: isCopied ? '0 0 20px rgba(34, 197, 94, 0.15)' : 'none'
                                    }}
                                >
                                    {isCopied && <div style={{ position: 'absolute', inset: 0, background: 'rgba(34, 197, 94, 0.05)', pointerEvents: 'none', borderRadius: '12px' }} />}
                                    
                                    {/* Card Header - Neutral */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem 1rem',
                                        background: 'rgba(0,0,0,0.4)',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                borderRadius: '6px',
                                                padding: '0.25rem 0.5rem'
                                            }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#818cf8', fontFamily: 'monospace' }}>UGC</span>
                                                <span style={{ width: '1px', height: '12px', background: 'rgba(99, 102, 241, 0.3)' }} />
                                                <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontFamily: 'monospace' }}>{index + 1} / {generatedPrompts.length}</span>
                                            </div>
                                        </div>
                                        <button
                                            data-testid={`button-copy-prompt-${index}`}
                                            onClick={() => handleCopyPrompt(prompt)}
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: isCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)',
                                                color: isCopied ? '#4ade80' : '#9ca3af',
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
                                    
                                    {/* Card Content - Colored Sections */}
                                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {/* Scenario - Indigo highlight */}
                                        <div style={{
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            border: '1px solid rgba(99, 102, 241, 0.2)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                <div style={{ width: '3px', height: '12px', background: '#818cf8', borderRadius: '2px' }} />
                                                <span style={{ fontSize: '0.6rem', color: '#a5b4fc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scenario</span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: '#e5e7eb', margin: 0, lineHeight: '1.4' }}>{prompt.scenario}</p>
                                        </div>
                                        
                                        {/* Details Grid - Different colors per section */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {/* Setting - Emerald */}
                                            <div style={{ 
                                                background: 'rgba(16, 185, 129, 0.1)', 
                                                borderRadius: '6px', 
                                                padding: '0.6rem 0.75rem',
                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                    <div style={{ width: '2px', height: '10px', background: '#34d399', borderRadius: '1px' }} />
                                                    <span style={{ fontSize: '0.55rem', color: '#6ee7b7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Setting</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, lineHeight: '1.3' }}>{prompt.setting}</p>
                                            </div>
                                            
                                            {/* Outfit - Rose */}
                                            <div style={{ 
                                                background: 'rgba(244, 63, 94, 0.1)', 
                                                borderRadius: '6px', 
                                                padding: '0.6rem 0.75rem',
                                                border: '1px solid rgba(244, 63, 94, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                    <div style={{ width: '2px', height: '10px', background: '#fb7185', borderRadius: '1px' }} />
                                                    <span style={{ fontSize: '0.55rem', color: '#fda4af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Outfit</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, lineHeight: '1.3' }}>{prompt.outfit}</p>
                                            </div>
                                            
                                            {/* Pose - Purple */}
                                            <div style={{ 
                                                background: 'rgba(168, 85, 247, 0.1)', 
                                                borderRadius: '6px', 
                                                padding: '0.6rem 0.75rem',
                                                border: '1px solid rgba(168, 85, 247, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                    <div style={{ width: '2px', height: '10px', background: '#a78bfa', borderRadius: '1px' }} />
                                                    <span style={{ fontSize: '0.55rem', color: '#c4b5fd', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pose</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, lineHeight: '1.3' }}>{prompt.pose}</p>
                                            </div>
                                            
                                            {/* Lighting - Amber */}
                                            <div style={{ 
                                                background: 'rgba(245, 158, 11, 0.1)', 
                                                borderRadius: '6px', 
                                                padding: '0.6rem 0.75rem',
                                                border: '1px solid rgba(245, 158, 11, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                    <div style={{ width: '2px', height: '10px', background: '#fbbf24', borderRadius: '1px' }} />
                                                    <span style={{ fontSize: '0.55rem', color: '#fcd34d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Lighting</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, lineHeight: '1.3' }}>{prompt.lighting}</p>
                                            </div>
                                            
                                            {/* Camera - Cyan */}
                                            <div style={{ 
                                                background: 'rgba(6, 182, 212, 0.1)', 
                                                borderRadius: '6px', 
                                                padding: '0.6rem 0.75rem',
                                                border: '1px solid rgba(6, 182, 212, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                    <div style={{ width: '2px', height: '10px', background: '#22d3ee', borderRadius: '1px' }} />
                                                    <span style={{ fontSize: '0.55rem', color: '#67e8f9', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Camera</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, lineHeight: '1.3' }}>{prompt.camera}</p>
                                            </div>
                                            
                                            {/* Imperfections - Teal */}
                                            <div style={{ 
                                                background: 'rgba(20, 184, 166, 0.1)', 
                                                borderRadius: '6px', 
                                                padding: '0.6rem 0.75rem',
                                                border: '1px solid rgba(20, 184, 166, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                    <div style={{ width: '2px', height: '10px', background: '#2dd4bf', borderRadius: '1px' }} />
                                                    <span style={{ fontSize: '0.55rem', color: '#5eead4', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Imperfections</span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#d1d5db', margin: 0, lineHeight: '1.3' }}>{prompt.imperfections}</p>
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
