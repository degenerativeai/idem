
import React, { useState, useMemo } from 'react';
import { PromptItem } from '../types';
import { IconCopy, IconEdit, IconCheck, IconSettings, IconUser } from './Icons';

interface PromptCardProps {
    prompt: PromptItem;
    onUpdate: (id: string, newText: string) => void;
    onToggleCopy: (id: string) => void;
    isCopied: boolean;
}

// --- Helper Components (Defined outside to avoid hoisting issues) ---
const SectionHeader: React.FC<{ title: string; colorClass: string; icon: React.ReactNode }> = ({ title, colorClass, icon }) => (
    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/5">
        <div className={`w-4 h-4 flex items-center justify-center rounded-sm ${colorClass} bg-opacity-20`}>
            {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colorClass} brightness-125`}>{title}</span>
    </div>
);

const KeyVal: React.FC<{ label: string; val: string | number | undefined }> = ({ label, val }) => (
    val ? (
        <div className="flex items-center text-[10px] mb-1">
            <span className="font-bold text-gray-500 mr-2 uppercase min-w-[50px]">{label}:</span>
            <span className="text-gray-300 truncate">{val}</span>
        </div>
    ) : null
);

const ClothingItem: React.FC<{ label: string; item: { type?: string; color?: string } | undefined }> = ({ label, item }) => {
    if (!item || (!item.type && !item.color)) return <div className="text-[9px] text-gray-600 italic mb-1">{label}: Not specified</div>;
    return (
        <div className="mb-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">{label}</span>
            <div className="text-[10px] text-gray-200">
                {item.color && <span className="text-gray-400 mr-1">{item.color}</span>}
                {item.type}
            </div>
        </div>
    );
};

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onUpdate, onToggleCopy, isCopied }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    // Robust JSON Parsing
    const parsedContent = useMemo(() => {
        try {
            if (!prompt.text) return null;
            // 1. Clean markdown
            let cleaned = prompt.text.replace(/```json\s*|```/gi, '').trim();
            // 2. Extract JSON object if wrapped in text
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            const parsed = JSON.parse(cleaned);
            // Handle array wrapping
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
            return parsed;
        } catch (e) {
            return null;
        }
    }, [prompt.text]);

    // Mode Detection
    const isLoRAMode = !!parsedContent?.generation_data;
    const isVisionStruct = !!parsedContent?.subject_core;
    const isStandardUGC = !!parsedContent?.subject && !!parsedContent?.background && !isVisionStruct;

    // Derived Data for UI
    const finalString = isLoRAMode ? parsedContent?.generation_data?.final_prompt_string : prompt.text;
    const refLogic = parsedContent?.generation_data?.reference_logic;
    const meta = prompt.generationMeta;

    // Normalization for Standard UI (VisionStruct OR Standard UGC)
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
        return null; // Fallback
    }, [parsedContent, isVisionStruct, isStandardUGC]);

    // Handlers
    const startEdit = () => {
        setEditText(prompt.text);
        setIsEditing(true);
    };

    const saveEdit = () => {
        onUpdate(prompt.id, editText);
        setIsEditing(false);
    };

    const handleCopy = () => {
        const textToCopy = isLoRAMode ? finalString : (parsedContent ? JSON.stringify(parsedContent, null, 2) : prompt.text);
        navigator.clipboard.writeText(textToCopy);
        onToggleCopy(prompt.id);
    };

    return (
        <div className={`group relative bg-charcoal border rounded-xl p-0 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/60 ${isCopied
            ? 'border-green-500/50 ring-1 ring-green-500/30'
            : 'border-gray-800 hover:border-gray-600'
            }`}>

            {isCopied && <div className="absolute inset-0 bg-green-500/5 pointer-events-none z-0" />}

            {/* HEADER */}
            <div className="bg-black/40 p-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-mono text-xs">
                        {prompt.generationMeta?.index || '#'}
                    </div>
                    {meta ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-200 tracking-wide uppercase">{meta.type}</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-900/30 border border-indigo-500/20 text-[9px] text-indigo-300 font-mono">
                                {meta.label}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">Raw Prompt</span>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded-lg transition-all ${isCopied ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        {isCopied ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                    </button>
                    <button onClick={startEdit} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-white hover:bg-gray-700">
                        <IconEdit className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="p-4 relative z-10 text-left">
                {isEditing ? (
                    <textarea
                        className="w-full h-64 bg-black/50 text-gray-200 p-4 rounded-lg border border-gray-700 focus:border-musaicPurple outline-none text-xs font-mono leading-relaxed resize-none"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={saveEdit}
                        autoFocus
                    />
                ) : (
                    <div className="space-y-4">

                        {/* VIEW A: LORA DENSE STRING */}
                        {isLoRAMode && (
                            <>
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-xs text-green-400/90 leading-relaxed break-words shadow-inner text-left">
                                    {finalString}
                                </div>
                                {refLogic && (
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-2 px-2 py-1 bg-amber-900/10 border border-amber-500/20 rounded">
                                            <IconSettings className="w-3 h-3 text-amber-500" />
                                            <span className="text-[9px] text-amber-200 font-mono">
                                                REF: {refLogic.primary_ref} / {refLogic.secondary_ref}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* VIEW B: RICH UI (VisionStruct OR Standard UGC) */}
                        {normalizedData && (
                            <div className="grid grid-cols-1 gap-4">
                                {/* Subject */}
                                <div className="space-y-2">
                                    <SectionHeader title="Subject Core" colorClass="text-indigo-400" icon={<IconUser className="w-3 h-3 text-indigo-500" />} />
                                    <div className="bg-black/20 rounded-lg p-3 border border-gray-800/50 space-y-2">
                                        <div className="text-xs text-gray-300 leading-relaxed text-left">
                                            <span className="text-indigo-400/70 font-bold uppercase text-[10px] mr-2">Identity:</span>
                                            {normalizedData.core?.identity}
                                        </div>
                                        <div className="text-xs text-gray-300 leading-relaxed text-left">
                                            <span className="text-indigo-400/70 font-bold uppercase text-[10px] mr-2">Styling:</span>
                                            {normalizedData.core?.styling}
                                        </div>
                                    </div>
                                </div>

                                {/* Atmosphere */}
                                <div className="space-y-2">
                                    <SectionHeader title="Atmosphere" colorClass="text-amber-400" icon={<IconSettings className="w-3 h-3 text-amber-500" />} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/20 rounded-lg p-2 border border-gray-800/50 text-left">
                                            <div className="text-[9px] text-amber-500/70 font-bold uppercase mb-1">Lighting</div>
                                            <div className="text-[10px] text-gray-400 leading-snug">{normalizedData.atm?.lighting_source}</div>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-2 border border-gray-800/50 text-left">
                                            <div className="text-[9px] text-amber-500/70 font-bold uppercase mb-1">Mood</div>
                                            <div className="text-[10px] text-gray-400 leading-snug">{normalizedData.atm?.mood}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Standard UGC Extras (Wardrobe/Camera) - Only if Standard UGC */}
                                {isStandardUGC && parsedContent?.subject?.clothing && (
                                    <div className="space-y-2">
                                        <SectionHeader title="Wardrobe" colorClass="text-rose-400" icon={<div className="w-3 h-3 rounded-full bg-rose-400" />} />
                                        <div className="bg-black/20 rounded-lg p-3 border border-gray-800/50 grid grid-cols-2 gap-2">
                                            <ClothingItem label="Top" item={parsedContent.subject.clothing.top} />
                                            <ClothingItem label="Bottom" item={parsedContent.subject.clothing.bottom} />
                                        </div>
                                    </div>
                                )}

                                {/* Technical Details */}
                                {normalizedData.details && (
                                    <div className="space-y-2">
                                        <SectionHeader title="Details" colorClass="text-emerald-400" icon={<IconCheck className="w-3 h-3 text-emerald-500" />} />
                                        <div className="bg-black/20 rounded-lg p-3 border border-gray-800/50 grid grid-cols-2 gap-x-4 gap-y-2">
                                            <KeyVal label="Hands" val={normalizedData.details.hands_and_fingers} />
                                            <KeyVal label="Head" val={normalizedData.details.head_and_gaze} />
                                            <KeyVal label="Post" val={normalizedData.details.posture_and_spine} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FALLBACK: Raw Text if neither mode matched */}
                        {!isLoRAMode && !normalizedData && (
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5 overflow-x-auto text-left">
                                <pre className="text-[10px] font-mono text-gray-300 leading-tight">
                                    {parsedContent ? JSON.stringify(parsedContent, null, 2) : prompt.text}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
