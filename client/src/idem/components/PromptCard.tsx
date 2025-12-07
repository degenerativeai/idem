
import React, { useState, useMemo } from 'react';
import { PromptItem } from '../types';
import { IconCopy, IconEdit, IconCheck, IconSettings, IconUser } from './Icons';

interface PromptCardProps {
    prompt: PromptItem;
    onUpdate: (id: string, newText: string) => void;
    onToggleCopy: (id: string) => void;
    isCopied: boolean;
    index: number;
    totalInPage?: number;
}

const SectionHeader: React.FC<{ title: string; color: string; icon: React.ReactNode }> = ({ title, color, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', background: `${color}33` }}>
            {icon}
        </div>
        <span style={{ fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color, filter: 'brightness(1.25)' }}>{title}</span>
    </div>
);

const KeyVal: React.FC<{ label: string; val: string | number | undefined }> = ({ label, val }) => (
    val ? (
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 'bold', color: '#6b7280', marginRight: '0.5rem', textTransform: 'uppercase', minWidth: '50px' }}>{label}:</span>
            <span style={{ color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
        </div>
    ) : null
);

const ClothingItem: React.FC<{ label: string; item: { type?: string; color?: string } | undefined }> = ({ label, item }) => {
    if (!item || (!item.type && !item.color)) return <div style={{ fontSize: '0.5625rem', color: '#52525b', fontStyle: 'italic', marginBottom: '0.25rem' }}>{label}: Not specified</div>;
    return (
        <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.625rem', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.125rem' }}>{label}</span>
            <div style={{ fontSize: '0.625rem', color: '#e5e7eb' }}>
                {item.color && <span style={{ color: '#9ca3af', marginRight: '0.25rem' }}>{item.color}</span>}
                {item.type}
            </div>
        </div>
    );
};

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onUpdate, onToggleCopy, isCopied, index, totalInPage = 1 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    const promptText = prompt.prompt;

    const parsedContent = useMemo(() => {
        try {
            if (!promptText) return null;
            let cleaned = promptText.replace(/```json\s*|```/gi, '').trim();
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            if (!cleaned.startsWith('{')) return null;
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
            return parsed;
        } catch (e) {
            return null;
        }
    }, [promptText]);

    const isLoRAMode = !!parsedContent?.generation_data;
    const isVisionStruct = !!parsedContent?.subject_core;
    const isStandardUGC = !!parsedContent?.subject && !!parsedContent?.background && !isVisionStruct;

    const finalString = isLoRAMode ? parsedContent?.generation_data?.final_prompt_string : promptText;
    const refLogic = parsedContent?.generation_data?.reference_logic;
    const meta = prompt.generationMeta;

    const normalizedData = useMemo(() => {
        if (isVisionStruct) {
            return {
                core: parsedContent.subject_core,
                atm: parsedContent.atmosphere_and_context,
                details: parsedContent.anatomical_details,
                meta: parsedContent.meta
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
                meta: parsedContent.meta
            };
        }
        return null;
    }, [parsedContent, isVisionStruct, isStandardUGC]);

    const startEdit = () => {
        setEditText(promptText);
        setIsEditing(true);
    };

    const saveEdit = () => {
        onUpdate(prompt.id || '', editText);
        setIsEditing(false);
    };

    const handleCopy = () => {
        const textToCopy = isLoRAMode ? finalString : (parsedContent ? JSON.stringify(parsedContent, null, 2) : promptText);
        navigator.clipboard.writeText(textToCopy);
        onToggleCopy(prompt.id || '');
    };

    const cardStyle: React.CSSProperties = {
        position: 'relative',
        background: '#181a1f',
        border: isCopied ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid #1f2937',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginBottom: '1rem',
        boxShadow: isCopied ? '0 0 0 1px rgba(34, 197, 94, 0.3)' : 'none',
    };

    const headerStyle: React.CSSProperties = {
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        position: 'relative',
        zIndex: 10,
    };

    const indexBadgeStyle: React.CSSProperties = {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: 'rgba(49, 46, 129, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        color: '#818cf8',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '0.375rem',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        background: '#1f2937',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    };

    const copiedButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: '#22c55e',
        color: 'white',
        boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
    };

    const contentStyle: React.CSSProperties = {
        padding: '1rem',
        position: 'relative',
        zIndex: 10,
        textAlign: 'left',
    };

    const codeBlockStyle: React.CSSProperties = {
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: 'rgba(74, 222, 128, 0.9)',
        lineHeight: 1.6,
        wordBreak: 'break-word',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    };

    const panelStyle: React.CSSProperties = {
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '0.75rem',
        border: '1px solid rgba(31, 41, 55, 0.5)',
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
    };

    return (
        <div style={cardStyle} data-testid={`prompt-card-${index}`}>
            {isCopied && <div style={{ position: 'absolute', inset: 0, background: 'rgba(34, 197, 94, 0.05)', pointerEvents: 'none', zIndex: 0 }} />}

            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={indexBadgeStyle}>
                        {meta?.index !== undefined ? meta.index : index + 1}
                    </div>
                    {meta ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.type}</span>
                            <span style={{ padding: '0.125rem 0.375rem', borderRadius: '4px', background: 'rgba(49, 46, 129, 0.3)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.5625rem', color: '#a5b4fc', fontFamily: 'monospace' }}>
                                {meta.label}
                            </span>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Prompt {index + 1} / {totalInPage}</span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleCopy} style={isCopied ? copiedButtonStyle : buttonStyle} title="Copy" data-testid={`button-copy-${index}`}>
                        {isCopied ? <IconCheck style={{ width: 16, height: 16 }} /> : <IconCopy style={{ width: 16, height: 16 }} />}
                    </button>
                    <button onClick={startEdit} style={buttonStyle} title="Edit" data-testid={`button-edit-${index}`}>
                        <IconEdit style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>

            <div style={contentStyle}>
                {isEditing ? (
                    <div>
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={saveEdit}
                            autoFocus
                            style={{
                                width: '100%',
                                height: '256px',
                                background: 'rgba(0, 0, 0, 0.5)',
                                color: '#e5e7eb',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid #374151',
                                outline: 'none',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                lineHeight: 1.6,
                                resize: 'none',
                            }}
                            data-testid="textarea-prompt-edit"
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {isLoRAMode && (
                            <>
                                <div style={codeBlockStyle}>{finalString}</div>
                                {refLogic && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', background: 'rgba(180, 83, 9, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '4px' }}>
                                            <IconSettings style={{ width: 12, height: 12, color: '#f59e0b' }} />
                                            <span style={{ fontSize: '0.5625rem', color: '#fde68a', fontFamily: 'monospace' }}>
                                                REF: {refLogic.primary_ref} / {refLogic.secondary_ref}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {normalizedData && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <SectionHeader title="Subject Core" color="#818cf8" icon={<IconUser style={{ width: 12, height: 12, color: '#6366f1' }} />} />
                                    <div style={panelStyle}>
                                        <div style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: 1.6, marginBottom: '0.5rem', textAlign: 'left' }}>
                                            <span style={{ color: 'rgba(129, 140, 248, 0.7)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.625rem', marginRight: '0.5rem' }}>Identity:</span>
                                            {normalizedData.core?.identity}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: 1.6, textAlign: 'left' }}>
                                            <span style={{ color: 'rgba(129, 140, 248, 0.7)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.625rem', marginRight: '0.5rem' }}>Styling:</span>
                                            {normalizedData.core?.styling}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <SectionHeader title="Atmosphere" color="#fbbf24" icon={<IconSettings style={{ width: 12, height: 12, color: '#f59e0b' }} />} />
                                    <div style={gridStyle}>
                                        <div style={panelStyle}>
                                            <div style={{ fontSize: '0.5625rem', color: 'rgba(245, 158, 11, 0.7)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lighting</div>
                                            <div style={{ fontSize: '0.625rem', color: '#9ca3af', lineHeight: 1.4 }}>{normalizedData.atm?.lighting_source}</div>
                                        </div>
                                        <div style={panelStyle}>
                                            <div style={{ fontSize: '0.5625rem', color: 'rgba(245, 158, 11, 0.7)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Mood</div>
                                            <div style={{ fontSize: '0.625rem', color: '#9ca3af', lineHeight: 1.4 }}>{normalizedData.atm?.mood}</div>
                                        </div>
                                    </div>
                                </div>

                                {isStandardUGC && parsedContent?.subject?.clothing && (
                                    <div>
                                        <SectionHeader title="Wardrobe" color="#fb7185" icon={<div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fb7185' }} />} />
                                        <div style={{ ...panelStyle, ...gridStyle }}>
                                            <ClothingItem label="Top" item={parsedContent.subject.clothing.top} />
                                            <ClothingItem label="Bottom" item={parsedContent.subject.clothing.bottom} />
                                        </div>
                                    </div>
                                )}

                                {normalizedData.details && (
                                    <div>
                                        <SectionHeader title="Details" color="#34d399" icon={<IconCheck style={{ width: 12, height: 12, color: '#10b981' }} />} />
                                        <div style={{ ...panelStyle, ...gridStyle, gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                                            <KeyVal label="Hands" val={normalizedData.details.hands_and_fingers} />
                                            <KeyVal label="Head" val={normalizedData.details.head_and_gaze} />
                                            <KeyVal label="Post" val={normalizedData.details.posture_and_spine} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isLoRAMode && !normalizedData && (
                            <div style={codeBlockStyle}>
                                {parsedContent ? JSON.stringify(parsedContent, null, 2) : promptText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
