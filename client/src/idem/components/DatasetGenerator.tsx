
import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PromptItem, ImageProvider, ImageAspect } from '../types';
import { analyzeSubjectImages, generateDatasetPrompts } from '../services/geminiService';
import { generateImage } from '../services/imageGenerationService';
import { apiService } from '../services/apiService';
import type { IdentityProfile, Dataset } from '@shared/schema';
import {
    IconSparkles, IconUser, IconEdit, IconDownload
} from './Icons';
import { PromptCard } from './PromptCard';

interface DatasetGeneratorProps {
    inputIdentity: any; // Initially null
    inputImages: { source: string | null; headshot: string | null; bodyshot: string | null };
    onAnalysisComplete: (result: any) => void;
}

type GeneratorMode = 'manual' | 'api';

const DatasetGenerator: React.FC<DatasetGeneratorProps> = ({ inputIdentity, inputImages, onAnalysisComplete }) => {
    // --- State ---
    const [mode, setMode] = useState<GeneratorMode>('manual');
    const [safetyMode, setSafetyMode] = useState<'sfw' | 'nsfw'>('sfw');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Auto/API Settings
    const [provider, setProvider] = useState<ImageProvider>('google');
    const [aspectRatio, setAspectRatio] = useState<ImageAspect>('1:1');
    const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
    const [wavespeedApiKey, setWavespeedApiKey] = useState('');

    // Data State
    const [identity, setIdentity] = useState<any>(inputIdentity);
    const [datasetPrompts, setDatasetPrompts] = useState<PromptItem[]>([]);
    
    // Persistence State
    const [savedIdentityId, setSavedIdentityId] = useState<string | null>(null);
    const [savedDatasetId, setSavedDatasetId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedIdentities, setSavedIdentities] = useState<IdentityProfile[]>([]);
    const [savedDatasets, setSavedDatasets] = useState<Dataset[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Local Overrides for Images using file uploads
    const [localHeadshot, setLocalHeadshot] = useState<string | null>(null);
    const [localBodyshot, setLocalBodyshot] = useState<string | null>(null);

    // Derived Images (Prioritize local upload -> then input props)
    const effectiveHeadshot = localHeadshot || inputImages.headshot;
    const effectiveBodyshot = localBodyshot || inputImages.bodyshot;

    // Processing State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);

    // Batch Processing State
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [batchZipBlob, setBatchZipBlob] = useState<Blob | null>(null);
    const [isBatchComplete, setIsBatchComplete] = useState(false);
    const [targetTotal, setTargetTotal] = useState(100); // Default to 100 per user request
    const [apiBatchSize, setApiBatchSize] = useState(25);

    // --- Effects ---
    useEffect(() => {
        if (inputIdentity) {
            setIdentity(inputIdentity);
        }
    }, [inputIdentity]);
    
    useEffect(() => {
        loadSavedData();
    }, []);
    
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

    // --- Helpers ---
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

    // --- Logic Handlers ---

    const handleAnalyzeProfile = async () => {
        if (!effectiveHeadshot || !effectiveBodyshot) {
            setAnalysisError("Missing reference images.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const result = await analyzeSubjectImages(effectiveHeadshot, effectiveBodyshot);
            setIdentity(result);
            onAnalysisComplete(result);
        } catch (e: any) {
            console.error(e);
            setAnalysisError(e.message);
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
                uid: identity.identity_profile.uid,
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

    const handleGeneratePrompts = async () => {
        if (!identity || !identity.identity_profile) return;
        setIsGeneratingPrompts(true);
        setPromptError(null);

        // Reset or Start New?
        // If prompts exist, this is a "Restart" action, so we clear them.
        setDatasetPrompts([]);

        try {
            const batchSize = Math.min(10, targetTotal);

            // Map Identity Profile to service params
            const prompts = await generateDatasetPrompts({
                taskType: 'lora',
                subjectDescription: identity.identity_profile.body_stack,
                identity: {
                    name: identity.identity_profile.uid,
                    age_estimate: identity.identity_profile.age_estimate,
                    profession: identity.identity_profile.archetype_anchor,
                    backstory: identity.identity_profile.realism_stack
                },
                safetyMode: safetyMode,
                count: batchSize,
                startCount: 0,
                totalTarget: targetTotal,
                previousSettings: [] // New session
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
                    name: identity.identity_profile.uid,
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

    // Auto-scroll to top on page change
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

    const handleBatchGeneration = async () => {
        setIsBatchProcessing(true);
        setPromptError(null);
        setIsBatchComplete(false);
        setBatchZipBlob(null);

        let promptsToProcess = datasetPrompts;

        // Auto-Generate Prompts if empty
        if (promptsToProcess.length === 0) {
            try {
                const prompts = await generateDatasetPrompts({
                    taskType: 'lora',
                    subjectDescription: identity.identity_profile.body_stack,
                    identity: {
                        name: identity.identity_profile.uid,
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


            const CONCURRENCY = 5;
            for (let i = 0; i < limit; i += CONCURRENCY) {
                const chunk = promptsToProcess.slice(i, Math.min(i + CONCURRENCY, limit));

                await Promise.all(chunk.map(async (item, chunkIdx) => {
                    const globalIdx = i + chunkIdx;
                    if (globalIdx >= limit) return;

                    try {
                        const result = await generateImage({
                            provider,
                            apiKey,
                            prompt: item.prompt,
                            aspectRatio,
                            resolution,
                            referenceImages: effectiveHeadshot ? [effectiveHeadshot] : []
                        });

                        if (result.ok && result.b64_json) {
                            const filename = `${globalIdx + 1}_${item.category || 'generated'}.png`;
                            imgFolder?.file(filename, result.b64_json, { base64: true });
                            successCount++;
                        } else {
                            console.warn(`Item ${globalIdx + 1} failed initially.`);
                            failedItems.push({ item, idx: globalIdx });
                        }
                    } catch (e) {
                        console.warn(`Item ${globalIdx + 1} error:`, e);
                        failedItems.push({ item, idx: globalIdx });
                    }
                }));
                // Update Progress after the entire chunk is processed
                setBatchProgress(prev => ({ ...prev, current: Math.min(prev.current + CONCURRENCY, limit) }));
            }

            // --- RETRY PHASE ---
            if (failedItems.length > 0) {
                console.log(`Retrying ${failedItems.length} failed items...`);
                await Promise.all(failedItems.map(async ({ item, idx }) => {
                   try {
                        const result = await generateImage({
                            provider,
                            apiKey,
                            prompt: item.prompt,
                            aspectRatio,
                            resolution,
                            referenceImages: effectiveHeadshot ? [effectiveHeadshot] : []
                        });
                        if (result.ok && result.b64_json) {
                            const filename = `${idx + 1}_${item.category || 'generated'}.png`;
                            imgFolder?.file(filename, result.b64_json, { base64: true });
                            successCount++;
                        }
                   } catch (e) { console.error("Retry failed", e)}
                }));
            }

            // Generate ZIP
            const blob = await zip.generateAsync({ type: "blob" });
            setBatchZipBlob(blob);
            setIsBatchComplete(true);

        } catch (e: any) {
            setPromptError("Batch generation failed: " + e.message);
        } finally {
            setIsBatchProcessing(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Dataset Generator</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Analyze your identity profile and generate consistent training data.
            </p>
            
            {/* Saved Data Section */}
            {(savedIdentities.length > 0 || savedDatasets.length > 0) && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent-blue)' }}>Saved Data</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Saved Identities */}
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Identities ({savedIdentities.length})</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {savedIdentities.map(profile => (
                                    <div 
                                        key={profile.id} 
                                        style={{ 
                                            padding: '0.75rem', 
                                            background: savedIdentityId === profile.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.3)', 
                                            borderRadius: '8px',
                                            border: savedIdentityId === profile.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => handleLoadIdentity(profile.id)}
                                        data-testid={`card-identity-${profile.id}`}
                                    >
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>{(profile.identityProfile as any)?.uid || 'Unknown'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#999' }}>
                                            {new Date(profile.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Saved Datasets */}
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Datasets ({savedDatasets.length})</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {savedDatasets.map(dataset => (
                                    <div 
                                        key={dataset.id} 
                                        style={{ 
                                            padding: '0.75rem', 
                                            background: savedDatasetId === dataset.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.3)', 
                                            borderRadius: '8px',
                                            border: savedDatasetId === dataset.id ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => handleLoadDataset(dataset.id)}
                                        data-testid={`card-dataset-${dataset.id}`}
                                    >
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>{dataset.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#999' }}>
                                            {(dataset.prompts as any[])?.length || 0} prompts • {new Date(dataset.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 1: Identity Analysis */}
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
                    <IconUser style={{ width: 20, height: 20 }} />
                    1. Identity Profile
                </h3>

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Reference Images Display */}
                        <div style={{ width: '100px', height: '100px', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                            {effectiveHeadshot ? <img src={effectiveHeadshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: '1rem', fontSize: '0.7rem', color: '#666' }}>No Headshot</div>}
                            <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', opacity: 0 }}>
                                <input type="file" onChange={(e) => handleImageUpload(e, 'head')} accept="image/*" />
                            </label>
                        </div>
                        <div style={{ width: '100px', height: '100px', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                            {effectiveBodyshot ? <img src={effectiveBodyshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: '1rem', fontSize: '0.7rem', color: '#666' }}>No Bodyshot</div>}
                             <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', opacity: 0 }}>
                                <input type="file" onChange={(e) => handleImageUpload(e, 'body')} accept="image/*" />
                            </label>
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        {!identity ? (
                            <button className="btn-primary" onClick={handleAnalyzeProfile} disabled={isAnalyzing} data-testid="button-analyze-identity">
                                {isAnalyzing ? 'Analyzing Identity...' : 'Analyze Identity Profile'}
                            </button>
                        ) : (
                            <div style={{ fontSize: '0.9rem' }}>
                                <div style={{ fontWeight: 'bold', color: savedIdentityId ? 'var(--accent-green)' : '#999', marginBottom: '0.5rem' }}>
                                    {savedIdentityId ? '✓ Identity Saved' : '✓ Identity Locked'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
                                    <span style={{ color: '#666' }}>UID:</span> <span data-testid="text-identity-uid">{identity.identity_profile?.uid}</span>
                                    <span style={{ color: '#666' }}>Archetype:</span> <span data-testid="text-identity-archetype">{identity.identity_profile?.archetype_anchor}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={handleAnalyzeProfile}>
                                        Re-Analyze
                                    </button>
                                    {!savedIdentityId && (
                                        <button className="btn-primary" style={{ fontSize: '0.8rem' }} onClick={handleSaveIdentity} disabled={isSaving} data-testid="button-save-identity">
                                            {isSaving ? 'Saving...' : 'Save Identity'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {analysisError && <div style={{ color: 'red', marginTop: '0.5rem' }}>{analysisError}</div>}
                        {saveError && <div style={{ color: 'red', marginTop: '0.5rem' }}>{saveError}</div>}
                    </div>
                </div>
            </div>

            {/* Step 2: Prompt Generation */}
            {identity && (
                 <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-purple)' }}>
                        <IconSparkles style={{ width: 20, height: 20 }} />
                        2. Dataset Prompts
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                         <input 
                            type="number" 
                            value={targetTotal} 
                            onChange={(e) => setTargetTotal(Number(e.target.value))} 
                            style={{ background: '#333', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '4px', width: '80px' }}
                            min={1} max={500}
                            data-testid="input-target-total"
                         />
                         <span style={{ fontSize: '0.9rem', color: '#999' }}>Target Prompts</span>
                         <button className="btn-primary" onClick={handleGeneratePrompts} disabled={isGeneratingPrompts} data-testid="button-generate-prompts">
                            {isGeneratingPrompts ? 'Generating...' : (datasetPrompts.length > 0 ? 'Regenerate Prompts' : 'Generate Prompts')}
                         </button>
                         {datasetPrompts.length > 0 && savedIdentityId && !savedDatasetId && (
                             <button className="btn-primary" onClick={handleSaveDataset} disabled={isSaving} data-testid="button-save-dataset">
                                {isSaving ? 'Saving...' : 'Save Dataset'}
                             </button>
                         )}
                         {savedDatasetId && (
                             <span style={{ color: 'var(--accent-green)', fontSize: '0.9rem', fontWeight: 'bold' }}>✓ Dataset Saved</span>
                         )}
                    </div>

                    {datasetPrompts.length > 0 && (
                        <div>
                            {/* Pagination / List */}
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ color: '#999' }}>Showing {datasetPrompts.length} prompts</span>
                                {datasetPrompts.length < targetTotal && (
                                     <button className="btn-secondary" onClick={handleGenerateNextBatch} disabled={isGeneratingPrompts}>
                                         + Load More
                                     </button>
                                )}
                             </div>

                             <div ref={topOfListRef} style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {datasetPrompts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((prompt, idx) => (
                                    <PromptCard 
                                        key={prompt.id || idx} 
                                        index={(currentPage - 1) * ITEMS_PER_PAGE + idx} 
                                        prompt={prompt} 
                                        onUpdate={handleUpdatePrompt} 
                                        onToggleCopy={handleToggleCopy}
                                        isCopied={!!prompt.isCopied}
                                    />
                                ))}
                             </div>
                             
                             {/* Pager */}
                             <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&lt; Prev</button>
                                <span style={{ display: 'flex', alignItems: 'center' }}>Page {currentPage}</span>
                                <button className="btn-secondary" disabled={currentPage * ITEMS_PER_PAGE >= datasetPrompts.length} onClick={() => setCurrentPage(p => p + 1)}>Next &gt;</button>
                             </div>
                        </div>
                    )}
                    {promptError && <div style={{ color: 'red', marginTop: '0.5rem' }}>{promptError}</div>}
                 </div>
            )}

            {/* Step 3: Batch Generation */}
            {datasetPrompts.length > 0 && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                        <IconDownload style={{ width: 20, height: 20 }} />
                        3. Batch Generation & Download
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <select value={mode} onChange={(e) => setMode(e.target.value as GeneratorMode)} className="settings-input">
                            <option value="manual">Manual (Download JSON only)</option>
                            <option value="api">API Generation (Download Images + JSON)</option>
                        </select>
                        
                        {mode === 'api' && (
                            <>
                                <select value={provider} onChange={(e) => setProvider(e.target.value as ImageProvider)} className="settings-input">
                                    <option value="google">Google Gemini</option>
                                    <option value="wavespeed">Wavespeed</option>
                                </select>
                                {provider === 'wavespeed' && (
                                    <input 
                                        type="password" 
                                        placeholder="Wavespeed Key" 
                                        value={wavespeedApiKey}
                                        onChange={(e) => setWavespeedApiKey(e.target.value)}
                                        className="settings-input"
                                    />
                                )}
                            </>
                        )}
                        
                        <button className="btn-primary" onClick={handleBatchGeneration} disabled={isBatchProcessing}>
                            {isBatchProcessing ? `Processing ${batchProgress.current} / ${batchProgress.total}...` : 'Start Batch Process'}
                        </button>
                    </div>

                    {isBatchComplete && batchZipBlob && (
                         <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4ade80' }}>✓ Batch Generation Complete!</span>
                            <button className="btn-primary" onClick={() => saveAs(batchZipBlob, 'dataset_batch.zip')}>
                                Download ZIP
                            </button>
                         </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DatasetGenerator;
