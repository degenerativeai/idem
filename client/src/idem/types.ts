
export type TaskType = 'lora' | 'product' | 'ugc';
export type SafetyMode = 'sfw' | 'nsfw';
export type ImageAspect = 'source' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageProvider = 'google' | 'wavespeed';

export interface PromptItem {
    id: string;
    text: string;
    prompt?: string;
    tags: string[];
    isCopied?: boolean;
    generationMeta?: {
        type: string;
        index: number;
        total: number;
        label: string;
    };
}

export interface IdentityContext {
    name: string;
    age_estimate: string;
    profession: string;
    backstory: string;
}

export interface AnalysisResult {
    identity_profile: {
        name: string;
        age_estimate: string;
        archetype_anchor: string;
        facial_description: string;
        body_stack: string;
        realism_stack: string;
    }
}

export type UGCMode = 'replicate' | 'inject' | 'text_prompt';

export interface UGCSettings {
    platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'general';
    customInstruction: string;
    modelId: string;
    mode: UGCMode;
    styleMode: 'studio' | 'candid';
}

export interface INIPrompt {
    desc: string;
    objs: string;
    chars: string;
    style: string;
    comp: string;
    light: string;
    pal: string;
    geom: string;
    micro?: string;
    sym?: string;
    scene: string;
    must: string;
    avoid: string;
    notes?: string;
    scene_only?: string;
    raw?: string;
}

export interface ImageGenerationOptions {
    provider: ImageProvider;
    apiKey: string;
    prompt: string;
    aspectRatio: ImageAspect;
    referenceImages?: string[]; // Base64 strings
    resolution?: '2k' | '4k';
}

export interface ImageGenerationResult {
    ok: boolean;
    b64_json?: string;
    url?: string;
    error?: string;
}

export interface UGCPromptCard {
    id: string;
    scenario: string;
    setting: string;
    outfit: string;
    pose: string;
    expression: string;
    lighting: string;
    camera: string;
    imperfections: string;
    fullPrompt: string;
}

export interface VisionStruct {
    meta: {
        medium: string;
        visual_fidelity: string;
    };
    atmosphere_and_context: {
        mood: string;
        lighting_source: string;
        shadow_play: string;
    };
    subject_core: {
        identity: string;
        styling: string;
    };
    anatomical_details: {
        posture_and_spine: string;
        limb_placement: string;
        hands_and_fingers: string;
        head_and_gaze: string;
    };
    attire_mechanics: {
        garments: string;
        fit_and_physics: string;
    };
    environment_and_depth: {
        background_elements: string;
        surface_interactions: string;
    };
    image_texture: {
        quality_defects: string;
        camera_characteristics: string;
    };
}

export interface PhysicalAppearance {
    age_range: string;
    celebrity_match: string | null;
    face: {
        eye_color: string;
        face_shape: string;
        nose: string;
        lips: string;
        teeth: string;
        jawline: string;
        distinctive: string;
    };
    hair: {
        color: string;
        texture: string;
    };
    body: {
        type: string;
        bust: string;
        waist: string;
        hips: string;
        glutes: string;
        height_impression: string;
    };
    skin: {
        tone: string;
        marks: string;
    };
    identity_summary: string;
}
