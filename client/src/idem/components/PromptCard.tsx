
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

const styles = {
    card: {
        background: '#12141a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '1.5rem',
        position: 'relative' as 'relative',
    },
    cardCopied: {
        borderColor: 'rgba(34, 197, 94, 0.5)',
        boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.3)'
    },
    header: {
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    shotBadge: {
        padding: '0.35rem 0.75rem',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#e2e8f0',
        fontSize: '0.7rem',
        fontWeight: 'bold' as 'bold',
        textTransform: 'uppercase' as 'uppercase',
        letterSpacing: '0.05em',
        marginRight: '0.75rem'
    },
    paginationText: {
        color: '#9ca3af',
        fontSize: '0.85rem',
        marginRight: '1rem',
        fontFamily: 'monospace'
    },
    angleText: {
        color: '#64748b',
        fontSize: '0.85rem',
    },
    actionBtn: {
        padding: '0.5rem',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#9ca3af',
        marginLeft: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    actionBtnCopied: {
        background: '#22c55e',
        color: 'white',
    },
    promptSection: {
        padding: '0 1.25rem 1.25rem 1.25rem',
    },
    promptText: {
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic' as 'italic',
        fontSize: '0.95rem',
        lineHeight: '1.7',
        color: 'rgba(134, 239, 172, 0.9)',
        marginBottom: '1rem',
    },
    refTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '6px',
        background: 'rgba(168, 85, 247, 0.15)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        color: '#c084fc',
        fontSize: '0.75rem',
        fontWeight: 'bold' as 'bold',
        marginBottom: '1rem',
    },
    subjectQuote: {
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic' as 'italic',
        fontSize: '1rem',
        color: '#e2e8f0',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        marginBottom: '1rem',
        borderLeft: '3px solid rgba(255, 255, 255, 0.1)',
    },
    panelsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
    },
    panel: {
        background: 'rgba(0, 0, 0, 0.25)',
        borderRadius: '10px',
        padding: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    panelHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        fontSize: '0.75rem',
        fontWeight: 'bold' as 'bold',
        textTransform: 'uppercase' as 'uppercase',
        letterSpacing: '0.05em',
    },
    panelIcon: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    fieldRow: {
        display: 'flex',
        marginBottom: '0.4rem',
    },
    fieldLabel: {
        fontSize: '0.7rem',
        fontWeight: 'bold' as 'bold',
        textTransform: 'uppercase' as 'uppercase',
        color: '#64748b',
        minWidth: '90px',
        marginRight: '0.5rem',
    },
    fieldValue: {
        fontSize: '0.85rem',
        color: '#e2e8f0',
        flex: 1,
    },
    elementTag: {
        display: 'inline-block',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        background: 'rgba(255, 255, 255, 0.08)',
        color: '#9ca3af',
        fontSize: '0.75rem',
        marginRight: '0.5rem',
        marginTop: '0.25rem',
    },
    clothingLabel: {
        fontSize: '0.65rem',
        fontWeight: 'bold' as 'bold',
        textTransform: 'uppercase' as 'uppercase',
        color: '#f97316',
        marginBottom: '0.1rem',
    },
    clothingValue: {
        fontSize: '0.85rem',
        color: '#e2e8f0',
        marginBottom: '0.5rem',
    },
};

const PanelHeader: React.FC<{ title: string; color: string }> = ({ title, color }) => (
    <div style={{ ...styles.panelHeader, color }}>
        <div style={{ ...styles.panelIcon, background: color }} />
        {title}
    </div>
);

