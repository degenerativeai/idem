
import React, { useState, useEffect } from 'react';
import { ImageAspect, ImageProvider } from '../types';
import { generateImage } from '../services/imageGenerationService';
import { HEADSHOT_PROMPT, FULL_BODY_PROMPT } from '../prompts/workflowPrompts';

const ASPECTS: ImageAspect[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

interface VisionStructParserProps {
    onImagesComplete: (images: { source: string | null; headshot: string | null; bodyshot: string | null }) => void;
}

const VisionStructParser: React.FC<VisionStructParserProps> = ({ onImagesComplete }) => {
    // --- Configuration State ---
    const [provider, setProvider] = useState<ImageProvider>('google');
    const [wavespeedKey, setWavespeedKey] = useState('');
    const [googleKey, setGoogleKey] = useState(sessionStorage.getItem('gemini_api_key') || ''); // Load initial key
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('1:1');
    const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
    const [batchSize, setBatchSize] = useState(1);

    // --- Workflow State ---
    const [step, setStep] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Image Data ---
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [generatedHeadshots, setGeneratedHeadshots] = useState<string[]>([]);
    const [selectedHeadshot, setSelectedHeadshot] = useState<string | null>(null);

    const [generatedBodyshots, setGeneratedBodyshots] = useState<string[]>([]);
    const [selectedBodyshot, setSelectedBodyshot] = useState<string | null>(null);


    // --- Helpers ---
    const getApiKey = () => {
        if (provider === 'wavespeed') return wavespeedKey;
        // Check local state first, then session
        return googleKey || sessionStorage.getItem('gemini_api_key') || '';
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') {
                    setSourceImage(ev.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper to extract error message
    const formatError = (r: any) => {
        if (r.error) return r.error;
        if (!r.ok) return "Unknown Service Error";
        return null; // No error
    };

    // Generic Batch Generator
    const generateBatch = async (prompt: string, currentBatchSize: number): Promise<string[]> => {
        const currentKey = getApiKey();
        if (!currentKey) throw new Error(`Missing API Key for ${provider === 'google' ? 'Google Gemini' : 'Wavespeed'}`);

        const promises = Array(currentBatchSize).fill(0).map(() =>
            generateImage({
                provider, apiKey: currentKey, prompt,
                aspectRatio, resolution, referenceImages: sourceImage ? [sourceImage] : []
            })
        );
        const results = await Promise.all(promises);

        const firstError = results.find(r => !r.ok);
        if (firstError) throw new Error(formatError(firstError));

        const successImages = results.filter(r => r.ok && r.b64_json).map(r => `data:image/png;base64,${r.b64_json}`);
        if (successImages.length === 0) throw new Error("Generation failed: No images returned.");

        return successImages;
    };

    // Unified Workflow Handler
    const handleCreateReferences = async () => {
        if (!sourceImage) return;
        setIsProcessing(true);
        setError(null);

        try {
            // Run both in parallel for speed
            const [headshots, bodyshots] = await Promise.all([
                generateBatch(HEADSHOT_PROMPT, batchSize),
                generateBatch(FULL_BODY_PROMPT, batchSize)
            ]);

            setGeneratedHeadshots(headshots);
            const headshot = headshots[0];
            if (headshots.length === 1) setSelectedHeadshot(headshot);

            setGeneratedBodyshots(bodyshots);
            const bodyshot = bodyshots[0];
            if (bodyshots.length === 1) setSelectedBodyshot(bodyshot);

            setStep(4); // Ready

            // Notify Parent
            onImagesComplete({
                source: sourceImage,
                headshot: headshot, // Default to first if not explicitly selected yet, or update later?
                // Actually, if batch > 1, user might select one.
                // But for now let's pass the first one or the selected one if available.
                // Ideally we wait for user to select?
                // The requirements say "click Create References... then maybe copy the three images check the Dataset tab".
                // I will pass the *selected* ones if set, otherwise first.
                bodyshot: bodyshot
            });

        } catch (e: any) {
            console.error("Unified generation error:", e);
            setError(e.message || "Failed to generate references");
        } finally {
            setIsProcessing(false);
        }
    };

    // Effect to update parent when selection changes (if step is done)
    useEffect(() => {
        if (step >= 4 && (selectedHeadshot || selectedBodyshot)) {
            onImagesComplete({
                source: sourceImage,
                headshot: selectedHeadshot || generatedHeadshots[0] || null,
                bodyshot: selectedBodyshot || generatedBodyshots[0] || null
            });
        }
    }, [selectedHeadshot, selectedBodyshot, step, sourceImage, generatedHeadshots, generatedBodyshots, onImagesComplete]);


    // Individual Handlers for "Retry" logic
    const handleRetryHeadshots = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const headshots = await generateBatch(HEADSHOT_PROMPT, batchSize);
            setGeneratedHeadshots(headshots);
            if (headshots.length === 1) setSelectedHeadshot(headshots[0]);
            else setSelectedHeadshot(headshots[0]); // Auto-select first on retry
        } catch (e: any) { setError(e.message); } finally { setIsProcessing(false); }
    };

    const handleRetryBodyshots = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const bodyshots = await generateBatch(FULL_BODY_PROMPT, batchSize);
            setGeneratedBodyshots(bodyshots);
            if (bodyshots.length === 1) setSelectedBodyshot(bodyshots[0]);
            else setSelectedBodyshot(bodyshots[0]);
        } catch (e: any) { setError(e.message); } finally { setIsProcessing(false); }
    };


    return (
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Title Section */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                <h1 className="gradient-text" style={{
                    fontFamily: 'inherit',
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase'
                }}>
                    Create Identity
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Add your image here to create the perfect references for your LoRA training.
                </p>
            </div>

            {/* Settings Bar (Styled) */}
            <div className="settings-bar" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>SETTINGS</span>
                    <select value={provider} onChange={e => setProvider(e.target.value as ImageProvider)} className="settings-input">
                        <option value="google">Google Gemini</option>
                        <option value="wavespeed">Wavespeed</option>
                    </select>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as ImageAspect)} className="settings-input">
                        {ASPECTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={resolution} onChange={e => setResolution(e.target.value as any)} className="settings-input">
                        <option value="2k">2K Resolution</option> <option value="4k">4K Resolution</option>
                    </select>

                    {/* API Key Inputs */}
                    {provider === 'wavespeed' && (
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                placeholder="Wavespeed API Key"
                                value={wavespeedKey}
                                onChange={e => setWavespeedKey(e.target.value)}
                                className="settings-input"
                                style={{
                                    width: '200px',
                                    borderColor: wavespeedKey ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)',
                                    paddingRight: '2rem'
                                }}
                            />
                            {wavespeedKey && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-green)' }}>✓</span>}
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="error-message" style={{ color: '#ef4444', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}

            {/* ACTION ROW (Unified) */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '2rem', width: '100%' }}>

                {/* Primary Action: Create References */}
                <button
                    className="btn-primary"
                    onClick={handleCreateReferences}
                    disabled={!sourceImage || isProcessing}
                    style={{
                        opacity: sourceImage ? 1 : 0.5,
                        fontSize: '1.2rem',
                        padding: '1rem 2rem'
                    }}
                >
                    {isProcessing ? 'Generating References...' : 'Create References'}
                </button>
            </div>

            {/* RIGID 3-COLUMN LAYOUT */}
            <div className="workflow-layout" style={{ marginTop: '0' }}>

                {/* SLOT 1: SOURCE */}
                <div className={`image-slot ${sourceImage ? 'active' : 'empty'}`}>
                    <div className="slot-header">1. Source Image</div>
                    <div className="slot-content">
                        {sourceImage ? (
                            <img src={sourceImage} alt="Source" />
                        ) : (
                            <label className="upload-trigger">
                                <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden-input" />
                                <span style={{ fontSize: '2rem', opacity: 0.7 }}>+</span>
                                <span style={{ textAlign: 'center', lineHeight: '1.4' }}>
                                    Click or Drag<br />to Upload Source
                                </span>
                            </label>
                        )}
                    </div>
                </div>

                {/* SLOT 2: HEADSHOT */}
                <div className={`image-slot ${generatedHeadshots.length > 0 ? 'active' : 'empty'}`}>
                    <div className="slot-header">2. Headshot Reference</div>
                    <div className="slot-content" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                        {generatedHeadshots.length > 0 ? (
                            <>
                                <div style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                    <img src={selectedHeadshot || generatedHeadshots[0]} alt="Headshot" style={{ borderRadius: '8px', maxHeight: '100%' }} />
                                </div>
                                {/* Thumbnail Strip if multiple */}
                                {generatedHeadshots.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', height: '60px' }}>
                                        {generatedHeadshots.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                onClick={() => setSelectedHeadshot(img)}
                                                style={{
                                                    height: '100%',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: '4px',
                                                    border: selectedHeadshot === img ? '2px solid var(--accent-blue)' : 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Waiting for generation...</span>
                        )}
                    </div>
                </div>

                {/* SLOT 3: BODYSHOT */}
                <div className={`image-slot ${generatedBodyshots.length > 0 ? 'active' : 'empty'}`}>
                    <div className="slot-header">3. Bodyshot Reference</div>
                    <div className="slot-content" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                        {generatedBodyshots.length > 0 ? (
                            <>
                                <div style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                    <img src={selectedBodyshot || generatedBodyshots[0]} alt="Bodyshot" style={{ borderRadius: '8px', maxHeight: '100%' }} />
                                </div>
                                {generatedBodyshots.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', height: '60px' }}>
                                        {generatedBodyshots.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                onClick={() => setSelectedBodyshot(img)}
                                                style={{
                                                    height: '100%',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: '4px',
                                                    border: selectedBodyshot === img ? '2px solid var(--accent-blue)' : 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Waiting for generation...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisionStructParser;
