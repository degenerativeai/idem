
import React, { useState, useEffect } from 'react';
import VisionStructParser from './components/VisionStructParser';
import DatasetGenerator from './components/DatasetGenerator';
import ImageGenerator from './components/ImageGenerator';

import { SplashScreen } from './components/SplashScreen';

const App: React.FC = () => {
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
        <div className="app-container">
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
                <div className="flex-center gap-md">
                    <img src="/assets/logo.svg" alt="IDEM" style={{ width: '32px', height: '32px' }} />
                    <h1 style={{ fontSize: '1.25rem' }}>IDEM</h1>
                </div>

                <nav className="flex-center gap-md">
                    <button
                        className={`nav-btn ${activeTab === 'vision' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vision')}
                    >
                        Create Identity
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'dataset' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dataset')}
                    >
                        Dataset Generator
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'generator' ? 'active' : ''}`}
                        onClick={() => setActiveTab('generator')}
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

export default App;
