
import React, { useState } from 'react';
import { INIPrompt, UGCMode, ImageAspect, ImageProvider } from '../types';
import { analyzeImageINI, convertINIToPrompt, stripIdentityDescriptions } from '../services/geminiService';

interface ImageGeneratorProps {
    identityImages?: { headshot: string | null; bodyshot: string | null };
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ identityImages }) => {
    const [targetImage, setTargetImage] = useState<string | null>(null);
    const [mode, setMode] = useState<UGCMode>('replicate');
    const [styleMode, setStyleMode] = useState<'candid' | 'studio'>('candid');
    const [textPrompt, setTextPrompt] = useState('');
    
    const [iniResult, setIniResult] = useState<INIPrompt | null>(null);
    const [finalPrompt, setFinalPrompt] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<'all' | 'no-identity' | null>(null);
    
    const [provider, setProvider] = useState<ImageProvider>('google');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('source');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const handleCopyAll = async () => {
        if (iniResult?.raw) {
            await navigator.clipboard.writeText(iniResult.raw);
            setCopiedType('all');
            setTimeout(() => setCopiedType(null), 2000);
        }
    };
    
    const handleCopyNoIdentity = async () => {
        if (iniResult) {
            const strippedIni = stripINIIdentity(iniResult);
            await navigator.clipboard.writeText(strippedIni);
            setCopiedType('no-identity');
            setTimeout(() => setCopiedType(null), 2000);
        }
    };
    
    const stripINIIdentity = (ini: INIPrompt): string => {
        const lines: string[] = ['[IMAGE_PROMPT]'];
        
        if (ini.desc) lines.push(`[desc]  = ${stripIdentityDescriptions(ini.desc)}`);
        if (ini.objs) lines.push(`[objs]  = ${ini.objs}`);
        if (ini.chars) {
            const stripped = stripIdentityDescriptions(ini.chars);
            if (stripped) lines.push(`[chars] = ${stripped}`);
        }
        if (ini.style) lines.push(`[style] = ${ini.style}`);
        if (ini.comp) lines.push(`[comp]  = ${ini.comp}`);
        if (ini.light) lines.push(`[light] = ${ini.light}`);
        if (ini.pal) lines.push(`[pal]   = ${ini.pal}`);
        if (ini.geom) lines.push(`[geom]  = ${ini.geom}`);
        if (ini.micro) lines.push(`[micro] = ${ini.micro}`);
        if (ini.sym) lines.push(`[sym]   = ${ini.sym}`);
        if (ini.scene) lines.push(`[scene] = ${ini.scene}`);
        if (ini.must) {
            const stripped = stripIdentityDescriptions(ini.must);
            if (stripped) lines.push(`[must]  = ${stripped}`);
        }
        if (ini.avoid) lines.push(`[avoid] = ${ini.avoid}`);
        if (ini.notes) lines.push(`[notes] = ${ini.notes}`);
        
        return lines.join('\n');
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
            setIniResult(null);
            setFinalPrompt('');
            setGeneratedImage(null);
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
            const ini = await analyzeImageINI(targetImage);
            setIniResult(ini);
            
            const stripIdentity = mode === 'inject';
            const prompt = convertINIToPrompt(ini, stripIdentity);
            setFinalPrompt(prompt);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to analyze image");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateImage = async () => {
        const promptToUse = mode === 'text_prompt' ? textPrompt : finalPrompt;
        if (!promptToUse) {
            setError("No prompt available. Generate a replica prompt first or enter text.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const apiKey = sessionStorage.getItem('gemini_api_key');
            if (!apiKey) throw new Error("API key not found");
            
            const referenceImages: string[] = [];
            if (mode === 'inject' && identityImages?.headshot) {
                referenceImages.push(identityImages.headshot);
            } else if (mode === 'replicate' && targetImage) {
                referenceImages.push(targetImage);
            }
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
            
            const parts: any[] = [{ text: promptToUse }];
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

    const radioOptionStyle = (isActive: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        borderRadius: '12px',
        background: isActive ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.2)',
        border: isActive ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        transition: 'all 0.2s'
    });

    const modeOptions = [
        { 
            value: 'replicate' as UGCMode, 
            label: 'Replicate Uploaded Image',
            desc: 'Full forensic clone (Face, Body, Clothes, Scene)'
        },
        { 
            value: 'text_prompt' as UGCMode, 
            label: 'Create Social Media Style Prompts',
            desc: 'Text-to-Prompt. Describe Vibe/Outfit.'
        }
    ];

    const needsUpload = mode === 'replicate';

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
                    <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#eab308' }}>Context</h2>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={labelStyle}>Target Scene</label>
                        {needsUpload && !targetImage && (
                            <span style={{ fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                Upload Required
                            </span>
                        )}
                    </div>
                    
                    <div 
                        data-testid="upload-target-image"
                        onClick={() => document.getElementById('target-upload')?.click()}
                        style={{
                            aspectRatio: '4/3',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: targetImage ? '2px solid #a855f7' : '2px dashed #4b5563',
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
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </div>
                                <p style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e5e7eb', marginBottom: '0.25rem' }}>
                                    Upload Image to Replicate
                                </p>
                                <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                    Upload image to access Replicate and Inject modes
                                </p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            id="target-upload" 
                            hidden 
                            accept="image/*" 
                            onChange={handleImageUpload}
                        />
                    </div>
                    
                    {targetImage && (
                        <button
                            data-testid="button-analyze-image"
                            onClick={handleAnalyzeImage}
                            disabled={isAnalyzing}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: isAnalyzing ? '#374151' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginTop: '0.75rem'
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
                    )}
                </div>

                <div style={panelStyle}>
                    <label style={labelStyle}>Generation Mode</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {modeOptions.map(opt => (
                            <div
                                key={opt.value}
                                data-testid={`mode-${opt.value}`}
                                onClick={() => setMode(opt.value)}
                                style={radioOptionStyle(mode === opt.value)}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: mode === opt.value ? '2px solid #a855f7' : '2px solid #4b5563',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}>
                                    {mode === opt.value && (
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                                    )}
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e5e7eb', margin: 0 }}>
                                        {opt.label}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>
                                        {opt.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
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
                            data-testid="toggle-style-mode"
                            onClick={() => setStyleMode(s => s === 'candid' ? 'studio' : 'candid')}
                            style={{
                                width: '48px',
                                height: '26px',
                                borderRadius: '13px',
                                background: styleMode === 'studio' ? '#a855f7' : '#374151',
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

                {mode === 'text_prompt' && (
                    <div style={panelStyle}>
                        <label style={labelStyle}>Custom Prompt</label>
                        <textarea
                            data-testid="input-custom-prompt"
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                            placeholder="Describe the vibe, outfit, and scene you want..."
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                fontSize: '0.85rem',
                                color: 'white',
                                resize: 'vertical',
                                outline: 'none'
                            }}
                        />
                    </div>
                )}

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
                        {iniResult && (
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
                            data-testid="select-aspect-ratio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: aspectRatio === 'source' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.3)',
                                border: aspectRatio === 'source' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                color: aspectRatio === 'source' ? '#c4b5fd' : 'white',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: aspectRatio === 'source' ? '600' : '400'
                            }}
                        >
                            <option value="source">Keep Source</option>
                            <option value="1:1">1:1</option>
                            <option value="16:9">16:9</option>
                            <option value="9:16">9:16</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                </div>

                <div style={{
                    ...panelStyle,
                    minHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {!iniResult && !generatedImage && !isGenerating ? (
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
                                background: 'rgba(168, 85, 247, 0.1)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </div>
                            <p style={{ fontSize: '1rem', fontWeight: '500', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                Configured & Ready
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                Upload context or click Generate to begin.
                            </p>
                        </div>
                    ) : (
                        <>
                            {iniResult && (
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
                                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    INI Prompt
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>
                                                    gemini-2.5-pro
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    data-testid="button-copy-all"
                                                    onClick={handleCopyAll}
                                                    style={{
                                                        padding: copiedType === 'all' ? '0.5rem 1rem' : '0.4rem 0.75rem',
                                                        borderRadius: '6px',
                                                        border: copiedType === 'all' ? '2px solid #22c55e' : 'none',
                                                        background: copiedType === 'all' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.05)',
                                                        color: copiedType === 'all' ? '#4ade80' : '#9ca3af',
                                                        fontSize: copiedType === 'all' ? '0.75rem' : '0.65rem',
                                                        fontWeight: copiedType === 'all' ? '700' : '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s',
                                                        transform: copiedType === 'all' ? 'scale(1.05)' : 'scale(1)',
                                                        boxShadow: copiedType === 'all' ? '0 0 12px rgba(34, 197, 94, 0.5)' : 'none'
                                                    }}
                                                >
                                                    {copiedType === 'all' ? (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    )}
                                                    {copiedType === 'all' ? 'Copied!' : 'Copy All'}
                                                </button>
                                                <button
                                                    data-testid="button-copy-no-identity"
                                                    onClick={handleCopyNoIdentity}
                                                    style={{
                                                        padding: copiedType === 'no-identity' ? '0.5rem 1rem' : '0.4rem 0.75rem',
                                                        borderRadius: '6px',
                                                        border: copiedType === 'no-identity' ? '2px solid #a855f7' : 'none',
                                                        background: copiedType === 'no-identity' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.1)',
                                                        color: copiedType === 'no-identity' ? '#e9d5ff' : '#a855f7',
                                                        fontSize: copiedType === 'no-identity' ? '0.75rem' : '0.65rem',
                                                        fontWeight: copiedType === 'no-identity' ? '700' : '500',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s',
                                                        transform: copiedType === 'no-identity' ? 'scale(1.05)' : 'scale(1)',
                                                        boxShadow: copiedType === 'no-identity' ? '0 0 12px rgba(168, 85, 247, 0.5)' : 'none'
                                                    }}
                                                >
                                                    {copiedType === 'no-identity' ? (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <circle cx="12" cy="8" r="4" />
                                                            <path d="M5 20a7 7 0 0 1 14 0" />
                                                            <line x1="4" y1="4" x2="20" y2="20" />
                                                        </svg>
                                                    )}
                                                    {copiedType === 'no-identity' ? 'Copied!' : 'No Identity'}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                                            {iniResult.desc && (
                                                <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[desc]</span>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>{iniResult.desc}</p>
                                                </div>
                                            )}
                                            
                                            {iniResult.chars && (
                                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[chars]</span>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>{iniResult.chars}</p>
                                                </div>
                                            )}
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {iniResult.comp && (
                                                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[comp]</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>{iniResult.comp}</p>
                                                    </div>
                                                )}
                                                
                                                {iniResult.light && (
                                                    <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[light]</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>{iniResult.light}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {iniResult.scene && (
                                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[scene]</span>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>{iniResult.scene}</p>
                                                </div>
                                            )}
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {iniResult.style && (
                                                    <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[style]</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>{iniResult.style}</p>
                                                    </div>
                                                )}
                                                
                                                {iniResult.pal && (
                                                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[pal]</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>{iniResult.pal}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {iniResult.must && (
                                                <div style={{ background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[must]</span>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>{iniResult.must}</p>
                                                </div>
                                            )}
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {iniResult.objs && (
                                                    <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[objs]</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.4' }}>{iniResult.objs}</p>
                                                    </div>
                                                )}
                                                
                                                {iniResult.geom && (
                                                    <div style={{ background: 'rgba(107, 114, 128, 0.1)', border: '1px solid rgba(107, 114, 128, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[geom]</span>
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.4' }}>{iniResult.geom}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {iniResult.avoid && (
                                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>[avoid]</span>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.4' }}>{iniResult.avoid}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <button
                                        data-testid="button-generate-image"
                                        onClick={handleGenerateImage}
                                        disabled={isGenerating || !finalPrompt}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: isGenerating ? '#374151' : '#eab308',
                                            color: isGenerating ? '#9ca3af' : 'black',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            cursor: isGenerating || !finalPrompt ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Image'}
                                    </button>
                                </div>
                            )}
                            
                            {isGenerating && (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        border: '3px solid rgba(168, 85, 247, 0.2)',
                                        borderTopColor: '#a855f7',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                </div>
                            )}
                            
                            {generatedImage && (
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Generated Result</label>
                                    <div style={{
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(168, 85, 247, 0.3)'
                                    }}>
                                        <img 
                                            src={generatedImage} 
                                            alt="Generated" 
                                            style={{ 
                                                width: '100%', 
                                                height: 'auto',
                                                display: 'block'
                                            }} 
                                        />
                                    </div>
                                    <div style={{ 
                                        marginTop: '1rem',
                                        display: 'flex',
                                        gap: '0.75rem'
                                    }}>
                                        <button
                                            data-testid="button-download-image"
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = generatedImage;
                                                link.download = `ugc-${Date.now()}.png`;
                                                link.click();
                                            }}
                                            style={{
                                                padding: '0.6rem 1.25rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                                background: 'rgba(168, 85, 247, 0.15)',
                                                color: '#c4b5fd',
                                                fontSize: '0.8rem',
                                                fontWeight: '500',
                                                cursor: 'pointer',
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
                                        </button>
                                        <button
                                            data-testid="button-regenerate"
                                            onClick={handleGenerateImage}
                                            style={{
                                                padding: '0.6rem 1.25rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(0,0,0,0.3)',
                                                color: '#9ca3af',
                                                fontSize: '0.8rem',
                                                fontWeight: '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Regenerate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ImageGenerator;
