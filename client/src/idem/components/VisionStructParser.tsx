
import React, { useState, useEffect, useRef } from 'react';
import { ImageAspect, ImageProvider } from '../types';
import { generateImage } from '../services/imageGenerationService';
import { HEADSHOT_PROMPT, FULL_BODY_PROMPT } from '../prompts/workflowPrompts';
import { IconSparkles, IconUser, IconTrash } from './Icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const ASPECTS: ImageAspect[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

interface CustomSelectProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    testId?: string;
}

function CustomSelect<T extends string>({ value, onChange, options, testId }: CustomSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div ref={ref} style={{ position: 'relative' }} data-testid={testId}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    background: 'rgba(88, 28, 135, 0.3)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.6rem',
                    fontSize: '0.75rem',
                    color: '#e9d5ff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '36px',
                    textAlign: 'left',
                    whiteSpace: 'nowrap'
                }}
            >
                <span>{selectedLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'rgb(30, 10, 50)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '0.5rem 0.6rem',
                                fontSize: '0.75rem',
                                color: value === option.value ? '#e9d5ff' : '#c4b5fd',
                                background: value === option.value ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                if (value !== option.value) {
                                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== option.value) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface VisionStructParserProps {
    onImagesComplete: (images: { source: string | null; headshot: string | null; bodyshot: string | null }) => void;
    onNavigateToDataset?: () => void;
}

const VisionStructParser: React.FC<VisionStructParserProps> = ({ onImagesComplete, onNavigateToDataset }) => {
    const [provider, setProvider] = useState<ImageProvider>('google');
    const [wavespeedKey, setWavespeedKey] = useState('');
    const [googleKey, setGoogleKey] = useState(sessionStorage.getItem('gemini_api_key') || '');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('1:1');
    const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
    const [batchSize, setBatchSize] = useState(1);

    const [step, setStep] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [generatedHeadshots, setGeneratedHeadshots] = useState<string[]>([]);
    const [selectedHeadshot, setSelectedHeadshot] = useState<string | null>(null);
    const [generatedBodyshots, setGeneratedBodyshots] = useState<string[]>([]);
    const [selectedBodyshot, setSelectedBodyshot] = useState<string | null>(null);

    const hasReferences = generatedHeadshots.length > 0 && generatedBodyshots.length > 0;

    const getApiKey = () => {
        if (provider === 'wavespeed') return wavespeedKey;
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

    const formatError = (r: any) => {
        if (r.error) return r.error;
        if (!r.ok) return "Unknown Service Error";
        return null;
    };

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

    const handleCreateReferences = async () => {
        if (!sourceImage) return;
        setIsProcessing(true);
        setError(null);

        try {
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

            setStep(4);

            onImagesComplete({
                source: sourceImage,
                headshot: headshot,
                bodyshot: bodyshot
            });

        } catch (e: any) {
            console.error("Unified generation error:", e);
            setError(e.message || "Failed to generate references");
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (step >= 4 && (selectedHeadshot || selectedBodyshot)) {
            onImagesComplete({
                source: sourceImage,
                headshot: selectedHeadshot || generatedHeadshots[0] || null,
                bodyshot: selectedBodyshot || generatedBodyshots[0] || null
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedHeadshot, selectedBodyshot, step]);

    const handleRetryHeadshots = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const headshots = await generateBatch(HEADSHOT_PROMPT, batchSize);
            setGeneratedHeadshots(headshots);
            if (headshots.length === 1) setSelectedHeadshot(headshots[0]);
            else setSelectedHeadshot(headshots[0]);
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

    const handleDownloadImages = async () => {
        const zip = new JSZip();
        const folder = zip.folder('identity_images');
        if (!folder) return;

        const addImageToZip = (dataUrl: string, name: string) => {
            const base64Data = dataUrl.split('base64,')[1];
            if (base64Data) {
                folder.file(name, base64Data, { base64: true });
            }
        };

        if (sourceImage) {
            addImageToZip(sourceImage, 'source.png');
        }

        generatedHeadshots.forEach((img, i) => {
            addImageToZip(img, `headshot_${i + 1}.png`);
        });

        generatedBodyshots.forEach((img, i) => {
            addImageToZip(img, `bodyshot_${i + 1}.png`);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'identity_images.zip');
    };

    const panelStyle: React.CSSProperties = {
        background: 'rgba(24, 26, 31, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
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

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'rgba(88, 28, 135, 0.3)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        color: '#e9d5ff',
        outline: 'none',
        transition: 'border-color 0.2s',
        minHeight: '36px'
    };


    const buttonPrimaryStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.75rem',
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        color: 'white',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: sourceImage && !isProcessing ? 1 : 0.5,
        letterSpacing: '0.05em'
    };

    const imageSlotStyle = (hasImage: boolean): React.CSSProperties => ({
        ...panelStyle,
        minHeight: '320px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        border: hasImage ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.08)',
        background: hasImage ? 'rgba(168, 85, 247, 0.05)' : 'rgba(24, 26, 31, 0.6)'
    });

    const uploadTriggerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        cursor: 'pointer',
        padding: '2rem',
        borderRadius: '12px',
        border: '2px dashed rgba(168, 85, 247, 0.4)',
        transition: 'all 0.2s',
        width: '100%',
        height: '100%',
        minHeight: '200px',
        background: 'rgba(168, 85, 247, 0.05)'
    };

    const startDatasetButtonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.6rem',
        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        color: 'white',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.05em',
        boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '1.5rem',
            maxWidth: '100%',
            margin: '0 auto',
            width: '100%',
            alignItems: 'flex-start',
            paddingTop: '1rem',
            paddingInline: '1rem'
        }}>
            <div style={{ flex: '1 1 280px', minWidth: '280px', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', background: '#a855f7', borderRadius: '50%' }} />
                    <h2 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a855f7' }}>
                        Create Identity
                    </h2>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                        <IconUser style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                        <span style={{ fontSize: '0.75rem', color: '#c4b5fd' }}>Reference Generation Settings</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Provider</label>
                            <CustomSelect
                                value={provider}
                                onChange={(value) => setProvider(value as ImageProvider)}
                                options={[
                                    { value: 'google', label: 'Nano Banana Pro' },
                                    { value: 'wavespeed', label: 'Wavespeed' }
                                ]}
                                testId="select-provider"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Aspect Ratio</label>
                            <CustomSelect
                                value={aspectRatio}
                                onChange={(value) => setAspectRatio(value as ImageAspect)}
                                options={ASPECTS.map(a => ({ value: a, label: a }))}
                                testId="select-aspect"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Resolution</label>
                            <CustomSelect
                                value={resolution}
                                onChange={(value) => setResolution(value as '2k' | '4k')}
                                options={[
                                    { value: '2k', label: '2K' },
                                    { value: '4k', label: '4K' }
                                ]}
                                testId="select-resolution"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Batch Size</label>
                            <CustomSelect
                                value={batchSize.toString()}
                                onChange={(value) => setBatchSize(parseInt(value))}
                                options={[
                                    { value: '1', label: '1 Image' },
                                    { value: '2', label: '2 Images' },
                                    { value: '3', label: '3 Images' },
                                    { value: '4', label: '4 Images' }
                                ]}
                                testId="select-batch"
                            />
                        </div>
                    </div>

                    {provider === 'wavespeed' && (
                        <div>
                            <label style={labelStyle}>Wavespeed API Key</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    placeholder="Enter your Wavespeed API Key"
                                    value={wavespeedKey}
                                    onChange={e => setWavespeedKey(e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        borderColor: wavespeedKey ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255,255,255,0.15)',
                                        paddingRight: '2rem'
                                    }}
                                    data-testid="input-wavespeed-key"
                                />
                                {wavespeedKey && (
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: '1rem' }}>✓</span>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleCreateReferences}
                        disabled={!sourceImage || isProcessing}
                        style={buttonPrimaryStyle}
                        data-testid="button-create-references"
                    >
                        <IconSparkles style={{ width: '16px', height: '16px' }} />
                        {isProcessing ? 'Generating References...' : 'Create References'}
                    </button>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5',
                            fontSize: '0.75rem'
                        }}>
                            {error}
                        </div>
                    )}
                </div>

                <div style={{
                    ...panelStyle,
                    background: 'rgba(168, 85, 247, 0.05)',
                    border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                    <p style={{ fontSize: '0.75rem', color: '#c4b5fd', lineHeight: '1.6', margin: 0 }}>
                        Already have your reference images? Go directly to the Dataset Generator tab to upload them and start creating your training dataset.
                    </p>
                    {onNavigateToDataset && (
                        <button
                            onClick={onNavigateToDataset}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                background: 'rgba(168, 85, 247, 0.2)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                color: '#c4b5fd',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            data-testid="button-go-to-dataset"
                        >
                            Go to Dataset Generator
                        </button>
                    )}
                </div>
            </div>

            <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    <div style={imageSlotStyle(!!sourceImage)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Source Image</span>
                        </div>
                        {sourceImage ? (
                            <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                <img src={sourceImage} alt="Source" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', objectFit: 'contain' }} />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSourceImage(null);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        right: '12px',
                                        background: 'rgba(220, 38, 38, 0.9)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        cursor: 'pointer',
                                        color: 'white',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.1) rotate(3deg)';
                                        e.currentTarget.style.background = '#ef4444';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                                    }}
                                    onMouseDown={(e) => {
                                        e.currentTarget.style.transform = 'scale(0.95)';
                                    }}
                                    onMouseUp={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.1) rotate(3deg)';
                                    }}
                                    title="Remove Image"
                                >
                                    <IconTrash style={{ width: '22px', height: '22px' }} />
                                </button>
                            </div>
                        ) : (
                            <label style={{
                                ...uploadTriggerStyle,
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '1rem'
                            }}>
                                <input type="file" onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} data-testid="input-source-upload" />
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid rgba(168, 85, 247, 0.4)',
                                    flexShrink: 0
                                }}>
                                    <span style={{ fontSize: '1.25rem', color: '#a855f7' }}>+</span>
                                </div>
                                <span style={{ textAlign: 'center', lineHeight: '1.4', color: '#c4b5fd', fontSize: '0.8rem', fontWeight: '500' }}>
                                    Drop your image here
                                </span>
                                <span style={{ textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>
                                    or click to browse
                                </span>
                                <span style={{ textAlign: 'center', color: '#a855f7', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                    Click Create References to begin
                                </span>
                            </label>
                        )}
                    </div>

                    <div style={imageSlotStyle(generatedHeadshots.length > 0)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Headshot Reference</span>
                        </div>
                        {generatedHeadshots.length > 0 ? (
                            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src={selectedHeadshot || generatedHeadshots[0]} alt="Headshot" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain' }} />
                                </div>
                                {generatedHeadshots.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', height: '50px' }}>
                                        {generatedHeadshots.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                onClick={() => setSelectedHeadshot(img)}
                                                style={{
                                                    height: '100%',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: '6px',
                                                    border: selectedHeadshot === img ? '2px solid #a855f7' : '2px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'border-color 0.2s'
                                                }}
                                                data-testid={`img-headshot-${i}`}
                                            />
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={handleRetryHeadshots}
                                    disabled={isProcessing}
                                    style={{ fontSize: '0.65rem', padding: '0.4rem 0.75rem', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', color: '#c4b5fd', cursor: 'pointer' }}
                                    data-testid="button-retry-headshots"
                                >
                                    Regenerate
                                </button>
                            </div>
                        ) : (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                                    Waiting for generation...
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={imageSlotStyle(generatedBodyshots.length > 0)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Bodyshot Reference</span>
                        </div>
                        {generatedBodyshots.length > 0 ? (
                            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src={selectedBodyshot || generatedBodyshots[0]} alt="Bodyshot" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain' }} />
                                </div>
                                {generatedBodyshots.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', height: '50px' }}>
                                        {generatedBodyshots.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                onClick={() => setSelectedBodyshot(img)}
                                                style={{
                                                    height: '100%',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: '6px',
                                                    border: selectedBodyshot === img ? '2px solid #a855f7' : '2px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'border-color 0.2s'
                                                }}
                                                data-testid={`img-bodyshot-${i}`}
                                            />
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={handleRetryBodyshots}
                                    disabled={isProcessing}
                                    style={{ fontSize: '0.65rem', padding: '0.4rem 0.75rem', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', color: '#c4b5fd', cursor: 'pointer' }}
                                    data-testid="button-retry-bodyshots"
                                >
                                    Regenerate
                                </button>
                            </div>
                        ) : (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                                    Waiting for generation...
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {hasReferences && onNavigateToDataset && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginTop: '1rem'
                    }}>
                        <button
                            onClick={onNavigateToDataset}
                            style={startDatasetButtonStyle}
                            data-testid="button-start-dataset"
                        >
                            <IconSparkles style={{ width: '16px', height: '16px' }} />
                            Build LoRA Dataset
                        </button>
                        <button
                            onClick={handleDownloadImages}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#a5b4fc',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            data-testid="button-download-images"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download Images
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisionStructParser;
