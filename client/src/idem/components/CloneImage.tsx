
import React, { useState, useEffect } from 'react';
import { VisualArchitectResult } from '../types';
import { analyzeImageVisualArchitect, convertVisualArchitectToPrompt, performIdentityGraft } from '../services/geminiService';

interface CloneImageProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const CloneImage: React.FC<CloneImageProps> = ({ identityImages }) => {
    const [targetImage, setTargetImage] = useState<string | null>(null);

    const [architectResult, setArchitectResult] = useState<VisualArchitectResult | null>(null);
    const [finalPrompt, setFinalPrompt] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Original position of copiedType: const [copiedType, setCopiedType] = useState<'full' | 'json' | null>(null);



    // New State for Dual Mode
    const [mode, setMode] = useState<'clone' | 'swap'>('clone');
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<'json' | 'full' | null>(null);
    const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

    const CLONE_PHRASES = [
        "Analyzing Visual DNA...",
        "Extracting Composition & Lighting...",
        "Synthesizing Prompt Structure...",
        "Finalizing Output..."
    ];

    const SWAP_PHRASES = [
        "Scanning Identity Features...",
        "Mapping Facial Geometry...",
        "Locking Source Scene...",
        "Grafting Identity...",
        "Merging Textures...",
        "Finalizing Output..."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAnalyzing) {
            setLoadingPhraseIndex(0);
            const duration = mode === 'clone' ? 4000 : 3000;
            const phrases = mode === 'clone' ? CLONE_PHRASES : SWAP_PHRASES;

            interval = setInterval(() => {
                setLoadingPhraseIndex(prev => (prev + 1) % phrases.length);
            }, duration);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing, mode]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await fileToBase64(file);
            setReferenceImage(base64);
        } catch (err) {
            console.error("Ref Upload failed", err);
        }
    };



    const handleCopyFull = async () => {
        if (finalPrompt) {
            await navigator.clipboard.writeText(finalPrompt);
            setCopiedType('full');
            setTimeout(() => setCopiedType(null), 2000);
        }
    };



    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await fileToBase64(file);
            setTargetImage(base64);
            setArchitectResult(null);
            setFinalPrompt('');
            setError(null);
        } catch (err) {
            console.error("Upload failed", err);
            setError("Failed to upload image");
        }
    };

    const handleReset = () => {
        setArchitectResult(null);
        setFinalPrompt('');
        setError(null);
    };

    const handleMainAction = async () => {
        console.log("Triggering Main Action. Mode:", mode);
        if (!targetImage) {
            console.log("No target image");
            setError("Please upload an image first");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setArchitectResult(null);

        try {
            let result;
            if (mode === 'clone') {
                console.log("Running Clone Analysis...");
                result = await analyzeImageVisualArchitect(targetImage);
            } else {
                console.log("Running Identity Graft...");
                // Swap Mode
                if (!referenceImage) {
                    throw new Error("Reference image required");
                }
                result = await performIdentityGraft(targetImage, referenceImage);
            }

            console.log("Result received:", result ? "YES" : "NO");
            setArchitectResult(result);

            const promptText = convertVisualArchitectToPrompt(result, false);
            setFinalPrompt(promptText);
        } catch (e: any) {
            console.error("Main Action Failed:", e);
            setError(e.message || "Analysis failed");
        } finally {
            setIsAnalyzing(false);
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
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <span style={{ color: '#22c55e' }}>Image Cloning</span>
                            <span style={{ color: '#4b5563', margin: '0 0.5rem' }}>&</span>
                            <span style={{ color: '#3b82f6' }}>Character Swap</span>
                        </h2>
                    </div>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={labelStyle}>Source & Reference</label>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        width: '100%'
                    }}>
                        {/* Left: Source Image */}
                        <div
                            data-testid="upload-clone-image"
                            onClick={() => document.getElementById('clone-upload')?.click()}
                            style={{
                                aspectRatio: '3/4',
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: targetImage ? '2px solid #22c55e' : '2px dashed #4b5563',
                                background: 'rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}
                        >
                            {targetImage ? (
                                <>
                                    <img src={targetImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Target" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setTargetImage(null); }}
                                        style={{
                                            position: 'absolute',
                                            top: '0.5rem', right: '0.5rem',
                                            background: 'rgba(0,0,0,0.6)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '6px',
                                            padding: '0.4rem',
                                            cursor: 'pointer',
                                            color: '#f87171',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            zIndex: 10
                                        }}
                                        title="Clear Image"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0, left: 0, right: 0,
                                        background: 'rgba(0,0,0,0.7)',
                                        padding: '0.5rem',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>SOURCE</p>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" style={{ marginBottom: '0.25rem' }}>
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#e5e7eb', fontWeight: '500' }}>Drop your image to clone here</p>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#9ca3af' }}>or click to browse</p>
                                </div>
                            )}
                            <input
                                type="file"
                                id="clone-upload"
                                hidden
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Right: Reference Image (Ghosted Logic) */}
                        <div
                            onClick={() => {
                                if (mode === 'swap' && targetImage) {
                                    document.getElementById('ref-upload')?.click();
                                }
                            }}
                            style={{
                                aspectRatio: '3/4',
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: referenceImage ? '2px solid #3b82f6' : '2px dashed #4b5563',
                                background: 'rgba(0,0,0,0.3)',
                                cursor: (mode === 'swap' && targetImage) ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                opacity: (mode === 'clone' || (mode === 'swap' && !targetImage)) ? 0.3 : 1,
                                filter: (mode === 'clone' || (mode === 'swap' && !targetImage)) ? 'grayscale(100%)' : 'none',
                                pointerEvents: (mode === 'clone' || (mode === 'swap' && !targetImage)) ? 'none' : 'auto',
                                transition: 'all 0.3s ease-in-out'
                            }}
                        >
                            {referenceImage ? (
                                <>
                                    <img src={referenceImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Reference" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                                        style={{
                                            position: 'absolute',
                                            top: '0.5rem', right: '0.5rem',
                                            background: 'rgba(0,0,0,0.6)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '6px',
                                            padding: '0.4rem',
                                            cursor: 'pointer',
                                            color: '#f87171',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            zIndex: 10
                                        }}
                                        title="Clear Image"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0, left: 0, right: 0,
                                        background: 'rgba(0,0,0,0.7)',
                                        padding: '0.5rem',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>REFERENCE</p>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={mode === 'swap' ? "#3b82f6" : "#4b5563"} strokeWidth="2" style={{ marginBottom: '0.25rem' }}>
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: mode === 'swap' ? '#e5e7eb' : '#4b5563', fontWeight: '500' }}>
                                        {mode === 'swap' && !targetImage ? 'Upload Source First' : 'Drop reference image here'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: mode === 'swap' ? '#9ca3af' : '#4b5563' }}>
                                        {mode === 'swap'
                                            ? (!targetImage ? 'Unlock Character Swap' : 'or click to browse')
                                            : '(Disabled in Clone Mode)'}
                                    </p>
                                </div>
                            )}
                            <input
                                type="file"
                                id="ref-upload"
                                hidden
                                accept="image/*"
                                onChange={handleReferenceUpload}
                            />
                        </div>
                    </div>

                    <p style={{ fontSize: '0.7rem', color: '#6b7280', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
                        {mode === 'clone'
                            ? "Analyze the source image's visual DNA."
                            : "Inject the Reference Identity into the Source Scene."}
                    </p>

                    {/* New Full-Width Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(0,0,0,0.4)',
                        padding: '0.25rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginTop: '0.5rem'
                    }}>
                        <button
                            onClick={() => setMode('clone')}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: mode === 'clone' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                                color: mode === 'clone' ? '#4ade80' : '#6b7280',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                            </svg>
                            Clone Image
                        </button>
                        <button
                            onClick={() => setMode('swap')}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: mode === 'swap' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                color: mode === 'swap' ? '#60a5fa' : '#6b7280',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Scan Identity
                        </button>
                    </div>

                    <button
                        data-testid="button-action-main"
                        onClick={handleMainAction}
                        disabled={isAnalyzing || !targetImage}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: (isAnalyzing || !targetImage)
                                ? '#374151'
                                : (mode === 'swap' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'),
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: (isAnalyzing || !targetImage) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginTop: '0.25rem',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isAnalyzing ? (
                            <>
                                Scanning...
                            </>
                        ) : (
                            <>
                                {mode === 'clone' ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="M21 21l-4.35-4.35" />
                                        </svg>
                                        Begin Cloning
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 3h5v5" />
                                            <path d="M4 20L21 3" />
                                            <path d="M21 16v5h-5" />
                                            <path d="M15 15l-5 5" />
                                            <path d="M4 4l5 5" />
                                        </svg>
                                        Swap Character
                                    </>
                                )}
                            </>
                        )}
                    </button>
                </div>



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

            <div style={{ gridColumn: 'span 9', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#e5e7eb', margin: 0 }}>
                            Output
                        </h2>
                        {architectResult && (
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                                Prompt Ready
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
                    {!architectResult ? (
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
                                background: mode === 'clone' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                transition: 'all 0.3s'
                            }}>
                                {mode === 'clone' ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8" cy="8" r="2" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                ) : (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                )}
                            </div>
                            <p style={{ fontSize: '1rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                {mode === 'clone' ? 'Ready to Clone' : 'Ready to Scan'}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                {mode === 'clone' ? 'Upload an image and click Analyze to extract its prompt.' : 'Upload source and reference images to create character swap prompt.'}
                            </p>
                        </div>
                    ) : (
                        <>

                            {architectResult && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{
                                        background: copiedType ? 'rgba(34, 197, 94, 0.05)' : 'rgba(0,0,0,0.4)',
                                        borderRadius: '12px',
                                        border: copiedType ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            background: 'rgba(0,0,0,0.3)',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Visual Profile
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>
                                                    gemini-2.5-pro
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    data-testid="button-copy-clone-full"
                                                    onClick={handleCopyFull}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: copiedType === 'full' ? '#22c55e' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                        color: 'white',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)',
                                                        transform: copiedType === 'full' ? 'scale(1.05)' : 'scale(1)'
                                                    }}
                                                >
                                                    {copiedType === 'full' ? (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    )}
                                                    {copiedType === 'full' ? 'Copied!' : 'Copy Prompt'}
                                                </button>
                                                <button
                                                    onClick={handleReset}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                        color: 'white',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                                                        transform: 'scale(1)'
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M3 6h18" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                    Reset Prompt
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                                            {/* META & FRAME */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {architectResult.meta?.intent && (
                                                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intent</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>{architectResult.meta.intent}</p>
                                                    </div>
                                                )}
                                                {architectResult.frame?.composition && (
                                                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Composition</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#d1d5db', lineHeight: '1.4' }}>{architectResult.frame.composition}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* SUBJECT */}
                                            {architectResult.subject && (
                                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</span>
                                                    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                        {architectResult.subject.identity && <p style={{ margin: 0, fontSize: '0.8rem', color: '#e5e7eb' }}><strong style={{ color: '#60a5fa' }}>Identity:</strong> {architectResult.subject.identity}</p>}
                                                        {architectResult.subject.pose && <p style={{ margin: 0, fontSize: '0.8rem', color: '#e5e7eb' }}><strong style={{ color: '#60a5fa' }}>Pose:</strong> {architectResult.subject.pose}</p>}
                                                        {architectResult.subject.expression && <p style={{ margin: 0, fontSize: '0.8rem', color: '#e5e7eb' }}><strong style={{ color: '#60a5fa' }}>Expression:</strong> {architectResult.subject.expression}</p>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* WARDROBE */}
                                            {architectResult.wardrobe?.items && architectResult.wardrobe.items.length > 0 && (
                                                <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wardrobe</span>
                                                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1rem', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>
                                                        {architectResult.wardrobe.items.map((item, idx) => (
                                                            <li key={idx}><strong style={{ color: '#f472b6' }}>{item.item}:</strong> {item.details}</li>
                                                        ))}
                                                    </ul>
                                                    {architectResult.wardrobe.physics && (
                                                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#fbcfe8', fontStyle: 'italic' }}>Physics: {architectResult.wardrobe.physics}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* ENVIRONMENT & LIGHTING */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {architectResult.environment && (
                                                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Environment</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>
                                                            {architectResult.environment.location}. {architectResult.environment.context}
                                                        </p>
                                                    </div>
                                                )}
                                                {architectResult.lighting && (
                                                    <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lighting</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>
                                                            {architectResult.lighting.type} ({architectResult.lighting.quality})
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* STYLE & CAMERA */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {architectResult.style && (
                                                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Style</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>
                                                            {architectResult.style.aesthetic}
                                                        </p>
                                                    </div>
                                                )}
                                                {architectResult.camera && (
                                                    <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Camera</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>
                                                            {architectResult.camera.lens}, {architectResult.camera.aperture}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {isAnalyzing && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 50,
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                border: '2px solid #1f2937',
                                borderTopColor: mode === 'clone' ? '#22c55e' : '#3b82f6',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    {mode === 'clone' ? 'CLONING IMAGE' : 'SWAPPING CHARACTER'}
                                </h3>
                                <p key={loadingPhraseIndex} style={{ fontSize: '0.85rem', color: mode === 'clone' ? '#4ade80' : '#60a5fa', fontFamily: 'monospace', animation: 'fadeIn 0.5s' }}>
                                    {mode === 'clone' ? CLONE_PHRASES[loadingPhraseIndex] : SWAP_PHRASES[loadingPhraseIndex]}
                                </p>
                                <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default CloneImage;
