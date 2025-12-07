import React, { useState, useMemo } from 'react';
import { PromptItem } from '../types';
import { IconCopy, IconEdit, IconCheck, IconSettings, IconUser } from './Icons';

interface PromptCardProps {
    prompt: PromptItem;
    onUpdate: (id: string, newText: string) => void;
    onToggleCopy: (id: string) => void;
    isCopied: boolean;
    index: number;
}

// --- Styles ---
const styles = {
    card: {
        background: '#181a1f', // bg-charcoal
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginBottom: '1rem',
        position: 'relative' as 'relative',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    cardHover: {
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        borderColor: 'rgba(255,255,255,0.2)'
    },
    cardCopied: {
        borderColor: 'rgba(34, 197, 94, 0.5)',
        boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.3)'
    },
    copiedOverlay: {
        position: 'absolute' as 'absolute',
        inset: 0,
        background: 'rgba(34, 197, 94, 0.05)',
        pointerEvents: 'none' as 'none',
        zIndex: 0
    },
    header: {
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative' as 'relative',
        zIndex: 10
    },
    indexBadge: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'rgba(49, 46, 129, 0.5)', // indigo-900/50
        border: '1px solid rgba(99, 102, 241, 0.3)', // indigo-500/30
        color: '#818cf8', // indigo-400
        fontSize: '0.85rem',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '0.75rem'
    },
    metaLabel: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        textTransform: 'uppercase' as 'uppercase',
        letterSpacing: '0.05em',
        color: '#e2e8f0', // gray-200
        marginRight: '0.75rem'
    },
    metaTag: {
        padding: '0.2rem 0.6rem',
        borderRadius: '4px',
        background: 'rgba(49, 46, 129, 0.3)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        fontSize: '0.7rem',
        color: '#a5b4fc', // indigo-300
        fontFamily: 'monospace'
    },
    actionBtn: {
        padding: '0.45rem',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: '#1f2937', // gray-800
        color: '#9ca3af', // gray-400
        marginLeft: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    actionBtnCopied: {
        background: '#22c55e', // green-500
        color: 'white',
        boxShadow: '0 0 10px rgba(34,197,94,0.4)'
    },
    content: {
        padding: '1.25rem',
        position: 'relative' as 'relative',
        zIndex: 10,
        textAlign: 'left' as 'left'
    },
    codeBlock: {
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        color: 'rgba(74, 222, 128, 0.9)', // green-400/90 (Musaic style)
        lineHeight: '1.6',
        wordBreak: 'break-word' as 'break-word',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
    },
    sectionTitle: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        textTransform: 'uppercase' as 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        paddingBottom: '0.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
    },
    fieldLabel: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        textTransform: 'uppercase' as 'uppercase',
        color: '#64748b', // slate-500
        marginRight: '0.5rem'
    },
    fieldValue: {
        fontSize: '0.85rem',
        color: '#cbd5e1' // slate-300
    }
};

