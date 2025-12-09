import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PromptItem, ImageProvider, ImageAspect } from '../types';
import { analyzeSubjectImages, generateDatasetPrompts } from '../services/geminiService';
import { generateImage } from '../services/imageGenerationService';
import { apiService } from '../services/apiService';
import type { IdentityProfile, Dataset } from '@shared/schema';
import {
    IconSparkles, IconUser, IconEdit, IconDownload, IconFlame, IconShirt
} from './Icons';
import { PromptCard } from './PromptCard';

interface DatasetGeneratorProps {
    inputIdentity: any;
    inputImages: { source: string | null; headshot: string | null; bodyshot: string | null };
    onAnalysisComplete: (result: any) => void;
}

type GeneratorMode = 'manual' | 'api';

const DatasetGenerator: React.FC<DatasetGeneratorProps> = ({ inputIdentity, inputImages, onAnalysisComplete }) => {
    const [mode, setMode] = useState<GeneratorMode>('manual');
    const [safetyMode, setSafetyMode] = useState<'sfw' | 'nsfw'>('sfw');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [provider, setProvider] = useState<ImageProvider>('google');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('1:1');
    const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
    const [wavespeedApiKey, setWavespeedApiKey] = useState('');

    const [identity, setIdentity] = useState<any>(inputIdentity);
    const [datasetPrompts, setDatasetPrompts] = useState<PromptItem[]>([]);

    const [savedIdentityId, setSavedIdentityId] = useState<string | null>(null);
    const [savedDatasetId, setSavedDatasetId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedIdentities, setSavedIdentities] = useState<IdentityProfile[]>([]);
    const [savedDatasets, setSavedDatasets] = useState<Dataset[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [localHeadshot, setLocalHeadshot] = useState<string | null>(null);
    const [localBodyshot, setLocalBodyshot] = useState<string | null>(null);

    const effectiveHeadshot = localHeadshot || inputImages.headshot;
    const effectiveBodyshot = localBodyshot || inputImages.bodyshot;

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);

    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [batchZipBlob, setBatchZipBlob] = useState<Blob | null>(null);
    const [isBatchComplete, setIsBatchComplete] = useState(false);
    const [targetTotal, setTargetTotal] = useState(100);
    const [apiBatchSize, setApiBatchSize] = useState(25);

    // Tactile Handlers & Styles
    const buttonBaseStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.6rem',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.05em',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        color: 'white'
    };

    const handleBtnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.filter = 'brightness(1.1)';
    };
    const handleBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.filter = 'brightness(1)';
    };
    const handleBtnDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.transform = 'scale(0.98)';
    };
    const handleBtnUp = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.transform = 'scale(1.02)';
    };

    useEffect(() => {
        if (inputIdentity) {
            setIdentity(inputIdentity);
        }
    }, [inputIdentity]);

    useEffect(() => {
        loadSavedData();
    }, []);

    useEffect(() => {
        if (datasetPrompts.length > 0) {
            setDatasetPrompts([]);
            setBatchZipBlob(null);
            setIsBatchComplete(false);
            console.log(`Safety mode changed to ${safetyMode}, clearing existing prompts`);
        }
    }, [safetyMode]);

    const loadSavedData = async () => {
        setIsLoadingData(true);
        try {
            const [identities, datasets] = await Promise.all([
                apiService.listIdentityProfiles(),
                apiService.listDatasets()
            ]);
            setSavedIdentities(identities);
            setSavedDatasets(datasets);
        } catch (e: any) {
            console.error('Failed to load saved data:', e);
        } finally {
            setIsLoadingData(false);
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

    const handleAnalyzeProfile = async () => {
        if (!effectiveHeadshot || !effectiveBodyshot) {
            setAnalysisError("Missing reference images.");
            return;
        }
        const apiKey = sessionStorage.getItem('gemini_api_key');
        if (!apiKey) {
            setAnalysisError("Please set your Gemini API key in Settings first.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const result = await analyzeSubjectImages(effectiveHeadshot, effectiveBodyshot);
            setIdentity(result);
            onAnalysisComplete(result);
        } catch (e: any) {
            console.error("Gemini Analysis Error:", e);
            setAnalysisError(e.message || "Analysis failed. Check API key.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveIdentity = async () => {
        if (!identity || !identity.identity_profile) {
            setSaveError("No identity profile to save");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            const savedProfile = await apiService.createIdentityProfile({
                uid: identity.identity_profile.name,
                identityProfile: identity.identity_profile,
                headshotImage: effectiveHeadshot || null,
                bodyshotImage: effectiveBodyshot || null,
                sourceImage: inputImages.source || null,
            });
            setSavedIdentityId(savedProfile.id);
            await loadSavedData();
        } catch (e: any) {
            console.error('Save identity error:', e);
            setSaveError(e.message || 'Failed to save identity');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadIdentity = async (profileId: string) => {
        setIsLoadingData(true);
        setSaveError(null);
        try {
            const profile = await apiService.getIdentityProfile(profileId);
            setIdentity({ identity_profile: profile.identityProfile });
            setSavedIdentityId(profile.id);
            if (profile.headshotImage) setLocalHeadshot(profile.headshotImage);
            if (profile.bodyshotImage) setLocalBodyshot(profile.bodyshotImage);
            onAnalysisComplete({ identity_profile: profile.identityProfile });
        } catch (e: any) {
            console.error('Load identity error:', e);
            setSaveError(e.message || 'Failed to load identity');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSaveDataset = async () => {
        if (!savedIdentityId) {
            setSaveError("Please save the identity profile first");
            return;
        }
        if (datasetPrompts.length === 0) {
            setSaveError("No prompts to save");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            const datasetName = `Dataset ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
            const savedDataset = await apiService.createDataset({
                identityId: savedIdentityId,
                name: datasetName,
                prompts: datasetPrompts,
                safetyMode: safetyMode,
                targetTotal: targetTotal,
                generatedCount: 0,
            });
            setSavedDatasetId(savedDataset.id);
            await loadSavedData();
        } catch (e: any) {
            console.error('Save dataset error:', e);
            setSaveError(e.message || 'Failed to save dataset');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadDataset = async (datasetId: string) => {
        setIsLoadingData(true);
        setSaveError(null);
        try {
            const dataset = await apiService.getDataset(datasetId);
            setDatasetPrompts(dataset.prompts as PromptItem[]);
            setSafetyMode(dataset.safetyMode as 'sfw' | 'nsfw');
            setTargetTotal(dataset.targetTotal);
            setSavedDatasetId(dataset.id);
            setSavedIdentityId(dataset.identityId);
            const profile = await apiService.getIdentityProfile(dataset.identityId);
            setIdentity({ identity_profile: profile.identityProfile });
            if (profile.headshotImage) setLocalHeadshot(profile.headshotImage);
            if (profile.bodyshotImage) setLocalBodyshot(profile.bodyshotImage);
            onAnalysisComplete({ identity_profile: profile.identityProfile });
        } catch (e: any) {
            console.error('Load dataset error:', e);
            setSaveError(e.message || 'Failed to load dataset');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleGeneratePrompts = async () => {
        if (!identity || !identity.identity_profile) return;
        const apiKey = sessionStorage.getItem('gemini_api_key');
        if (!apiKey) {
            setPromptError("Please set your Gemini API key in Settings first.");
            return;
        }
        setIsGeneratingPrompts(true);
        setPromptError(null);
        setDatasetPrompts([]);
        try {
            const batchSize = Math.min(10, targetTotal);
            const prompts = await generateDatasetPrompts({
                taskType: 'lora',
                subjectDescription: identity.identity_profile.body_stack,
                identity: {
                    name: identity.identity_profile.name,
                    age_estimate: identity.identity_profile.age_estimate,
                    profession: identity.identity_profile.archetype_anchor,
                    backstory: identity.identity_profile.realism_stack
                },
                safetyMode: safetyMode,
                count: batchSize,
                startCount: 0,
                totalTarget: targetTotal,
                previousSettings: []
            });
            setDatasetPrompts(prompts);
        } catch (e: any) {
            console.error("Prompt Gen Error", e);
            setPromptError(`Error: ${e.message || "Failed to generate prompts"}`);
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    const handleGenerateNextBatch = async () => {
        if (!identity || !identity.identity_profile) return;
        setIsGeneratingPrompts(true);
        setPromptError(null);
        try {
            const currentCount = datasetPrompts.length;
            const remaining = targetTotal - currentCount;
            if (remaining <= 0) return;
            const batchSize = Math.min(ITEMS_PER_PAGE, remaining);
            const prompts = await generateDatasetPrompts({
                taskType: 'lora',
                subjectDescription: identity.identity_profile.body_stack,
                identity: {
                    name: identity.identity_profile.name,
                    age_estimate: identity.identity_profile.age_estimate,
                    profession: identity.identity_profile.archetype_anchor,
                    backstory: identity.identity_profile.realism_stack
                },
                safetyMode: safetyMode,
                count: batchSize,
                startCount: currentCount,
                totalTarget: targetTotal,
                previousSettings: datasetPrompts.map(p => p.prompt)
            });
            if (prompts.length === 0) {
                setPromptError("Generated 0 prompts. Please try again.");
            } else {
                setDatasetPrompts(prev => [...prev, ...prompts]);
                setCurrentPage(prev => prev + 1);
            }
        } catch (e: any) {
            console.error("Prompt Gen Error", e);
            setPromptError(`Error: ${e.message || "Failed to generate more prompts"}`);
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    const topOfListRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (topOfListRef.current) {
            topOfListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentPage]);

    const handleUpdatePrompt = (id: string, newText: string) => {
        setDatasetPrompts(prev => prev.map(p => {
            if ((p.id && p.id === id) || (!p.id && p.prompt === id)) {
                return { ...p, prompt: newText };
            }
            return p;
        }));
    };

    const handleToggleCopy = (id: string) => {
        setDatasetPrompts(prev => prev.map(p => {
            if ((p.id && p.id === id) || (!p.id && p.prompt === id)) {
                return { ...p, isCopied: !p.isCopied };
            }
            return p;
        }));
    };

    const extractPromptFromItem = (item: PromptItem): string => {
        try {
            const parsed = JSON.parse(item.text);
            return parsed.generation_data?.final_prompt_string || parsed.prompt || item.text;
        } catch {
            return item.text;
        }
    };

    const handleBatchGeneration = async () => {
        setIsBatchProcessing(true);
        setPromptError(null);
        setIsBatchComplete(false);
        setBatchZipBlob(null);
        let promptsToProcess = datasetPrompts;
        if (promptsToProcess.length === 0) {
            try {
                const prompts = await generateDatasetPrompts({
                    taskType: 'lora',
                    subjectDescription: identity.identity_profile.body_stack,
                    identity: {
                        name: identity.identity_profile.name,
                        age_estimate: identity.identity_profile.age_estimate,
                        profession: identity.identity_profile.archetype_anchor,
                        backstory: identity.identity_profile.realism_stack
                    },
                    safetyMode: safetyMode,
                    count: apiBatchSize,
                    startCount: 0,
                    totalTarget: apiBatchSize,
                    previousSettings: []
                });
                setDatasetPrompts(prompts);
                promptsToProcess = prompts;
            } catch (e: any) {
                console.error("Auto-Prompt Gen Error", e);
                setPromptError("Failed to auto-generate prompts: " + e.message);
                setIsBatchProcessing(false);
                return;
            }
        }
        if (promptsToProcess.length === 0) {
            setPromptError("No prompts available to process.");
            setIsBatchProcessing(false);
            return;
        }
        const limit = mode === 'api' ? Math.min(promptsToProcess.length, apiBatchSize) : promptsToProcess.length;
        setBatchProgress({ current: 0, total: limit });
        const zip = new JSZip();
        zip.file("prompts.json", JSON.stringify(promptsToProcess, null, 2));
        zip.file("identity_profile.json", JSON.stringify(identity, null, 2));
        const imgFolder = zip.folder("images");
        let apiKey = sessionStorage.getItem('gemini_api_key') || '';
        if (provider === 'wavespeed') apiKey = wavespeedApiKey;
        try {
            const failedItems: { item: PromptItem; idx: number }[] = [];
            let successCount = 0;
            const BATCH_SIZE = 5;
            for (let i = 0; i < limit; i += BATCH_SIZE) {
                const chunk = promptsToProcess.slice(i, Math.min(i + BATCH_SIZE, limit));
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(limit / BATCH_SIZE);
                console.log(`Processing batch ${batchNum}/${totalBatches} (items ${i + 1}-${Math.min(i + BATCH_SIZE, limit)} of ${limit})`);

                await Promise.all(chunk.map(async (item, chunkIdx) => {
                    const globalIdx = i + chunkIdx;
                    if (globalIdx >= limit) return;
                    try {
                        const promptText = extractPromptFromItem(item);
                        const result = await generateImage({
                            provider,
                            apiKey,
                            prompt: promptText,
                            aspectRatio,
                            resolution,
                            referenceImages: effectiveHeadshot ? [effectiveHeadshot] : []
                        });
                        if (result.ok && result.b64_json) {
                            const shotType = item.generationMeta?.type || 'generated';
                            const filename = `${globalIdx + 1}_${shotType}.png`;
                            imgFolder?.file(filename, result.b64_json, { base64: true });
                            successCount++;
                        } else {
                            console.warn(`Item ${globalIdx + 1} failed initially: ${result.error || 'Unknown error'}`);
                            failedItems.push({ item, idx: globalIdx });
                        }
                    } catch (e) {
                        console.warn(`Item ${globalIdx + 1} error:`, e);
                        failedItems.push({ item, idx: globalIdx });
                    }
                }));
                setBatchProgress({ current: Math.min(i + BATCH_SIZE, limit), total: limit });
            }
            if (failedItems.length > 0) {
                console.log(`Retrying ${failedItems.length} failed items...`);
                for (const fail of failedItems) {
                    try {
                        const promptText = extractPromptFromItem(fail.item);
                        const result = await generateImage({
                            provider,
                            apiKey,
                            prompt: promptText,
                            aspectRatio,
                            resolution,
                            referenceImages: effectiveHeadshot ? [effectiveHeadshot] : []
                        });
                        if (result.ok && result.b64_json) {
                            const shotType = fail.item.generationMeta?.type || 'generated';
                            const filename = `${fail.idx + 1}_${shotType}_retry.png`;
                            imgFolder?.file(filename, result.b64_json, { base64: true });
                            successCount++;
                        } else {
                            console.error(`Item ${fail.idx + 1} failed again: ${result.error || 'Unknown error'}`);
                        }
                    } catch (e) {
                        console.error(`Item ${fail.idx + 1} retry error:`, e);
                    }
                }
            }
            console.log(`Batch complete: ${successCount}/${limit} images generated successfully`);
            const content = await zip.generateAsync({ type: "blob" });
            setBatchZipBlob(content);
            setIsBatchComplete(true);
        } catch (e: any) {
            console.error(e);
            setPromptError(e.message);
        } finally {
            setIsBatchProcessing(false);
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

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        color: 'white',
        outline: 'none',
        transition: 'border-color 0.2s',
        minHeight: '36px'
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        background: 'rgba(88, 28, 135, 0.3)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        color: '#e9d5ff',
        outline: 'none',
        cursor: 'pointer',
        minHeight: '36px',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c4b5fd' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        paddingRight: '2rem'
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
            {/* Sidebar Column (Span 4) */}
            <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Mode Selection */}
                <div style={panelStyle}>
                    <label style={labelStyle}>Generation Mode</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button
                            onClick={() => setMode('manual')}
                            style={{
                                ...buttonBaseStyle,
                                padding: '1rem',
                                background: mode === 'manual' ? '#a855f7' : 'rgba(0,0,0,0.3)',
                                border: mode === 'manual' ? '1px solid #c084fc' : '1px solid transparent',
                                color: 'white',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                            <IconEdit style={{ width: '24px', opacity: mode === 'manual' ? 1 : 0.5 }} />
                            <span>Manual Creation</span>
                        </button>
                        <button
                            onClick={() => setMode('api')}
                            style={{
                                ...buttonBaseStyle,
                                padding: '1rem',
                                background: mode === 'api' ? '#ea580c' : 'rgba(0,0,0,0.3)',
                                border: mode === 'api' ? '1px solid #fb923c' : '1px solid transparent',
                                color: 'white',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                            <IconSparkles style={{ width: '24px', opacity: mode === 'api' ? 1 : 0.5 }} />
                            <span>Batch Generation</span>
                        </button>
                    </div>

                    {/* Persistent Mode Descriptions */}
                    <div style={{ minHeight: '3rem', fontSize: '0.75rem', color: '#9ca3af', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem', marginTop: '0.25rem' }}>
                        {mode === 'manual' ? (
                            "Generate text prompts one by one. Best for refining the identity and testing different scenarios before committing to images."
                        ) : (
                            "Automatically generate prompts and send them to the image provider API for bulk processing. Best for large-scale dataset creation."
                        )}
                    </div>
                </div>

                {/* Manual Mode Controls */}
                {mode === 'manual' && (
                    <div style={panelStyle} className="animate-fade-in-up">
                        <div style={{ marginTop: '0.5rem' }}>
                            <label style={labelStyle}>Wardrobe Style</label>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button onClick={() => setSafetyMode('sfw')} data-testid="button-safety-sfw" onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp} style={{ ...buttonBaseStyle, padding: '0.5rem', flex: 1, borderRadius: '0.35rem', background: safetyMode === 'sfw' ? '#3b82f6' : 'transparent', color: safetyMode === 'sfw' ? 'white' : '#94a3b8', boxShadow: 'none' }}>
                                    <IconShirt style={{ width: '14px', color: safetyMode === 'sfw' ? 'white' : '#a855f7' }} /> Everyday
                                </button>
                                <button onClick={() => setSafetyMode('nsfw')} data-testid="button-safety-nsfw" onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp} style={{ ...buttonBaseStyle, padding: '0.5rem', flex: 1, borderRadius: '0.35rem', background: safetyMode === 'nsfw' ? '#ef4444' : 'transparent', color: safetyMode === 'nsfw' ? 'white' : '#94a3b8', boxShadow: 'none' }}>
                                    <IconFlame style={{ width: '14px', color: safetyMode === 'nsfw' ? 'white' : '#ef4444' }} /> Racy
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', marginTop: '1rem' }}>
                            <span>Target Count</span>
                            <span style={{ color: 'white' }}>{targetTotal} Prompts</span>
                        </div>
                        <input type="range" min="10" max="100" step="10" value={targetTotal} onChange={(e) => setTargetTotal(Number(e.target.value))} style={{ width: '100%', marginBottom: '1rem' }} data-testid="slider-target-total" />
                        <button
                            onClick={handleGeneratePrompts}
                            disabled={isGeneratingPrompts || !identity}
                            data-testid="button-generate-prompts"
                            onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                            style={{ ...buttonBaseStyle, width: '100%', padding: '1rem', background: isGeneratingPrompts || !identity ? '#374151' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: isGeneratingPrompts || !identity ? '#9ca3af' : 'white', cursor: isGeneratingPrompts || !identity ? 'default' : 'pointer' }}>
                            {isGeneratingPrompts ? 'Synthesizing...' : (datasetPrompts.length > 0 ? 'Restart Generation' : 'Start Generation')}
                        </button>
                        {promptError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{promptError}</p>}
                    </div>
                )}

                {/* Batch Mode Controls */}
                {mode === 'api' && (
                    <div style={panelStyle} className="animate-fade-in-up">
                        <div>
                            <label style={labelStyle}>Provider</label>
                            <select value={provider} onChange={(e) => setProvider(e.target.value as ImageProvider)} style={selectStyle} data-testid="select-provider">
                                <option value="google" style={{ background: '#1e1030', color: '#e9d5ff' }}>Google Gemini</option>
                                <option value="wavespeed" style={{ background: '#1e1030', color: '#e9d5ff' }}>Wavespeed.ai</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Quality</label>
                            <select value={resolution} onChange={(e) => setResolution(e.target.value as any)} style={selectStyle} data-testid="select-resolution">
                                <option value="2k" style={{ background: '#1e1030', color: '#e9d5ff' }}>2K (Standard)</option>
                                <option value="4k" style={{ background: '#1e1030', color: '#e9d5ff' }}>4K (High Res)</option>
                            </select>
                        </div>
                        {provider === 'wavespeed' && (
                            <div>
                                <label style={labelStyle}>API Key</label>
                                <input type="password" value={wavespeedApiKey} onChange={(e) => setWavespeedApiKey(e.target.value)} placeholder="Wavespeed Key" style={inputStyle} data-testid="input-wavespeed-key" />
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={labelStyle}>Aspect Ratio</label>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as ImageAspect)} style={selectStyle} data-testid="select-aspect-ratio">
                                    <option value="1:1" style={{ background: '#1e1030', color: '#e9d5ff' }}>1:1 (Square)</option>
                                    <option value="4:3" style={{ background: '#1e1030', color: '#e9d5ff' }}>4:3</option>
                                    <option value="3:4" style={{ background: '#1e1030', color: '#e9d5ff' }}>3:4</option>
                                    <option value="16:9" style={{ background: '#1e1030', color: '#e9d5ff' }}>16:9</option>
                                    <option value="9:16" style={{ background: '#1e1030', color: '#e9d5ff' }}>9:16</option>
                                </select>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                    <span>Batch Size</span>
                                    <span style={{ color: 'white' }}>{apiBatchSize}</span>
                                </div>
                                <input type="range" min="10" max="100" step="10" value={apiBatchSize} onChange={(e) => setApiBatchSize(Number(e.target.value))} style={{ width: '100%' }} data-testid="slider-batch-size" />
                            </div>
                        </div>
                        <button
                            onClick={handleBatchGeneration}
                            disabled={isBatchProcessing || !identity}
                            data-testid="button-submit-api"
                            onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                            style={{ ...buttonBaseStyle, width: '100%', padding: '1rem', background: isBatchProcessing || !identity ? '#374151' : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: isBatchProcessing || !identity ? '#9ca3af' : 'black', cursor: isBatchProcessing || !identity ? 'default' : 'pointer', marginTop: '0.5rem' }}>
                            {isBatchProcessing ? 'Processing Batch...' : <><IconSparkles style={{ width: '16px', color: 'black' }} /> Submit Prompts to API</>}
                        </button>
                        {promptError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{promptError}</p>}
                    </div>
                )}

                {/* Saved Data Panel */}
                {(savedIdentities.length > 0 || savedDatasets.length > 0) && (
                    <div style={panelStyle}>
                        <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Saved Data Available</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <label style={labelStyle}>Identities ({savedIdentities.length})</label>
                                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {savedIdentities.map(profile => (
                                        <div key={profile.id} onClick={() => handleLoadIdentity(profile.id)} data-testid={`card-identity-${profile.id}`}
                                            style={{ padding: '0.5rem', background: savedIdentityId === profile.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.3)', borderRadius: '6px', cursor: 'pointer', border: savedIdentityId === profile.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'white' }}>{(profile.identityProfile as any)?.name || 'Unknown'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Datasets ({savedDatasets.length})</label>
                                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {savedDatasets.map(dataset => (
                                        <div key={dataset.id} onClick={() => handleLoadDataset(dataset.id)} data-testid={`card-dataset-${dataset.id}`}
                                            style={{ padding: '0.5rem', background: savedDatasetId === dataset.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.3)', borderRadius: '6px', cursor: 'pointer', border: savedDatasetId === dataset.id ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'white' }}>{dataset.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {saveError && <p style={{ color: '#ef4444', fontSize: '0.7rem' }}>{saveError}</p>}
                    </div>
                )}

                {/* Context References Panel (Identity) */}
                <div style={panelStyle}>
                    <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(30, 58, 138, 0.2)', border: '1px solid rgba(30, 58, 138, 0.5)' }}>
                        <IconUser style={{ width: '20px', height: '20px', color: '#60a5fa', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#bfdbfe', textTransform: 'uppercase' }}>Context References</p>
                            <p style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>Core identity data.</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Headshot</label>
                            <div style={{ aspectRatio: '1', borderRadius: '0.75rem', overflow: 'hidden', border: effectiveHeadshot ? '2px solid #a855f7' : '2px dashed #4b5563', background: 'rgba(0,0,0,0.2)', position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('head-upload')?.click()}>
                                {effectiveHeadshot ? (
                                    <img src={effectiveHeadshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Headshot" />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.65rem', flexDirection: 'column' }}>
                                        <span>Click to Upload</span>
                                    </div>
                                )}
                                <input type="file" id="head-upload" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'head')} data-testid="input-headshot" />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Full Body</label>
                            <div style={{ aspectRatio: '1', borderRadius: '0.75rem', overflow: 'hidden', border: effectiveBodyshot ? '2px solid #a855f7' : '2px dashed #4b5563', background: 'rgba(0,0,0,0.2)', position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('body-upload')?.click()}>
                                {effectiveBodyshot ? (
                                    <img src={effectiveBodyshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Body" />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.65rem', flexDirection: 'column' }}>
                                        <span>Click to Upload</span>
                                    </div>
                                )}
                                <input type="file" id="body-upload" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'body')} data-testid="input-bodyshot" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAnalyzeProfile}
                        disabled={isAnalyzing || (!effectiveHeadshot && !effectiveBodyshot)}
                        data-testid="button-analyze-profile"
                        onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                        style={{ ...buttonBaseStyle, width: '100%', marginTop: '0.5rem', background: isAnalyzing ? '#374151' : 'linear-gradient(to right, #374151, #1f2937)', color: isAnalyzing ? '#9ca3af' : 'white', cursor: isAnalyzing ? 'wait' : 'pointer' }}>
                        {isAnalyzing ? 'Analyzing...' : <><IconSparkles style={{ width: '14px', color: '#facc15' }} /> Analyze Profile</>}
                    </button>
                    {analysisError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>{analysisError}</p>}
                </div>

                {/* Identity Details */}
                <div style={panelStyle} className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Name</label>
                            <input readOnly value={identity?.identity_profile?.name || ''} placeholder="Waiting..." style={{ ...inputStyle, color: identity?.identity_profile?.name ? 'white' : '#64748b' }} data-testid="input-identity-name" />
                        </div>
                        <div>
                            <label style={labelStyle}>Age</label>
                            <input readOnly value={identity?.identity_profile?.age_estimate || ''} placeholder="--" style={{ ...inputStyle, color: identity?.identity_profile?.age_estimate ? 'white' : '#64748b' }} data-testid="input-identity-age" />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Archetype</label>
                        <input readOnly value={identity?.identity_profile?.archetype_anchor || ''} placeholder="Waiting..." style={{ ...inputStyle, color: identity?.identity_profile?.archetype_anchor ? 'white' : '#64748b' }} data-testid="input-identity-archetype" />
                    </div>
                    <div>
                        <label style={labelStyle}>Realism Stack</label>
                        <textarea readOnly value={identity?.identity_profile?.realism_stack || identity?.identity_profile?.facial_description || ''} placeholder="Waiting..." style={{ ...inputStyle, resize: 'none', height: '100px', color: (identity?.identity_profile?.realism_stack) ? 'white' : '#64748b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden' }} data-testid="textarea-realism-stack" />
                    </div>
                </div>




            </div>

            {/* Main Content Column (Span 8) */}
            <div style={{ gridColumn: 'span 8', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid #1f2937', borderRadius: '1.5rem', padding: '1.5rem', minHeight: '600px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                <div ref={topOfListRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Dataset</h2>
                        <span style={{ fontSize: '1rem', color: '#6b7280' }}>{datasetPrompts.length > 0 ? `${Math.min(currentPage * ITEMS_PER_PAGE, datasetPrompts.length)} / ${datasetPrompts.length}` : ''}</span>
                    </div>
                    {datasetPrompts.length > 0 && (
                        <button
                            onClick={() => { const blob = new Blob([JSON.stringify(datasetPrompts, null, 2)], { type: 'application/json' }); saveAs(blob, 'prompts.json'); }}
                            data-testid="button-download-json"
                            onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                            style={{ ...buttonBaseStyle, padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                            <IconDownload style={{ width: '14px' }} /> JSON
                        </button>
                    )}
                </div>

                {datasetPrompts.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                        <IconEdit style={{ width: '48px', height: '48px', color: '#9ca3af', marginBottom: '1rem' }} />
                        <p>No prompts generated yet</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem', paddingRight: '0.5rem' }}>
                            {datasetPrompts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item, idx) => (
                                <div key={item.id || idx} style={{ width: '100%' }}>
                                    <PromptCard index={(currentPage - 1) * ITEMS_PER_PAGE + idx} prompt={item} onUpdate={handleUpdatePrompt} onToggleCopy={handleToggleCopy} isCopied={!!item.isCopied} totalInPage={datasetPrompts.length} />
                                </div>
                            ))}
                        </div>

                        {mode === 'manual' && (
                            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                {datasetPrompts.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} data-testid="button-prev-page" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: currentPage === 1 ? '#4b5563' : 'white', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            &lt; PREV
                                        </button>
                                        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                            Page <span style={{ color: 'white' }}>{currentPage}</span>
                                        </span>
                                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={(currentPage * ITEMS_PER_PAGE) >= datasetPrompts.length} data-testid="button-next-page" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: (currentPage * ITEMS_PER_PAGE) >= datasetPrompts.length ? '#4b5563' : 'white', cursor: (currentPage * ITEMS_PER_PAGE) >= datasetPrompts.length ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            NEXT &gt;
                                        </button>
                                    </div>
                                )}

                                {(currentPage * ITEMS_PER_PAGE) >= datasetPrompts.length && datasetPrompts.length < targetTotal && (
                                    <div>
                                        <button
                                            onClick={handleGenerateNextBatch}
                                            disabled={isGeneratingPrompts}
                                            data-testid="button-generate-next"
                                            onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                                            style={{ ...buttonBaseStyle, border: '1px solid #a855f7', background: 'rgba(168, 85, 247, 0.1)', color: '#e9d5ff', cursor: isGeneratingPrompts ? 'wait' : 'pointer' }}>
                                            {isGeneratingPrompts ? 'Synthesizing...' : <><IconSparkles style={{ width: '16px' }} /> Generate Next {Math.min(ITEMS_PER_PAGE, targetTotal - datasetPrompts.length)}</>}
                                        </button>
                                    </div>
                                )}
                                {promptError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem', borderRadius: '0.25rem' }}>{promptError}</p>}
                            </div>
                        )}
                    </>
                )}

                {isBatchProcessing && (
                    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', zIndex: 50 }}>
                        <div style={{ position: 'sticky', top: '0', paddingTop: '30vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '1.5rem', width: '100%' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #1f2937', borderTopColor: '#eab308', animation: 'spin 1s linear infinite' }} className="animate-spin" />
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    {batchProgress.total > 0 ? 'Processing Batch' : 'Generating Prompts'}
                                </h3>
                                {batchProgress.total > 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: '#eab308', fontFamily: 'monospace' }}>Processing {batchProgress.current}/{batchProgress.total} Images</p>
                                ) : (
                                    <p style={{ fontSize: '0.85rem', color: '#eab308', fontFamily: 'monospace' }}>Synthesizing dataset prompts...</p>
                                )}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: '300px', textAlign: 'center' }}>
                                Images are being buffered in memory. Download available upon completion.
                            </p>
                        </div>
                    </div>
                )}

                {isBatchComplete && batchZipBlob && !isBatchProcessing && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 50, backdropFilter: 'blur(8px)' }}>
                        <div style={{ position: 'sticky', top: '0', paddingTop: '30vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '1.5rem', width: '100%' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Ready for Download</h3>
                                <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Your dataset has been generated successfully.</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '280px' }}>
                                <button
                                    onClick={() => { if (batchZipBlob) saveAs(batchZipBlob, `dataset_${identity?.identity_profile?.name || 'export'}.zip`); }}
                                    data-testid="button-download-zip"
                                    onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                                    style={{ ...buttonBaseStyle, padding: '0.75rem', background: 'white', color: 'black' }}>
                                    <IconDownload style={{ width: '16px' }} /> Download Zip
                                </button>
                                <button
                                    onClick={() => { setIsBatchComplete(false); setBatchZipBlob(null); setDatasetPrompts([]); }}
                                    data-testid="button-start-new"
                                    onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave} onMouseDown={handleBtnDown} onMouseUp={handleBtnUp}
                                    style={{ ...buttonBaseStyle, padding: '0.75rem', border: '1px solid #374151', background: 'transparent', color: '#9ca3af', boxShadow: 'none' }}>
                                    Start New Dataset
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatasetGenerator;
