
import React, { useState, useEffect } from 'react';
import VisionStructParser from '../idem/components/VisionStructParser';
import DatasetGenerator from '../idem/components/DatasetGenerator';
import ImageGenerator from '../idem/components/ImageGenerator';
import { SplashScreen } from '../idem/components/SplashScreen';
import { IdemLogo } from '../idem/components/IdemLogo';

const IdemPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'vision' | 'dataset' | 'generator'>('vision');
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
        // If user wants to reset/change key
        sessionStorage.removeItem('gemini_api_key');
        setApiKey(null);
        setShowSplash(true);
    };

    const handleImagesGenerated = (images: { source: string | null; headshot: string | null; bodyshot: string | null }) => {
        setGeneratedImages(images);
        // Optional: Auto-switch? User said "move to the next tab", implying manual or auto.
        // Let's not auto-switch immediately to let them verify, OR just make the button in VisionStruct "Next" switch tabs?
        // User said "Then we can click the button on that tab".
        // Let's auto-switch to Dataset tab for convenience after generation?
        // Actually, the user flow is: Generate Images -> Go to Dataset Tab -> Click Analyze.
        // So maybe we don't auto-switch, or we provide a clear "Proceed to Dataset" button.
        // For now, I'll just save state.
    };

    if (showSplash) {
        return <SplashScreen onComplete={handleAuthComplete} />;
    }

    return (
        <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-obsidian)', color: 'var(--text-primary)' }}>
            {/* Header / Nav */}
            <header className="glass-panel" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                marginBottom: '1rem',
                marginTop: '1rem',
                marginInline: '1rem',
                position: 'sticky',
                top: '0.5rem',
                zIndex: 100
            }}>
                <div className="flex-center gap-md" style={{ gap: '1rem' }}>
                    <IdemLogo width={32} height={32} />
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>IDEM</h1>
                </div>

                <nav style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['vision', 'dataset', 'generator'] as const).map((tab) => {
                        const isActive = activeTab === tab;
                        const labels = {
                            vision: 'Create Identity',
                            dataset: 'Dataset Generator',
                            generator: 'Social Media/UGC'
                        };
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
                                    background: isActive 
                                        ? 'rgba(168, 85, 247, 0.3)' 
                                        : 'transparent',
                                    color: isActive ? '#e9d5ff' : '#94a3b8',
                                    border: isActive 
                                        ? '1px solid rgba(168, 85, 247, 0.5)' 
                                        : '1px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                                        e.currentTarget.style.color = '#c4b5fd';
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

            {/* Main Content Area */}
            <main className="no-scrollbar" style={{ padding: '0 1rem', maxWidth: '100%', margin: '0 auto', minHeight: 'calc(100vh - 120px)', paddingBottom: '2rem' }}>
                <div style={{ display: activeTab === 'vision' ? 'block' : 'none' }}>
                    <VisionStructParser
                        onImagesComplete={(imgs) => {
                            handleImagesGenerated(imgs);
                        }}
                        onNavigateToDataset={() => setActiveTab('dataset')}
                    />
                </div>
                {activeTab === 'dataset' && (
                    <DatasetGenerator
                        inputIdentity={visionStruct}
                        inputImages={generatedImages}
                        onAnalysisComplete={setVisionStruct}
                    />
                )}
                {activeTab === 'generator' && <ImageGenerator />}
            </main>
        </div>
    );
};

export default IdemPage;
