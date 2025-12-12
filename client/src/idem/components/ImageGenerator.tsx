
import React, { useState } from 'react';
import { ImageAspect, UGCPromptCard, ImageProvider, ImageGenerationResult } from '../types';
import { generateUGCPrompts } from '../services/geminiService';
import { generateImage } from '../services/imageGenerationService';

const ImageGenerator: React.FC = () => {
    const [textPrompt, setTextPrompt] = useState('');
    const [promptCount, setPromptCount] = useState(5);
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('9:16');
    const [generatedPrompts, setGeneratedPrompts] = useState<UGCPromptCard[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<'social' | 'studio'>('social');

    // Image Generation State
    const [includeImage, setIncludeImage] = useState(false);
    const [provider, setProvider] = useState<ImageProvider>('wavespeed');
    const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
    const [batchSize, setBatchSize] = useState(1);
    const [generatedImages, setGeneratedImages] = useState<ImageGenerationResult[]>([]);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

        // If Image & Prompt, sync prompt count to batch size
        const countToGenerate = includeImage ? batchSize : promptCount;

        setIsGenerating(true);
        if (includeImage) setIsGeneratingImage(true);

        setError(null);
        setGeneratedPrompts([]);
        setGeneratedImages([]);
        setCopiedIds(new Set());

        try {
            const prompts = await generateUGCPrompts({
                contentDescription: textPrompt,
                count: countToGenerate,
                aspectRatio: aspectRatio,
                mode: mode
            });

            setGeneratedPrompts(prompts);

            // Generate Images logic
            if (includeImage && prompts.length > 0) {
                const images: ImageGenerationResult[] = [];
                // Process sequentially to avoid rate limits
                for (const prompt of prompts) {
                    try {
                        const result = await generateImage({
                            provider,
                            apiKey,
                            prompt: prompt.fullPrompt,
                            aspectRatio,
                            resolution
                        });
                        images.push(result);
                    } catch (err: any) {
                        images.push({ ok: false, error: err.message || "Generation Failed" });
                    }
                    // Update state progressively or all at once? All at once for now.
                }
                setGeneratedImages(images);
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate prompts");
        } finally {
            setIsGenerating(false);
            setIsGeneratingImage(false);
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
            {/* Header - Centered over Left Panel */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '280px',
                justifyContent: 'center'
            }}>
                <div style={{ width: '6px', height: '6px', background: '#eab308', borderRadius: '50%' }} />
                <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#eab308' }}>Social Media / UGC</h2>
            </div>

            {/* Main Content - Side by Side Layout */}
            <div style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'flex-start',
                flexWrap: 'wrap'
            }}>
                {/* Left Side - Input Controls (Smaller) */}
                <div style={{
                    width: '280px',
                    minWidth: '260px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: 'rgba(24, 26, 31, 0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Describe Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            color: '#94a3b8',
                            letterSpacing: '0.1em',
                            paddingLeft: '0.75rem' // Aligned with textarea text
                        }}>Describe Your Content</label>
                        <textarea
                            data-testid="input-social-prompt"
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                            placeholder={mode === 'social' ? "Day in the life content, outfit posts, coffee shop aesthetic, gym selfies..." : "Cinematic fashion editorial, dramatic lighting, high-end product shot, vogue style..."}
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '0.75rem',
                                fontSize: '0.85rem',
                                color: 'white',
                                resize: 'none',
                                outline: 'none',
                                lineHeight: '1.5'
                            }}
                        />
                    </div>

                    {/* Image Gen Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Native Image Gen</label>
                        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px' }}>
                            <button
                                onClick={() => setIncludeImage(false)}
                                style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: !includeImage ? '#eab308' : 'transparent',
                                    color: !includeImage ? 'black' : '#6b7280',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}>OFF</button>
                            <button
                                onClick={() => setIncludeImage(true)}
                                style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: includeImage ? '#eab308' : 'transparent',
                                    color: includeImage ? 'black' : '#6b7280',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}>ON</button>
                        </div>
                    </div>

                    {/* Image Controls (Conditional) */}
                    {includeImage && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {/* Provider */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>API Provider</label>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value as ImageProvider)}
                                    style={{
                                        padding: '0.4rem',
                                        background: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '6px',
                                        color: '#f3f4f6',
                                        fontSize: '0.65rem',
                                        outline: 'none',
                                        colorScheme: 'dark'
                                    }}
                                >
                                    <option value="wavespeed" style={{ background: '#1f2937', color: '#f3f4f6' }}>Wavespeed</option>
                                    <option value="google" style={{ background: '#1f2937', color: '#f3f4f6' }}>Google Gemini</option>
                                </select>
                            </div>
                            {/* Resolution */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Resolution</label>
                                <select
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value as any)}
                                    style={{
                                        padding: '0.4rem',
                                        background: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '6px',
                                        color: '#f3f4f6',
                                        fontSize: '0.65rem',
                                        outline: 'none',
                                        colorScheme: 'dark'
                                    }}
                                >
                                    <option value="2k" style={{ background: '#1f2937', color: '#f3f4f6' }}>Standard (2K)</option>
                                    <option value="4k" style={{ background: '#1f2937', color: '#f3f4f6' }}>Ultra (4K)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Controls Row - Count/Batch & Ratio */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {/* Prompt Count / Batch Size */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                            <label style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {includeImage ? 'Batch Size' : 'Prompt Count'}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="range"
                                    data-testid="slider-prompt-count"
                                    min={1}
                                    max={includeImage ? 4 : 25}
                                    value={includeImage ? batchSize : promptCount}
                                    onChange={(e) => includeImage ? setBatchSize(parseInt(e.target.value)) : setPromptCount(parseInt(e.target.value))}
                                    style={{
                                        flex: 1,
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: `linear-gradient(to right, #eab308 0%, #eab308 ${(((includeImage ? batchSize : promptCount) - 1) / (includeImage ? 3 : 24)) * 100}%, rgba(255,255,255,0.1) ${(((includeImage ? batchSize : promptCount) - 1) / (includeImage ? 3 : 24)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                />
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    color: '#fde047',
                                    minWidth: '1.5rem',
                                    textAlign: 'right'
                                }}>
                                    {includeImage ? batchSize : promptCount}
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
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '8px',
                                    background: '#1f2937',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    color: '#f3f4f6',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    outline: 'none',
                                    colorScheme: 'dark'
                                }}
                            >
                                <option value="9:16" style={{ background: '#1f2937', color: '#f3f4f6' }}>9:16</option>
                                <option value="1:1" style={{ background: '#1f2937', color: '#f3f4f6' }}>1:1</option>
                                <option value="4:5" style={{ background: '#1f2937', color: '#f3f4f6' }}>4:5</option>
                                <option value="16:9" style={{ background: '#1f2937', color: '#f3f4f6' }}>16:9</option>
                                <option value="4:3" style={{ background: '#1f2937', color: '#f3f4f6' }}>4:3</option>
                                <option value="3:4" style={{ background: '#1f2937', color: '#f3f4f6' }}>3:4</option>
                            </select>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        data-testid="button-generate-social"
                        onClick={handleGeneratePrompts}
                        disabled={isGenerating || !textPrompt.trim()}
                        style={{
                            padding: '0.7rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: (isGenerating || !textPrompt.trim()) ? '#374151' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                            color: (isGenerating || !textPrompt.trim()) ? '#9ca3af' : 'black',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: (isGenerating || !textPrompt.trim()) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: !textPrompt.trim() ? 0.5 : 1,
                            width: '100%'
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
                                Generate Prompts
                            </>
                        )}
                    </button>

                    {/* Mode Toggle - Under Button */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        padding: '4px',
                        marginTop: '0.25rem'
                    }}>
                        <button
                            onClick={() => setMode('social')}
                            style={{
                                flex: 1,
                                border: 'none',
                                background: mode === 'social' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: mode === 'social' ? '#eab308' : '#6b7280',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Social / UGC
                        </button>
                        <button
                            onClick={() => setMode('studio')}
                            style={{
                                flex: 1,
                                border: 'none',
                                background: mode === 'studio' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: mode === 'studio' ? '#eab308' : '#6b7280',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Studio Images
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5',
                            fontSize: '0.75rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Info Note */}
                    <div style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        fontSize: '0.7rem',
                        color: '#a5b4fc',
                        lineHeight: '1.4'
                    }}>
                        {mode === 'social'
                            ? "Generates authentic, candid, smartphone-style prompts."
                            : "Generates high-fidelity, professional studio-style prompts."}
                    </div>
                </div>

                {/* Right Side - Output Cards */}
                <div style={{
                    flex: 1,
                    background: 'rgba(24, 26, 31, 0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Output Header */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#e5e7eb', margin: 0 }}>
                            Output
                        </h2>
                        {generatedPrompts.length > 0 && (
                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                {generatedPrompts.length} prompts • {copiedIds.size} copied
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
                                width: '56px',
                                height: '56px',
                                background: 'rgba(234, 179, 8, 0.1)',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem'
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.5">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                            </div>
                            <p style={{ fontSize: '0.85rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                Ready to Create {mode === 'social' ? 'UGC' : 'Studio'} Prompts
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                Describe your content and click Generate
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
                                width: '42px',
                                height: '42px',
                                border: '3px solid rgba(234, 179, 8, 0.2)',
                                borderTopColor: '#eab308',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Creating {promptCount} prompts...</p>
                        </div>
                    ) : (
                        <div style={{
                            display: includeImage ? 'grid' : 'block',
                            gridTemplateColumns: includeImage ? '1fr 350px' : 'none',
                            gap: '1.5rem',
                            alignItems: 'start'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: includeImage ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
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

                                            {/* Card Header */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.6rem 0.85rem',
                                                background: 'rgba(0,0,0,0.4)',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        background: mode === 'social' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                                        border: mode === 'social' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(234, 179, 8, 0.2)',
                                                        borderRadius: '5px',
                                                        padding: '0.2rem 0.4rem'
                                                    }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: mode === 'social' ? '#818cf8' : '#facc15', fontFamily: 'monospace' }}>
                                                            {mode === 'social' ? 'UGC' : 'STUDIO'}
                                                        </span>
                                                        <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255, 0.3)' }} />
                                                        <span style={{ fontSize: '0.65rem', color: '#a5b4fc', fontFamily: 'monospace' }}>{index + 1}/{generatedPrompts.length}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    data-testid={`button-copy-prompt-${index}`}
                                                    onClick={() => handleCopyPrompt(prompt)}
                                                    style={{
                                                        padding: '0.3rem 0.6rem',
                                                        borderRadius: '5px',
                                                        border: 'none',
                                                        background: isCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)',
                                                        color: isCopied ? '#4ade80' : '#9ca3af',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {isCopied ? (
                                                        <>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            Copied
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

                                            {/* Card Content */}
                                            <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                {/* Scenario - Main highlight */}
                                                <div style={{
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    borderRadius: '6px',
                                                    padding: '0.6rem',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                        <div style={{ width: '2px', height: '10px', background: '#818cf8', borderRadius: '1px' }} />
                                                        <span style={{ fontSize: '0.55rem', color: '#a5b4fc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scenario</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.8rem', color: '#e5e7eb', margin: 0, lineHeight: '1.3' }}>{prompt.scenario}</p>
                                                </div>

                                                {/* Details Grid */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                                    {/* Setting */}
                                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                            <div style={{ width: '2px', height: '8px', background: '#34d399', borderRadius: '1px' }} />
                                                            <span style={{ fontSize: '0.5rem', color: '#6ee7b7', fontWeight: '700', textTransform: 'uppercase' }}>Setting</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.setting}</p>
                                                    </div>

                                                    {/* Outfit */}
                                                    <div style={{ background: 'rgba(244, 63, 94, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                            <div style={{ width: '2px', height: '8px', background: '#fb7185', borderRadius: '1px' }} />
                                                            <span style={{ fontSize: '0.5rem', color: '#fda4af', fontWeight: '700', textTransform: 'uppercase' }}>Outfit</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.outfit}</p>
                                                    </div>

                                                    {/* Pose */}
                                                    <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                            <div style={{ width: '2px', height: '8px', background: '#a78bfa', borderRadius: '1px' }} />
                                                            <span style={{ fontSize: '0.5rem', color: '#c4b5fd', fontWeight: '700', textTransform: 'uppercase' }}>Pose</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.pose}</p>
                                                    </div>

                                                    {/* Expression - NEW */}
                                                    <div style={{ background: 'rgba(236, 72, 153, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                            <div style={{ width: '2px', height: '8px', background: '#f472b6', borderRadius: '1px' }} />
                                                            <span style={{ fontSize: '0.5rem', color: '#f9a8d4', fontWeight: '700', textTransform: 'uppercase' }}>Expression</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.expression}</p>
                                                    </div>

                                                    {/* Lighting */}
                                                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                            <div style={{ width: '2px', height: '8px', background: '#fbbf24', borderRadius: '1px' }} />
                                                            <span style={{ fontSize: '0.5rem', color: '#fcd34d', fontWeight: '700', textTransform: 'uppercase' }}>Lighting</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.lighting}</p>
                                                    </div>

                                                    {/* Camera */}
                                                    <div style={{ background: 'rgba(6, 182, 212, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                            <div style={{ width: '2px', height: '8px', background: '#22d3ee', borderRadius: '1px' }} />
                                                            <span style={{ fontSize: '0.5rem', color: '#67e8f9', fontWeight: '700', textTransform: 'uppercase' }}>Camera</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.camera}</p>
                                                    </div>
                                                </div>

                                                {/* Imperfections - Full width */}
                                                <div style={{ background: 'rgba(20, 184, 166, 0.1)', borderRadius: '5px', padding: '0.5rem 0.6rem', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                                        <div style={{ width: '2px', height: '8px', background: '#2dd4bf', borderRadius: '1px' }} />
                                                        <span style={{ fontSize: '0.5rem', color: '#5eead4', fontWeight: '700', textTransform: 'uppercase' }}>{mode === 'social' ? 'Imperfections' : 'Texture & Details'}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.7rem', color: '#d1d5db', margin: 0, lineHeight: '1.25' }}>{prompt.imperfections}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {includeImage && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generated Images</h3>
                                        {isGeneratingImage && <span style={{ fontSize: '0.65rem', color: '#eab308' }}>PROCESSING {batchSize}...</span>}
                                    </div>

                                    {isGeneratingImage && generatedImages.length === 0 && Array.from({ length: batchSize }).map((_, i) => (
                                        <div key={`skel-${i}`} style={{ aspectRatio: aspectRatio.replace(':', '/'), background: 'rgba(255,255,255,0.02)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#eab308', animation: 'spin 1s linear infinite' }} />
                                        </div>
                                    ))}

                                    {generatedImages.map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {(img.url || img.b64_json) ? (
                                                <img
                                                    src={img.url || `data:image/png;base64,${img.b64_json}`}
                                                    alt={`Gen ${idx}`}
                                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                                />
                                            ) : (
                                                <div style={{ aspectRatio: aspectRatio.replace(':', '/'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: '0.7rem', padding: '1rem', textAlign: 'center', background: 'rgba(239,68,68,0.1)' }}>
                                                    {img.error || "Failed"}
                                                </div>
                                            )}
                                            {(img.url || img.b64_json) && (
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '0.75rem', opacity: 0, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                                >
                                                    <button style={{ background: 'white', color: 'black', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>SAVE</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
