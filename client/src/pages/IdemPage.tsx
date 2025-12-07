
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
                marginBottom: '2rem',
                marginTop: '1rem',
                marginInline: '1rem'
            }}>
                <div className="flex-center gap-md" style={{ gap: '1rem' }}>
                    <IdemLogo width={32} height={32} />
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>IDEM</h1>
                </div>

                <nav className="flex-center gap-md" style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className={`nav-btn ${activeTab === 'vision' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vision')}
                        style={{ opacity: activeTab === 'vision' ? 1 : 0.6 }}
                    >
                        Create Identity
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'dataset' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dataset')}
                        style={{ opacity: activeTab === 'dataset' ? 1 : 0.6 }}
                    >
                        Dataset Generator
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'generator' ? 'active' : ''}`}
                        onClick={() => setActiveTab('generator')}
                        style={{ opacity: activeTab === 'generator' ? 1 : 0.6 }}
                    >
                        Social Media/UGC
                    </button>
                </nav>

                <div className="flex-center">
                    <button className="btn-secondary" onClick={handleSetKey}>
                        {apiKey ? 'API Key Set' : 'Set API Key'}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="no-scrollbar" style={{ padding: '0 1rem', maxWidth: '100%', margin: '0 auto', minHeight: 'calc(100vh - 120px)', paddingBottom: '2rem' }}>
                <div style={{ display: activeTab === 'vision' ? 'block' : 'none' }}>
                    <VisionStructParser
                        onImagesComplete={(imgs) => {
                            handleImagesGenerated(imgs);
                            // User requested manual tab switch
                        }}
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
