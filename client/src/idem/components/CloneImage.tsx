
import React, { useState } from 'react';
import { VisualArchitectResult, ImageAspect } from '../types';
import { analyzeImageVisualArchitect, convertVisualArchitectToPrompt } from '../services/geminiService';

interface CloneImageProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const CloneImage: React.FC<CloneImageProps> = ({ identityImages }) => {
    const [targetImage, setTargetImage] = useState<string | null>(null);

    const [architectResult, setArchitectResult] = useState<VisualArchitectResult | null>(null);
    const [finalPrompt, setFinalPrompt] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<'full' | null>(null);

    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('source');

    const handleCopyFull = async () => {
        if (finalPrompt) {
            await navigator.clipboard.writeText(finalPrompt);
            setCopiedType('full');
            setTimeout(() => setCopiedType(null), 2000);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
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

    const handleAnalyzeImage = async () => {
        if (!targetImage) {
            setError("Please upload an image first");
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await analyzeImageVisualArchitect(targetImage);
            setArchitectResult(result);

            const fullPrompt = convertVisualArchitectToPrompt(result, false);
            setFinalPrompt(fullPrompt);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to analyze image");
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
            <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }} />
                    <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22c55e' }}>Clone Image</h2>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={labelStyle}>Upload Image to Clone</label>
                    </div>

                    <div
                        data-testid="upload-clone-image"
                        onClick={() => document.getElementById('clone-upload')?.click()}
                        style={{
                            aspectRatio: '4/3',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: targetImage ? '2px solid #22c55e' : '2px dashed #4b5563',
                            background: 'rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}
                    >
                        {targetImage ? (
                            <img src={targetImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Target" />
                        ) : (
                            <div style={{ textAlign: 'center', color: '#6b7280', padding: '1.5rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    margin: '0 auto 1rem',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </div>
                                <p style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e5e7eb', marginBottom: '0.25rem' }}>
                                    Upload Image to Clone
                                </p>
                                <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                    Analyze and recreate any image
                                </p>
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

                    <button
                        data-testid="button-analyze-clone"
                        onClick={handleAnalyzeImage}
                        disabled={isAnalyzing || !targetImage}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: (isAnalyzing || !targetImage) ? '#374151' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
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
                            marginTop: '0.75rem',
                            opacity: !targetImage ? 0.5 : 1
                        }}
                    >
                        {isAnalyzing ? (
                            <>
                                <div style={{
                                    width: '14px',
                                    height: '14px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                                Analyze Image
                            </>
                        )}
                    </button>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8" cy="8" r="2" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e5e7eb', margin: 0 }}>
                                Image Cloning
                            </p>
                            <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
                                Extract prompt from any image and recreate it
                            </p>
                        </div>
                    </div>
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

            <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            color: '#94a3b8',
                            letterSpacing: '0.05em'
                        }}>
                            Aspect Ratio
                        </span>
                        <select
                            data-testid="select-clone-aspect-ratio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: '#1a1d23',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#e5e7eb',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                outline: 'none',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2322c55e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.75rem center',
                                paddingRight: '2.5rem'
                            }}
                        >
                            <option value="source" style={{ background: '#1a1d23', color: '#e5e7eb' }}>Keep Source</option>
                            <option value="1:1" style={{ background: '#1a1d23', color: '#e5e7eb' }}>1:1</option>
                            <option value="16:9" style={{ background: '#1a1d23', color: '#e5e7eb' }}>16:9</option>
                            <option value="9:16" style={{ background: '#1a1d23', color: '#e5e7eb' }}>9:16</option>
                            <option value="4:3" style={{ background: '#1a1d23', color: '#e5e7eb' }}>4:3</option>
                            <option value="3:4" style={{ background: '#1a1d23', color: '#e5e7eb' }}>3:4</option>
                        </select>
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
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8" cy="8" r="2" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                            </div>
                            <p style={{ fontSize: '1rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                Ready to Clone
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                Upload an image and click Analyze to extract its prompt.
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
                                                    onClick={() => {
                                                        if (architectResult) {
                                                            navigator.clipboard.writeText(JSON.stringify(architectResult, null, 2));
                                                            setCopiedType('json');
                                                            setTimeout(() => setCopiedType(null), 2000);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '0.4rem 0.7rem',
                                                        borderRadius: '6px',
                                                        border: copiedType === 'json' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                                        background: copiedType === 'json' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                        color: copiedType === 'json' ? '#60a5fa' : '#9ca3af',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {copiedType === 'json' ? 'JSON Copied!' : 'Copy JSON'}
                                                </button>
                                                <button
                                                    data-testid="button-copy-clone-full"
                                                    onClick={handleCopyFull}
                                                    style={{
                                                        padding: copiedType === 'full' ? '0.5rem 1rem' : '0.4rem 0.75rem',
                                                        borderRadius: '6px',
                                                        border: copiedType === 'full' ? '2px solid #22c55e' : 'none',
                                                        background: copiedType === 'full' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.05)',
                                                        color: copiedType === 'full' ? '#4ade80' : '#9ca3af',
                                                        fontSize: copiedType === 'full' ? '0.75rem' : '0.65rem',
                                                        fontWeight: copiedType === 'full' ? '700' : '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s',
                                                        transform: copiedType === 'full' ? 'scale(1.05)' : 'scale(1)',
                                                        boxShadow: copiedType === 'full' ? '0 0 12px rgba(34, 197, 94, 0.5)' : 'none'
                                                    }}
                                                >
                                                    {copiedType === 'full' ? (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    )}
                                                    {copiedType === 'full' ? 'Copied!' : 'Copy Prompt'}
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
            </div>
        </div>
    );
};

export default CloneImage;
