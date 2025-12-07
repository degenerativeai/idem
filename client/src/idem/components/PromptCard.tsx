
import React, { useState } from 'react';
import { PromptItem } from '../types';
import { IconCopy, IconEdit, IconCheck } from './Icons';

interface PromptCardProps {
    prompt: PromptItem;
    onUpdate: (id: string, newText: string) => void;
    onToggleCopy: (id: string) => void;
    isCopied: boolean;
    index: number;
    totalInPage?: number;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onUpdate, onToggleCopy, isCopied, index, totalInPage = 1 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    const startEdit = () => {
        setEditText(prompt.prompt);
        setIsEditing(true);
    };

    const saveEdit = () => {
        onUpdate(prompt.id || '', editText);
        setIsEditing(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt.prompt);
        onToggleCopy(prompt.id || '');
    };

    const cardStyle: React.CSSProperties = {
        background: '#0d0f12',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
        border: isCopied ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
        transition: 'all 0.2s ease',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
    };

    const badgeStyle: React.CSSProperties = {
        padding: '0.4rem 0.75rem',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#e2e8f0',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    const paginationStyle: React.CSSProperties = {
        color: '#6b7280',
        fontSize: '0.9rem',
        marginLeft: '0.75rem',
        fontFamily: 'monospace',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '0.5rem',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#9ca3af',
        marginLeft: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    };

    const copiedButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: '#22c55e',
        color: 'white',
    };

    const promptTextStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: '0.95rem',
        lineHeight: 1.75,
        color: 'rgba(134, 239, 172, 0.9)',
    };

    if (isEditing) {
        return (
            <div style={cardStyle}>
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                        width: '100%',
                        minHeight: '150px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'italic',
                        fontSize: '0.95rem',
                        lineHeight: 1.75,
                        marginBottom: '1rem',
                        outline: 'none',
                        resize: 'vertical',
                    }}
                    data-testid="textarea-prompt-edit"
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={() => setIsEditing(false)} 
                        data-testid="button-cancel-edit" 
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #374151', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={saveEdit} 
                        data-testid="button-save-edit" 
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={cardStyle} data-testid={`prompt-card-${index}`}>
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={badgeStyle}>PROMPT</span>
                    <span style={paginationStyle}>{index + 1} / {totalInPage}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button 
                        onClick={handleCopy} 
                        style={isCopied ? copiedButtonStyle : buttonStyle} 
                        title="Copy" 
                        data-testid={`button-copy-${index}`}
                    >
                        {isCopied ? <IconCheck style={{ width: 16, height: 16 }} /> : <IconCopy style={{ width: 16, height: 16 }} />}
                    </button>
                    <button 
                        onClick={startEdit} 
                        style={buttonStyle} 
                        title="Edit" 
                        data-testid={`button-edit-${index}`}
                    >
                        <IconEdit style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>
            <div style={promptTextStyle}>
                {prompt.prompt}
            </div>
        </div>
    );
};
