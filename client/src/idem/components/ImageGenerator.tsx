
import React, { useState } from 'react';
import { INIPrompt, UGCMode, ImageAspect, ImageProvider } from '../types';
import { analyzeImageINI, convertINIToPrompt } from '../services/geminiService';

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
    
    const [provider, setProvider] = useState<ImageProvider>('google');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('1:1');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

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
            value: 'inject' as UGCMode, 
            label: 'Inject External Character',
            desc: 'Keep Scene/Pose/Clothes. Strip Identity.'
        },
        { 
            value: 'text_prompt' as UGCMode, 
            label: 'Create Social Media Style Prompts',
            desc: 'Text-to-Prompt. Describe Vibe/Outfit.'
        }
    ];

    const needsUpload = mode === 'replicate' || mode === 'inject';

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

                <button
                    data-testid="button-generate-replica"
                    onClick={needsUpload ? handleAnalyzeImage : handleGenerateImage}
                    disabled={isAnalyzing || (needsUpload && !targetImage)}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: isAnalyzing ? '#374151' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: isAnalyzing || (needsUpload && !targetImage) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: (needsUpload && !targetImage) ? 0.5 : 1
                    }}
                >
                    {isAnalyzing ? (
                        <>
                            <div style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            {needsUpload ? 'Generate Replica Prompt' : 'Generate Image'}
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
                        {iniResult && (
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                                Prompt Ready
                            </span>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            data-testid="select-aspect-ratio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as ImageAspect)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
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
                                    <label style={labelStyle}>Generated Prompt</label>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        maxHeight: '200px',
                                        overflow: 'auto'
                                    }}>
                                        <pre style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: '#a5b4fc',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontFamily: 'monospace'
                                        }}>
                                            {iniResult.raw}
                                        </pre>
                                    </div>
                                    
                                    <div style={{ marginTop: '1rem' }}>
                                        <label style={labelStyle}>Flattened Prompt</label>
                                        <textarea
                                            data-testid="input-final-prompt"
                                            value={finalPrompt}
                                            onChange={(e) => setFinalPrompt(e.target.value)}
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                padding: '0.75rem',
                                                fontSize: '0.8rem',
                                                color: 'white',
                                                resize: 'vertical',
                                                outline: 'none'
                                            }}
                                        />
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
