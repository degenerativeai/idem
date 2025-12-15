
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

// Core Interface
// Core Interface - VisionStruct Schema (V1 - Legacy/Swap)
export interface VisualArchitectResult {
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
        facial_expression: string;
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

// Core Interface - VisionStruct Schema (V2 - Clone)
export interface VisualArchitectResultV2 {
    meta: {
        intent: string;
        priorities: string[];
    };
    frame: {
        aspect: string;
        composition: string;
        layout: string;
        perspective: string;
    };
    subject: {
        identity: string;
        demographics: string;
        face_shape: string;
        jaw_chin_structure: string;
        eye_features: string;
        eye_aperture_during_smile: string;
        Skin_Porosity_Texture: string;
        Lip_Volume_Mapping: string;
        hair: string;
        detailed_body_descriptions: string;
        expression: string;
        pose: string;
    };
    wardrobe: {
        garments: string;
        light_behavior: string;
    };
    accessories: {
        jewelry: string;
        eyewear: string;
        bags: string;
        misc: string;
    };
    environment: {
        setting: string;
        surfaces: string;
        depth: string;
        atmosphere: string;
    };
    lighting: {
        key: string;
        fill: string;
        rim: string;
        shadows: string;
        color_temperature: string;
    };
    camera: {
        lens: string;
        aperture: string;
        focus: string;
        perspective: string;
        distortion: string;
    };
    post_processing: {
        color: string;
        tonality: string;
        texture: string;
        film_qualities: string;
    };
    subjective_attractiveness: {
        facial_harmony_rating: string;
        Asian_Beauty_Archetype_Selector: string;
        Feature_Idealization_Score: string;
        Phenotype_Description: string;
        overall_subjective_rating: string;
    };
    negative_specifications: string;
    panel_specifications?: string;
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