// --- Helper Components ---
const SectionHeader: React.FC<{ title: string; color: string; icon: React.ReactNode }> = ({ title, color, icon }) => (
    <div style={{ ...styles.sectionTitle, color, borderColor: 'rgba(255,255,255,0.05)' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: `${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </div>
        {title}
    </div>
);

const KeyVal: React.FC<{ label: string; val: string | number | undefined }> = ({ label, val }) => (
    val ? (
        <div style={{ display: 'flex', marginBottom: '0.25rem' }}>
            <span style={styles.fieldLabel}>{label}:</span>
            <span style={{ ...styles.fieldValue, flex: 1 }}>{val}</span>
        </div>
    ) : null
);

const ClothingItem: React.FC<{ label: string; item: { type?: string; color?: string } | undefined }> = ({ label, item }) => {
    if (!item || (!item.type && !item.color)) return <div style={{ fontSize: '0.7rem', color: '#52525b', fontStyle: 'italic', marginBottom: '0.25rem' }}>{label}: Not specified</div>;
    return (
        <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.1rem' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                {item.color && <span style={{ color: '#e2e8f0', marginRight: '0.3rem' }}>{item.color}</span>}
                {item.type}
            </div>
        </div>
    );
};

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onUpdate, onToggleCopy, isCopied, index }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [isHovered, setIsHovered] = useState(false);

    // Robust JSON Parsing
    const parsedContent = useMemo(() => {
        try {
            if (!prompt.prompt) return null;
            // Case A: It's already an object (from generateDatasetPrompts in Idem sometimes returns objects if typed that way, but PromptItem says prompt is string)
            // Actually PromptItem interface says prompt is string.
            // But if it's a simple string like "A photo of...", JSON.parse will fail.

            let cleaned = prompt.prompt.trim();
            // Check if it looks like JSON
            if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
                return null; // It's just text
            }

            // Clean markdown
            cleaned = cleaned.replace(/```json\s*|```/gi, '').trim();

            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
            return parsed;
        } catch (e) {
            return null; // Return null to fallback to raw text
        }
    }, [prompt.prompt]);

    // Mode Detection
    // If it's NOT parsed JSON, it's a simple text prompt (Manual Mode or simple generation)
    // We should treat it as valid content, not "Raw Prompt" error state.
    const isLoRAMode = !!parsedContent?.generation_data;
    const isVisionStruct = !!parsedContent?.subject_core;
    const isStandardUGC = !!parsedContent?.subject && !!parsedContent?.background && !isVisionStruct;

    // Derived Data
    const finalString = isLoRAMode ? parsedContent?.generation_data?.final_prompt_string : prompt.prompt;
    const refLogic = parsedContent?.generation_data?.reference_logic;
    const meta = prompt.generationMeta;

    // Normalization
    const normalizedData = useMemo(() => {
        if (isVisionStruct) {
            return {
                core: parsedContent.subject_core,
                atm: parsedContent.atmosphere_and_context,
                details: parsedContent.anatomical_details,
                meta: parsedContent.meta
            };
        } else if (isLoRAMode) {
            return {
                core: {
                    identity: `${parsedContent.subject.age || ''} ${parsedContent.subject.description || ''}`,
                    styling: parsedContent.subject.expression || "Standard",
                    imperfections: parsedContent.subject.imperfections
                },
                atm: {
                    mood: Array.isArray(parsedContent.background?.elements) ? parsedContent.background.elements.join(", ") : "Standard",
                    lighting_source: parsedContent.photography?.camera_style || "Natural"
                },
                details: {
                    hands_and_fingers: "N/A",
                    head_and_gaze: parsedContent.subject.expression,
                    limb_placement: "See Description",
                    posture_and_spine: parsedContent.subject.body
                },
                clothing: parsedContent.subject.clothing,
                meta: parsedContent.meta || { visual_fidelity: parsedContent.photography?.shot_type }
            };
        } else if (isStandardUGC) {
            return {
                core: {
                    identity: parsedContent.subject.description || "Subject",
                    styling: parsedContent.subject.expression || "Standard",
                    imperfections: parsedContent.subject.imperfections
                },
                atm: {
                    mood: Array.isArray(parsedContent.background?.elements) ? parsedContent.background.elements.join(", ") : "Standard",
                    lighting_source: parsedContent.tech_specs?.lighting_physics || "Natural"
                },
                details: {
                    hands_and_fingers: "N/A",
                    head_and_gaze: parsedContent.subject.expression,
                    limb_placement: "See Description",
                    posture_and_spine: parsedContent.subject.body
                },
                clothing: parsedContent.subject.clothing,
                meta: parsedContent.meta
            };
        }
        return null;
    }, [parsedContent, isVisionStruct, isLoRAMode, isStandardUGC]);

    // Handlers
    const startEdit = () => {
        setEditText(prompt.prompt);
        setIsEditing(true);
    };

    const saveEdit = () => {
        onUpdate(prompt.id || '', editText);
        setIsEditing(false);
    };

    const handleCopy = () => {
        const textToCopy = isLoRAMode ? finalString : (parsedContent ? JSON.stringify(parsedContent, null, 2) : prompt.prompt);
        navigator.clipboard.writeText(textToCopy);
        onToggleCopy(prompt.id || ''); // Call parent handler to toggle state
    };

    return (
        <div
            style={{
                ...styles.card,
                ...(isHovered ? styles.cardHover : {}),
                ...(isCopied ? styles.cardCopied : {})
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isCopied && <div style={styles.copiedOverlay} />}

            {/* HEADER */}
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={styles.indexBadge}>
                        {index + 1}
                    </div>
                    {meta ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={styles.metaLabel}>{meta.type}</span>
                            <span style={styles.metaTag}>{meta.label}</span>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Raw Prompt</span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={handleCopy}
                        style={{ ...styles.actionBtn, ...(isCopied ? styles.actionBtnCopied : {}) }}
                        title="Copy Prompt"
                    >
                        {isCopied ? <IconCheck style={{ width: '14px', height: '14px' }} /> : <IconCopy style={{ width: '14px', height: '14px' }} />}
                    </button>
                    <button onClick={startEdit} style={styles.actionBtn} title="Edit Prompt">
                        <IconEdit style={{ width: '14px', height: '14px' }} />
                    </button>
                </div>
            </div>

            {/* BODY */}
            <div style={styles.content}>
                {isEditing ? (
                    <textarea
                        style={{ ...styles.codeBlock, width: '100%', height: '200px', resize: 'none', color: '#e2e8f0', outline: 'none' }}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={saveEdit}
                        autoFocus
                    />
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>

                        {/* 1. MAIN TEXT / CODE BLOCK */}
                        {isLoRAMode && (
                            <>
                                <div style={styles.codeBlock}>
                                    {finalString}
                                </div>
                                {refLogic && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '4px' }}>
                                            <IconSettings style={{ width: '12px', color: '#f59e0b' }} />
                                            <span style={{ fontSize: '0.6rem', color: '#fcd34d', fontFamily: 'monospace' }}>
                                                REF: {refLogic.primary_ref} / {refLogic.secondary_ref}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 2. RICH METADATA UI (If parsed) */}
                        {normalizedData && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }}>

                                {/* Subject Identity */}
                                <div>
                                    <SectionHeader title="Subject Identity" color="#818cf8" icon={<IconUser style={{ width: '12px', color: '#818cf8' }} />} />
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                            <span style={styles.fieldLabel}>Identity:</span>
                                            {normalizedData.core?.identity}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                            <span style={styles.fieldLabel}>Expression:</span>
                                            <span style={styles.fieldValue}>{normalizedData.core?.styling}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Atmosphere & Environment */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <SectionHeader title="Environment" color="#34d399" icon={<div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#34d399' }} />} />
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <ClothingItem label="Setting" item={{ type: normalizedData.atm?.mood }} />
                                            <ClothingItem label="Lighting" item={{ type: normalizedData.atm?.lighting_source }} />
                                        </div>
                                    </div>

                                    {/* Wardrobe (UGC & LoRA) */}
                                    {(isStandardUGC || isLoRAMode) && normalizedData.clothing && (
                                        <div>
                                            <SectionHeader title="Wardrobe" color="#fb7185" icon={<div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb7185' }} />} />
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <ClothingItem label="Top" item={normalizedData.clothing.top} />
                                                <ClothingItem label="Bottom" item={normalizedData.clothing.bottom} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Technical */}
                                {normalizedData.details && (
                                    <div>
                                        <SectionHeader title="Camera & Tech" color="#fcd34d" icon={<IconSettings style={{ width: '12px', color: '#fcd34d' }} />} />
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <KeyVal label="Shot" val={normalizedData.meta?.visual_fidelity || "Standard"} />
                                            <KeyVal label="Angle" val={normalizedData.details.head_and_gaze} />
                                            <KeyVal label="Posture" val={normalizedData.details.posture_and_spine} />
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}


                        {/* FALLBACK: Raw Text / Simple Prompt */}
                        {(!isLoRAMode && !normalizedData) && (
                            <div style={{ ...styles.codeBlock, color: '#e2e8f0', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>
                                {prompt.prompt}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
