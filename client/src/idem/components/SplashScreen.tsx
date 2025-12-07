
import React, { useState } from 'react';

interface SplashScreenProps {
    onComplete: (key: string | null) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');

    const handleEnter = () => {
        if (!inputKey.trim()) {
            setError('Please enter a valid API key');
            return;
        }
        sessionStorage.setItem('gemini_api_key', inputKey.trim());
        onComplete(inputKey.trim());
    };

    const handleSkip = () => {
        onComplete(null);
    };

    return (
        <div className="flex-center" style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-obsidian)',
            zIndex: 50,
            flexDirection: 'column'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '3rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2rem'
            }}>

                {/* Logo Section */}
                <div style={{ textAlign: 'center' }}>
                    {/* Placeholder for logo if missing */}
                    <div style={{ width: '128px', height: '128px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '24px', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold' }}>I</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>IDEM</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Identity & Dataset Manifest</p>
                </div>

                {/* Auth Section */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: 'var(--text-secondary)'
                        }}>
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => {
                                setInputKey(e.target.value);
                                setError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
                            placeholder="sk-..."
                            style={{
                                width: '100%',
                                background: 'var(--bg-charcoal)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '1rem',
                                color: 'white',
                                outline: 'none',
                                fontFamily: 'monospace',
                                fontSize: '0.9rem'
                            }}
                        />
                        {error && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</p>}
                    </div>

                    <button onClick={handleEnter} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Authenticate Session
                    </button>

                    <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem'
                    }}>
                        <button
                            onClick={handleSkip}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            Skip (Demo Mode)
                        </button>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
                        >
                            Get Key ↗
                        </a>
                    </div>

                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        textAlign: 'center',
                        marginTop: '1rem',
                        lineHeight: '1.4'
                    }}>
                        Your key is stored locally in session storage and is cleared when you close this tab. It is never sent to any server other than Google's API.
                    </p>
                </div>

            </div>
        </div>
    );
};
