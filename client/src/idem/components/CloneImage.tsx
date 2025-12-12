
import React, { useState, useEffect } from 'react';
import { VisualArchitectResult, ImageProvider, ImageAspect, ImageGenerationResult } from '../types';
import { analyzeImageVisualArchitect, convertVisualArchitectToPrompt, performIdentityGraft } from '../services/geminiService';
import { generateImage } from '../services/imageGenerationService';

interface CloneImageProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const CloneImage: React.FC<CloneImageProps> = ({ identityImages }) => {
    const [targetImage, setTargetImage] = useState<string | null>(null);

    const [architectResult, setArchitectResult] = useState<VisualArchitectResult | null>(null);
    const [finalPrompt, setFinalPrompt] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);




    // New State for Dual Mode
    const [mode, setMode] = useState<'clone' | 'swap'>('clone');
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<'json' | 'full' | null>(null);
    const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

    // Image Generation State
    const [includeImage, setIncludeImage] = useState(false);
    const [provider, setProvider] = useState<ImageProvider>('wavespeed');
    const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('3:4');
    const [batchSize, setBatchSize] = useState(1);
    const [generatedImages, setGeneratedImages] = useState<ImageGenerationResult[]>([]);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const CLONE_PHRASES = [
        "Initiating Visual Sweep...",
        "Scanning Macro Scene & Lighting...",
        "Isolating Objects & Textures...",
        "Mapping Semantic Relations...",
        "Finalizing VisionStruct JSON..."
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
        if (architectResult) {
            const jsonOutput = JSON.stringify(architectResult, null, 2);
            await navigator.clipboard.writeText(jsonOutput);
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
                result = await analyzeImageVisualArchitect(targetImage, 'gemini-2.5-pro');
            } else {
                console.log("Running Identity Graft...");
                // Swap Mode
                if (!referenceImage) {
                    throw new Error("Reference image required");
                }
                result = await performIdentityGraft(targetImage, referenceImage, 'gemini-2.5-pro');
            }

            console.log("Result received:", result ? "YES" : "NO");
            setArchitectResult(result);

            // AUTO-GENERATE IMAGE IF TOGGLED
            if (includeImage && result && !error) {
                console.log("Auto-Generating Image from Result...");
                setIsGeneratingImage(true);
                setGeneratedImages([]); // Clear previous

                try {
                    // Create prompt from result
                    // For now, simple conversion. We could pass the raw architect result if the service supported it, 
                    // but generateImage expects a string prompt and optional reference images.
                    // For SWAP, we might want to pass the Reference Image as an image ref?
                    // User requested "Native Image Generation" using the prompt.

                    const promptText = convertVisualArchitectToPrompt(result, mode === 'swap'); // Strip identity for swap? Or keep it? The graft result HAS the ref identity injected.

                    const genOptions = {
                        provider,
                        apiKey: sessionStorage.getItem('gemini_api_key') || '',
                        prompt: promptText,
                        aspectRatio,
                        resolution,
                        // For Swap, maybe pass the reference image explicitly to Wavespeed? 
                        // The user said "use api", usually imply Text-to-Image based on the structured prompt.
                        // Let's stick to Text-to-Image first as the prompt is very detailed.
                    };

                    // Batch Loop
                    const newImages: ImageGenerationResult[] = [];
                    for (let i = 0; i < batchSize; i++) {
                        const imgResult = await generateImage(genOptions);
                        newImages.push(imgResult);
                    }
                    setGeneratedImages(newImages);

                } catch (genErr: any) {
                    console.error("Image Gen Failed:", genErr);
                    // Don't block the main success, just show error in image container
                } finally {
                    setIsGeneratingImage(false);
                }
            }
            // setFinalPrompt is no longer needed as we copy the raw JSON
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
                    <div style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                            <label style={labelStyle}>Generation Mode</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <span style={{ fontSize: '0.7rem', color: !includeImage ? '#eab308' : '#6b7280', fontWeight: !includeImage ? 'bold' : 'normal' }}>Prompt Only</span>
                                <div
                                    onClick={() => setIncludeImage(!includeImage)}
                                    style={{
                                        width: '36px',
                                        height: '20px',
                                        background: includeImage ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        position: 'relative', // verified
                                        border: includeImage ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255,255,255,0.2)',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        background: includeImage ? '#eab308' : '#9ca3af',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px', // verified
                                        left: includeImage ? '18px' : '2px',
                                        transition: 'all 0.3s'
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: includeImage ? '#eab308' : '#6b7280', fontWeight: includeImage ? 'bold' : 'normal' }}>Generate Image</span>
                            </label>
                        </div>

                        {/* New Controls - Only Visible if Toggle is True */}
                        {includeImage && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                {/* Provider & Resolution Row */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.6rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>PROVIDER</label>
                                        <select
                                            value={provider}
                                            onChange={(e) => setProvider(e.target.value as ImageProvider)}
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: '0.7rem', colorScheme: 'dark' }}
                                        >
                                            <option value="wavespeed" style={{ background: '#1f2937', color: '#f3f4f6' }}>Wavespeed (Fast)</option>
                                            <option value="google" style={{ background: '#1f2937', color: '#f3f4f6' }}>Google Gemini</option>
                                        </select>
                                    </div>
                                    <div style={{ width: '80px' }}>
                                        <label style={{ fontSize: '0.6rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>RES</label>
                                        <select
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value as any)}
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: '0.7rem', colorScheme: 'dark' }}
                                        >
                                            <option value="2k" style={{ background: '#1f2937', color: '#f3f4f6' }}>2K</option>
                                            <option value="4k" style={{ background: '#1f2937', color: '#f3f4f6' }}>4K</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Aspect Ratio & Batch Row */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.6rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>RATIO</label>
                                        <select
                                            value={aspectRatio}
                                            onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: '0.7rem', colorScheme: 'dark' }}
                                        >
                                            <option value="1:1" style={{ background: '#1f2937', color: '#f3f4f6' }}>1:1 (Square)</option>
                                            <option value="16:9" style={{ background: '#1f2937', color: '#f3f4f6' }}>16:9 (Landscape)</option>
                                            <option value="9:16" style={{ background: '#1f2937', color: '#f3f4f6' }}>9:16 (Portrait)</option>
                                            <option value="4:3" style={{ background: '#1f2937', color: '#f3f4f6' }}>4:3 (Classic)</option>
                                            <option value="3:4" style={{ background: '#1f2937', color: '#f3f4f6' }}>3:4 (Vertical)</option>
                                        </select>
                                    </div>
                                    <div style={{ width: '80px' }}>
                                        <label style={{ fontSize: '0.6rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>BATCH</label>
                                        <select
                                            value={batchSize}
                                            onChange={(e) => setBatchSize(parseInt(e.target.value))}
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: '0.7rem', colorScheme: 'dark' }}
                                        >
                                            <option value={1} style={{ background: '#1f2937', color: '#f3f4f6' }}>1</option>
                                            <option value={2} style={{ background: '#1f2937', color: '#f3f4f6' }}>2</option>
                                            <option value={3} style={{ background: '#1f2937', color: '#f3f4f6' }}>3</option>
                                            <option value={4} style={{ background: '#1f2937', color: '#f3f4f6' }}>4</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

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
            </div>



            {/* Right Panel - Dynamic Width based on Mode */}
            <div style={{
                gridColumn: 'span 9', // Always span 9 in the main grid
                display: includeImage ? 'grid' : 'block',
                gridTemplateColumns: includeImage ? '1fr 400px' : 'none', // Split view if image mode
                gap: '2rem',
                minHeight: '600px',
                alignItems: 'start'
            }}>
                {/* Visual Architect Result / Prompt Container */}
                <div style={{
                    ...panelStyle,
                    minHeight: '400px',
                    height: includeImage ? 'calc(100vh - 120px)' : 'auto', // Fixed height for scrolling in split mode
                    overflowY: includeImage ? 'auto' : 'visible',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(24, 26, 31, 0.4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(24, 26, 31, 0.95)', padding: '0.5rem 0', backdropFilter: 'blur(8px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', background: isAnalyzing ? '#eab308' : '#3b82f6', borderRadius: '50%', boxShadow: isAnalyzing ? '0 0 10px #eab308' : 'none', transition: 'all 0.5s' }} />
                            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white' }}>
                                {isAnalyzing ? "Analyzing Scene..." : architectResult ? "VisionStruct Ultra" : "Awaiting Input"}
                            </h2>
                        </div>
                        {architectResult && (
                            <button
                                onClick={handleCopyFull}
                                style={{
                                    background: copiedType === 'full' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                    color: copiedType === 'full' ? 'black' : 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                            >
                                {copiedType === 'full' ? "COPIED JSON" : "COPY JSON"}
                            </button>
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
                                <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(5px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>

                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        {mode === 'clone' ? 'CLONING IMAGE' : 'SWAPPING CHARACTER'}
                                    </h3>
                                    <p key={loadingPhraseIndex} style={{ fontSize: '0.85rem', color: mode === 'clone' ? '#4ade80' : '#60a5fa', fontFamily: 'monospace', animation: 'fadeIn 0.5s' }}>
                                        {mode === 'clone' ? CLONE_PHRASES[loadingPhraseIndex] : SWAP_PHRASES[loadingPhraseIndex]}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}


                    <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>


                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* 1. Meta Tags Row */}
                            {architectResult && architectResult.meta && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {architectResult.meta.medium}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {architectResult.meta.visual_fidelity}
                                    </span>
                                </div>
                            )}

                            {/* 2. Subject Core (Prominent) */}
                            {architectResult && architectResult.subject_core && (
                                <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Core</span>
                                    </div>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.6rem', color: '#86efac', textTransform: 'uppercase', display: 'block', marginBottom: '0.1rem' }}>Identity</span>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#e5e7eb', lineHeight: '1.4' }}>{architectResult.subject_core.identity}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.6rem', color: '#86efac', textTransform: 'uppercase', display: 'block', marginBottom: '0.1rem' }}>Styling</span>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db', lineHeight: '1.4' }}>{architectResult.subject_core.styling}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. Anatomical Details (Grid) */}
                            {architectResult && architectResult.anatomical_details && (
                                <div style={{ background: 'rgba(244, 114, 182, 0.05)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '12px', padding: '1rem' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>Anatomical Details</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.6rem', color: '#fbcfe8', opacity: 0.8 }}>Head & Gaze</span>
                                            <p style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '0.2rem' }}>{architectResult.anatomical_details.head_and_gaze}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.6rem', color: '#fbcfe8', opacity: 0.8 }}>Expression</span>
                                            <p style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '0.2rem' }}>{architectResult.anatomical_details.facial_expression}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.6rem', color: '#fbcfe8', opacity: 0.8 }}>Hands</span>
                                            <p style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '0.2rem' }}>{architectResult.anatomical_details.hands_and_fingers}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.6rem', color: '#fbcfe8', opacity: 0.8 }}>Posture</span>
                                            <p style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '0.2rem' }}>{architectResult.anatomical_details.posture_and_spine}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. Attire Mechanics */}
                            {architectResult && architectResult.attire_mechanics && (
                                <div style={{ background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '12px', padding: '1rem' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Attire Mechanics</span>
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#e5e7eb', lineHeight: '1.4' }}>{architectResult.attire_mechanics.garments}</p>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                        <span style={{ fontSize: '0.6rem', color: '#fbcfe8', opacity: 0.8 }}>Fit & Physics</span>
                                        <p style={{ fontSize: '0.8rem', color: '#d1d5db', marginTop: '0.2rem' }}>{architectResult.attire_mechanics.fit_and_physics}</p>
                                    </div>
                                </div>
                            )}

                            {/* 5. Atmosphere & Environment (Split) */}
                            {architectResult && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {architectResult.atmosphere_and_context && (
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '0.75rem' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase' }}>Atmosphere</span>
                                            <p style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '0.3rem', lineHeight: '1.4' }}>{architectResult.atmosphere_and_context.mood}</p>
                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                <span style={{ fontSize: '0.55rem', color: '#93c5fd' }}>Lighting: </span>
                                                <span style={{ fontSize: '0.75rem', color: '#dbeafe' }}>{architectResult.atmosphere_and_context.lighting_source}</span>
                                            </div>
                                        </div>
                                    )}
                                    {architectResult.environment_and_depth && (
                                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px', padding: '0.75rem' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#c084fc', textTransform: 'uppercase' }}>Environment</span>
                                            <p style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '0.3rem', lineHeight: '1.4' }}>{architectResult.environment_and_depth.background_elements}</p>
                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                                <span style={{ fontSize: '0.55rem', color: '#d8b4fe' }}>Surface: </span>
                                                <span style={{ fontSize: '0.75rem', color: '#f3e8ff' }}>{architectResult.environment_and_depth.surface_interactions}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 6. Technical / Texture */}
                            {architectResult && architectResult.image_texture && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem', display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Quality</span>
                                        <p style={{ fontSize: '0.75rem', color: '#d1d5db' }}>{architectResult.image_texture.quality_defects}</p>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Camera</span>
                                        <p style={{ fontSize: '0.75rem', color: '#d1d5db' }}>{architectResult.image_texture.camera_characteristics}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* GENERATED IMAGE CONTAINER - Right Column */}
                {includeImage && (
                    <div style={{
                        ...panelStyle,
                        minHeight: '400px',
                        height: 'calc(100vh - 120px)',
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white' }}>Generated Result</h2>
                            {isGeneratingImage && <span style={{ fontSize: '0.7rem', color: '#eab308' }}>GENERATING...</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: batchSize > 1 ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                            {isGeneratingImage && generatedImages.length === 0 && (
                                <div style={{ aspectRatio: aspectRatio.replace(':', '/'), background: 'rgba(255,255,255,0.02)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#eab308', animation: 'spin 1s linear infinite' }} />
                                </div>
                            )}

                            {generatedImages.map((img, idx) => (
                                <div key={idx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                    {(img.url || img.b64_json) ? (
                                        <img
                                            src={img.url || `data:image/png;base64,${img.b64_json}`}
                                            alt={`Gen ${idx}`}
                                            style={{ width: '100%', height: 'auto', display: 'block' }}
                                        />
                                    ) : (
                                        <div style={{ padding: '1rem', color: '#f87171', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)' }}>
                                            {img.error || "Generation Failed"}
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '1rem', opacity: 0, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                    >
                                        <button style={{ background: 'white', color: 'black', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>SAVE</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CloneImage;
