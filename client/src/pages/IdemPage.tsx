
import React, { useState, useEffect } from 'react';
import VisionStructParser from '../idem/components/VisionStructParser';
import DatasetGenerator from '../idem/components/DatasetGenerator';
import CloneImage from '../idem/components/CloneImage';
import ImageGenerator from '../idem/components/ImageGenerator';
import { SplashScreen } from '../idem/components/SplashScreen';
import { IdemLogo } from '../idem/components/IdemLogo';

const IdemPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'vision' | 'dataset' | 'clone' | 'generator'>('vision');
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showSplash, setShowSplash] = useState(true);
    const [visionStruct, setVisionStruct] = useState<any | null>(null);
    const [generatedImages, setGeneratedImages] = useState<{ source: string | null; headshot: string | null; bodyshot: string | null }>({
        source: null,
        headshot: null,
        bodyshot: null
    });

    useEffect(() => {
        const key = sessionStorage.getItem('gemini_api_key');
        if (key) {
            setApiKey(key);
            setShowSplash(false);
        }
    }, []);

    const handleAuthComplete = (key: string | null) => {
        if (key) setApiKey(key);
        setShowSplash(false);
    };

    const handleSetKey = () => {
        sessionStorage.removeItem('gemini_api_key');
        setApiKey(null);
        setShowSplash(true);
    };

    const handleImagesGenerated = (images: { source: string | null; headshot: string | null; bodyshot: string | null }) => {
        setGeneratedImages(images);
    };

    if (showSplash) {
        return <SplashScreen onComplete={handleAuthComplete} />;
    }

    return (
        <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-obsidian)', color: 'var(--text-primary)' }}>
            <header className="glass-panel" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                marginBottom: '1.5rem',
                marginTop: '0',
                marginInline: '0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(10, 10, 12, 0.6)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                position: 'sticky',
                top: '0',
                zIndex: 100,
                width: '100%'
            }}>
                <div className="flex-center gap-md" style={{ gap: '0.35rem', display: 'flex', alignItems: 'center' }}>
                    <IdemLogo width={32} height={32} />
                    <h1 style={{ fontSize: '1.5rem', margin: 0, fontFamily: '"Archivo Black", sans-serif', lineHeight: 1 }}>IDEM</h1>
                </div>

                <nav style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['vision', 'dataset', 'clone', 'generator'] as const).map((tab) => {
                        const isActive = activeTab === tab;
                        const labels = {
                            vision: 'Create Identity',
                            dataset: 'Dataset Creator',
                            clone: 'Clone Image',
                            generator: 'Social Media'
                        };
                        const tabColors = {
                            vision: { bg: 'rgba(168, 85, 247, 0.3)', border: 'rgba(168, 85, 247, 0.5)', text: '#e9d5ff', hover: 'rgba(168, 85, 247, 0.15)', hoverText: '#c4b5fd' },
                            dataset: { bg: 'rgba(168, 85, 247, 0.3)', border: 'rgba(168, 85, 247, 0.5)', text: '#e9d5ff', hover: 'rgba(168, 85, 247, 0.15)', hoverText: '#c4b5fd' },
                            clone: { bg: 'rgba(34, 197, 94, 0.3)', border: 'rgba(34, 197, 94, 0.5)', text: '#86efac', hover: 'rgba(34, 197, 94, 0.15)', hoverText: '#4ade80' },
                            generator: { bg: 'rgba(234, 179, 8, 0.3)', border: 'rgba(234, 179, 8, 0.5)', text: '#fde047', hover: 'rgba(234, 179, 8, 0.15)', hoverText: '#facc15' }
                        };
                        const colors = tabColors[tab];
                        return (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    requestAnimationFrame(() => {
                                        window.scrollTo({ top: 0, behavior: 'instant' });
                                    });
                                }}
                                data-testid={`nav-tab-${tab}`}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: isActive ? '600' : '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: isActive ? colors.bg : 'transparent',
                                    color: isActive ? colors.text : '#94a3b8',
                                    border: isActive ? `1px solid ${colors.border}` : '1px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = colors.hover;
                                        e.currentTarget.style.color = colors.hoverText;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#94a3b8';
                                    }
                                }}
                            >
                                {labels[tab]}
                            </button>
                        );
                    })}
                </nav>

                <div>
                    <button
                        onClick={handleSetKey}
                        data-testid="button-set-api-key"
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: 'rgba(88, 28, 135, 0.4)',
                            color: '#c4b5fd',
                            border: '1px solid rgba(168, 85, 247, 0.4)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.4)';
                            e.currentTarget.style.color = '#e9d5ff';
                            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(88, 28, 135, 0.4)';
                            e.currentTarget.style.color = '#c4b5fd';
                            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                        }}
                    >
                        Set API Key
                    </button>
                </div>
            </header>

            <main className="no-scrollbar" style={{ padding: '0 1rem', maxWidth: '100%', margin: '0 auto', minHeight: 'calc(100vh - 120px)', paddingBottom: '2rem' }}>
                <div style={{ display: activeTab === 'vision' ? 'block' : 'none' }}>
                    <VisionStructParser
                        onImagesComplete={(imgs) => {
                            handleImagesGenerated(imgs);
                        }}
                        onNavigateToDataset={() => setActiveTab('dataset')}
                    />
                </div>
                <div style={{ display: activeTab === 'dataset' ? 'block' : 'none' }}>
                    <DatasetGenerator
                        inputIdentity={visionStruct}
                        inputImages={generatedImages}
                        onAnalysisComplete={setVisionStruct}
                    />
                </div>
                <div style={{ display: activeTab === 'clone' ? 'block' : 'none' }}>
                    <CloneImage identityImages={generatedImages} />
                </div>
                <div style={{ display: activeTab === 'generator' ? 'block' : 'none' }}>
                    <ImageGenerator />
                </div>
            </main>
        </div >
    );
};

export default IdemPage;