const FieldRow: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
    value ? (
        <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>{label}:</span>
            <span style={styles.fieldValue}>{value}</span>
        </div>
    ) : null
);

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onUpdate, onToggleCopy, isCopied, index, totalInPage = 1 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    const parsedContent = useMemo(() => {
        try {
            if (!prompt.prompt) return null;
            let cleaned = prompt.prompt.trim();
            if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
                return null;
            }
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
            return null;
        }
    }, [prompt.prompt]);

    const extractedData = useMemo(() => {
        if (!parsedContent) return null;
        
        const subject = parsedContent.subject || {};
        const photography = parsedContent.photography || {};
        const background = parsedContent.background || {};
        const techSpecs = parsedContent.tech_specs || {};
        const genData = parsedContent.generation_data || {};
        
        const finalPrompt = genData.final_prompt_string || parsedContent.final_prompt_string || '';
        const shotType = photography.shot_type || genData.shot_type || 'Portrait';
        const angle = photography.angle || genData.angle || '';
        const device = photography.camera_style || techSpecs.camera_physics || 'DSLR';
        
        const age = subject.age || '';
        const expression = subject.expression || '';
        const imperfections = subject.imperfections || {};
        const authenticity = [
            imperfections.skin,
            imperfections.hair,
            imperfections.general
        ].filter(Boolean).join(' ');
        
        const clothing = subject.clothing || {};
        const top = clothing.top ? `${clothing.top.color || ''} ${clothing.top.type || ''}`.trim() : '';
        const bottom = clothing.bottom ? `${clothing.bottom.color || ''} ${clothing.bottom.type || ''}`.trim() : '';
        
        const setting = background.setting || '';
        const elements = background.elements || [];
        
        const bodyDescription = subject.body || subject.description || '';
        const subjectQuote = bodyDescription ? 
            `"${age ? `A ${age} ` : 'A '}woman${bodyDescription ? ` with ${bodyDescription.toLowerCase().replace(/^a\s+/i, '')}` : ''}."` :
            '';
        
        const refType = genData.reference_logic || 'Headshot / Full Body';
        
        return {
            finalPrompt,
            shotType: shotType.toUpperCase(),
            angle,
            device,
            age: age ? `${age} years old` : age,
            expression,
            authenticity,
            top,
            bottom,
            setting,
            elements,
            subjectQuote,
            refType
        };
    }, [parsedContent]);

    const startEdit = () => {
        setEditText(prompt.prompt);
        setIsEditing(true);
    };

    const saveEdit = () => {
        onUpdate(prompt.id || '', editText);
        setIsEditing(false);
    };

    const handleCopy = () => {
        const textToCopy = extractedData?.finalPrompt || prompt.prompt;
        navigator.clipboard.writeText(textToCopy);
        onToggleCopy(prompt.id || '');
    };

    if (isEditing) {
        return (
            <div style={styles.card}>
                <div style={{ padding: '1.25rem' }}>
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            padding: '1rem',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            marginBottom: '1rem',
                            outline: 'none',
                            resize: 'vertical' as 'vertical'
                        }}
                        data-testid="textarea-prompt-edit"
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsEditing(false)} data-testid="button-cancel-edit" style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #374151', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={saveEdit} data-testid="button-save-edit" style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Save Changes</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!extractedData) {
        return (
            <div style={{ ...styles.card, ...(isCopied ? styles.cardCopied : {}) }}>
                <div style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={styles.shotBadge}>PROMPT</span>
                        <span style={styles.paginationText}>{index + 1} / {totalInPage}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={handleCopy} style={{ ...styles.actionBtn, ...(isCopied ? styles.actionBtnCopied : {}) }} title="Copy" data-testid={`button-copy-${index}`}>
                            {isCopied ? <IconCheck style={{ width: 16, height: 16 }} /> : <IconCopy style={{ width: 16, height: 16 }} />}
                        </button>
                        <button onClick={startEdit} style={styles.actionBtn} title="Edit" data-testid={`button-edit-${index}`}>
                            <IconEdit style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                </div>
                <div style={styles.promptSection}>
                    <div style={styles.promptText}>{prompt.prompt}</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...styles.card, ...(isCopied ? styles.cardCopied : {}) }} data-testid={`prompt-card-${index}`}>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={styles.shotBadge}>{extractedData.shotType}</span>
                    <span style={styles.paginationText}>{index + 1} / {totalInPage}</span>
                    {extractedData.angle && <span style={styles.angleText}>{extractedData.angle}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={handleCopy} style={{ ...styles.actionBtn, ...(isCopied ? styles.actionBtnCopied : {}) }} title="Copy" data-testid={`button-copy-${index}`}>
                        {isCopied ? <IconCheck style={{ width: 16, height: 16 }} /> : <IconCopy style={{ width: 16, height: 16 }} />}
                    </button>
                    <button onClick={startEdit} style={styles.actionBtn} title="Edit" data-testid={`button-edit-${index}`}>
                        <IconEdit style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>

            <div style={styles.promptSection}>
                {extractedData.finalPrompt && (
                    <div style={styles.promptText}>{extractedData.finalPrompt}</div>
                )}

                <div style={styles.refTag}>
                    <IconSettings style={{ width: 12, height: 12 }} />
                    REF: {extractedData.refType}
                </div>

                {extractedData.subjectQuote && (
                    <div style={styles.subjectQuote}>{extractedData.subjectQuote}</div>
                )}

                <div style={styles.panelsGrid}>
                    <div style={styles.panel}>
                        <PanelHeader title="SUBJECT IDENTITY" color="#eab308" />
                        <FieldRow label="Age" value={extractedData.age} />
                        <FieldRow label="Expression" value={extractedData.expression} />
                        {extractedData.authenticity && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ ...styles.fieldLabel, color: '#64748b', marginBottom: '0.25rem' }}>AUTHENTICITY</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: '1.4' }}>{extractedData.authenticity}</div>
                            </div>
                        )}
                    </div>

                    <div style={styles.panel}>
                        <PanelHeader title="WARDROBE" color="#f97316" />
                        {extractedData.top && (
                            <>
                                <div style={styles.clothingLabel}>TOP</div>
                                <div style={styles.clothingValue}>{extractedData.top}</div>
                            </>
                        )}
                        {extractedData.bottom && (
                            <>
                                <div style={styles.clothingLabel}>BOTTOM</div>
                                <div style={styles.clothingValue}>{extractedData.bottom}</div>
                            </>
                        )}
                        {!extractedData.top && !extractedData.bottom && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Not specified</div>
                        )}
                    </div>

                    <div style={styles.panel}>
                        <PanelHeader title="ENVIRONMENT" color="#2dd4bf" />
                        <FieldRow label="Setting" value={extractedData.setting} />
                        {extractedData.elements.length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                                {extractedData.elements.map((el: string, i: number) => (
                                    <span key={i} style={styles.elementTag}>{el}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.panel}>
                        <PanelHeader title="CAMERA" color="#9ca3af" />
                        <FieldRow label="Shot" value={extractedData.shotType} />
                        <FieldRow label="Angle" value={extractedData.angle} />
                        <FieldRow label="Device" value={extractedData.device} />
                    </div>
                </div>
            </div>
        </div>
    );
};
