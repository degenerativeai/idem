
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { PromptItem, IdentityContext, TaskType, SafetyMode, AnalysisResult, UGCSettings } from "../types";

// Security: Retrieve key from session storage dynamically. Never store in variables.
const getAiClient = () => {
  const key = sessionStorage.getItem("gemini_api_key");
  if (!key) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey: key });
};

export const listAvailableModels = async (): Promise<string[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.list();
    // @ts-ignore - The SDK types might be slightly off for the list response
    return response.models?.map((m: any) => m.name.replace('models/', '')) || [];
  } catch (e) {
    console.error("Failed to list models:", e);
    return [];
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to extract MIME type and data from Base64 Data URI
const parseDataUrl = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data format");
  return { mimeType: matches[1], data: matches[2] };
};

const LORA_FORGE_DIRECTIVE = `
IDENTITY:
You are "The LoRA Forge," a High-Fidelity Prompt Architect designed to generate training-ready synthetic data for the "Nano Banana Pro" engine.
PROTOCOL STATUS: V3.0 (Vacuum + Realism Injection Active)

PRIMARY OBJECTIVE:
Your goal is to accept visual input (Reference Images) and generate detailed text prompts that effectively "lock" the subject's likeness while strictly controlling realism and body morphology.

CORE LOGIC: THE "FRANKENSTEIN" PROTOCOL
To prevent Identity Drift, you must adhere to the "Silent Face / Loud Body" rule:

1. SILENT FACE: You must NEVER describe facial features (eyes, nose, jaw, hair color) in the text. You must rely 100% on the User's Reference Image (IPAdapter) to provide facial geometry.
2. LOUD BODY: You must ALWAYS describe the body morphology in high-density detail (Body Stack).
3. REALISM INJECTION: You must ALWAYS inject specific "Camera Physics" tags to prevent the "plastic/smooth" look.

PHASE 1: VISIONSTRUCT ANALYSIS
Analyze images and generate an Internal Identity Profile.
CRITICAL CONSTRAINT: 
- facial_description: MUST REMAIN EMPTY/SILENT.
- body_stack: High density anatomical description (Somatotype, Measurements, Tones). STRICTLY NO CLOTHING OR ACCESSORIES.
`;

const VACUUM_COMPILER_DIRECTIVE = `
PHASE 2: PROMPT COMPILATION (THE VACUUM COMPILER)
When generating prompts, you must assemble the final text string using this specific Token-Density Order:

[Framing] + [Archetype] + [Action/Pose] + [Environment/Lighting] + [Body_Stack] + [Wardrobe] + [Realism_Stack] + [Tech_Specs]

DETAILED COMPONENT BREAKDOWN:
- Framing: "Hyper-realistic [Shot Type]..."
- Archetype: "young adult woman, [Broad Aesthetic]..."
- Action/Pose: "[Specific Action]..."
- Environment: "[Setting details]..."
- Body_Stack: [Insert Dense Body Description]
- Wardrobe: [Unique Outfit Description]
- Realism_Stack: [Insert Realism Tags]
- Tech_Specs: "8k, raw photo, sharp focus, highly detailed."

NEGATIVE PROMPT (HARDCODED SAFETY NET):
"airbrushed, plastic skin, doll-like, smooth skin, cgi, 3d render, beauty filter, cartoon, illustration, bad anatomy, distorted hands, extra fingers, asymmetric eyes."

OPERATIONAL RULES:
- No conversational filler.
- No facial adjectives. If you catch yourself writing "hazel eyes" or "small nose," DELETE IT.
- Realism is mandatory.
`;

const RICH_MEDIA_DIRECTIVE_CANDID = `
# Context & Goal
You are an expert at creating AUTONOMOUS, CANDID, and AMATEUR-STYLE image generation prompts. 
Your goal is to simulate "Real Life" photography, not "Studio" photography.
The images should look like they were taken by a friend with a smartphone, not a professional photographer.

## AESTHETIC PROTOCOL: "THE SNAPSHOT"
- **Camera Gear**: Phone cameras (iPhone/Pixel), disposable film cameras, Instax.
- **Lighting**: Harsh on-camera flash, bad fluorescent lighting, uneven natural light, mixed lighting. NEVER perfect studio lighting.
- **Framing**: Slightly off-center, Dutch angles, accidental cropping, messy backgrounds.
- **Subject Behavior**: Eating, laughing mid-sentence, looking away, fixing hair, walking, yawning. NEVER posing perfectly for the camera.

## JSON Structure Template
Always use this exact structure:
{
  "subject": {
    "description": "[Action-based scene overview]",
    "mirror_rules": "[Rules for mirror selfies]",
    "age": "[Approx age]",
    "expression": "[Candid Emotion - e.g. mid-laugh, confused, bored]",
    "imperfections": {
       "skin": "[Texture/Pores/Flush]",
       "hair": "[Flyaways/Messy strands/Bedhead]",
       "general": "[Sweat/Creases/Lint/Stains]"
    },
    "body": "[Physical Profile - injected]",
    "clothing": { "top": {...}, "bottom": {...} },
    "face": { "makeup": "..." }
  },
  "accessories": { ... },
  "photography": { "camera_style": "...", "angle": "...", "shot_type": "..." },
  "tech_specs": {
    "camera_physics": "[Motion blur, harsh flash, red-eye, noise, grain]",
    "sensor_fidelity": "[Phone sensor noise, JPEG artifacts, overexposure]",
    "lighting_physics": "[Direct flash, hard shadows, mixed color temperature]"
  },
  "background": { "setting": "...", "elements": [...] }
}

CRITICAL RULES:
1. **IDENTITY LOCK**: You MUST adhere to the [Physical Profile] injected in the "subject.body" or "subject.description". Do not hallucinate new hair colors, ethnicities, or body types.
2. **NO 'MODEL' BEHAVIOR**: Subject should generally NOT be looking directly at the lens unless it's a selfie.
3. **UNIQUE OUTFITS**: Never repeat an outfit.
4. **MANDATORY IMPERFECTIONS**: Make it look real. Stains, wrinkles, mess.
5. **TECH SPECS**: Must include terms like 'direct flash', 'phone camera', 'motion blur', 'high ISO'.
`;

const RICH_MEDIA_DIRECTIVE_STUDIO = `
# Context & Goal
You are an expert at creating HYPER-REALISTIC, HIGH-FIDELITY, and CINEMATIC image generation prompts.
Your goal is to simulate "High-End Commercial/Editorial" photography.
The images should look like they were taken by a world-class professional photographer with top-tier equipment.

## AESTHETIC PROTOCOL: "THE STUDIO"
- **Camera Gear**: Phase One XF, Hasselblad, Leica, Sony A7R V (85mm f/1.2).
- **Lighting**: Softbox, Rim Lighting, Volumetric God Rays, Golden Hour, REMBRANDT Lighting. Perfect exposure.
- **Framing**: Rule of thirds, Golden Ratio, Cinematic composition, Depth of Field (Bokeh).
- **Subject Behavior**: Confident, Professional Model, Intense Gaze, Dynamic Posing, "Vogue" style.

## JSON Structure Template
Always use this exact structure:
{
  "subject": {
    "description": "[Cinematic scene overview]",
    "age": "[Approx age]",
    "expression": "[Intense/Professional Emotion]",
    "imperfections": {
       "skin": "[Hyper-detailed texture, micropores, biological realism]",
       "hair": "[Detailed strands, perfect volume]",
       "general": "[Realistic fabric texture]"
    },
    "body": "[Physical Profile - injected]",
    "clothing": { "top": {...}, "bottom": {...} },
    "face": { "makeup": "..." }
  },
  "accessories": { ... },
  "photography": { "camera_style": "...", "angle": "...", "shot_type": "..." },
  "tech_specs": {
    "camera_physics": "[Depth of field, bokeh, chromatic aberration (subtle), 8k, raw photo]",
    "sensor_fidelity": "[Zero noise, extreme sharpness, high dynamic range]",
    "lighting_physics": "[Subsurface scattering, volumetric rays, caustic lighting]"
  },
  "background": { "setting": "...", "elements": [...] }
}

CRITICAL RULES:
1. **HIGH FIDELITY**: Must specify camera gear (e.g. '85mm f/1.2', 'Phase One').
2. **PERFECT LIGHTING**: Use terms like 'Rembrandt lighting', 'Volumetric'.
3. **DETAIL**: Focus on 'micropores', 'fabric texture', 'sharp focus'.
`;

const VISION_STRUCT_DIRECTIVE = `
# Role & Objective
You are VisionStruct Ultra, a forensic-level computer vision analyst. Your goal is to analyze an image and generate a JSON prompt with extreme anatomical and spatial fidelity for high-end image reproduction.

# Analysis Protocol
1.  **Macro Sweep:** Scene context and atmosphere.
2.  **Anatomical Audit (CRITICAL):** You must analyze the subject's bio-mechanics. Do not just say "leaning." Specify the angle. Do not just say "holding waist." Count the visible fingers and describe the grip pressure. Note spinal curvature (arched, straight, slumped).
3.  **Texture & Flaw Scan:** Identify skin texture, fabric tension lines, and environmental imperfections.

# Guidelines
* **Quantify where possible:** Use degrees for angles (e.g., "bent 45 degrees forward") and counts for digits (e.g., "thumb and two fingers visible").
* **Describe Tension:** Note where clothing pulls tight against the skin or where skin presses against surfaces.
* **No Generalizations:** "Sexy pose" is forbidden. Use "Back arched, hips rotated 30 degrees to camera left, chin over shoulder."
* **Celebrity Recognition:** If the subject resembles a public figure, explicitly mention them in the 'identity' field using the phrase: "an adult woman that looks just like [Name]" to lock likeness.
* **Terminology:** ALWAYS prefix "woman" with "adult" (e.g. "adult woman", "young adult woman"). NEVER use "young woman" alone.
* **Conciseness:** Do not be poetic or philosophical. Do not repeat sentences. Be clinical and precise.

# JSON Output Schema
{
  "meta": {
    "medium": "Source medium (Film/Digital/Phone)",
    "visual_fidelity": "Raw/Polished/Grainy"
  },
  "atmosphere_and_context": {
    "mood": "Psychological tone",
    "lighting_source": "Direction, hardness, and color temp of light",
    "shadow_play": "How shadows interact with the subject's curves/features"
  },
  "subject_core": {
    "identity": "CRITICAL: Ethnicity/Heritage (be specific), Age, Eye Color, Face Shape (e.g. 'diamond', 'oval', 'square'), Jawline definition. IF CELEBRITY RECOGNIZED: Explicitly name them.",
    "styling": "Hair texture (type 1-4c), Exact Length (e.g. 'shoulder length', 'mid-back'), Parting (middle/side), makeup details.",
    "imperfections": {
        "skin": "Texture, pores, flush, freckles, scars, moles (map them).",
        "hair": "Flyaways, messy strands, frizz, baby hairs, hairline details.",
        "general": "Sweat, creases, lint, dust, asymmetry."
    }
  },
  "anatomical_details": {
    "posture_and_spine": "CRITICAL: Describe spinal arch, pelvic tilt, and waist bend angles.",
    "limb_placement": "Exact positioning of arms and legs.",
    "hands_and_fingers": "CRITICAL: For every visible hand, describe the grip, how many fingers are visible, and interaction with surfaces (e.g., 'fingers pressing into hip').",
    "head_and_gaze": "Head tilt angle and exact eye line direction."
  },
  "attire_mechanics": {
    "garments": "Detailed list of clothing items.",
    "fit_and_physics": "How the fabric reacts to the pose (e.g., 'skirt riding up on thigh', 'shirt stretching across bust', 'waistband digging slightly into skin')."
  },
  "environment_and_depth": {
    "background_elements": "List distinct objects to anchor depth.",
    "surface_interactions": "How the subject contacts the environment (e.g., 'leaning heavily on a scratched wooden rail')."
  },
  "image_texture": {
    "quality_defects": "Film grain, motion blur, ISO noise, lens flares.",
    "camera_characteristics": "Focal length feel, depth of field."
  }
}
`;

export const analyzeImageWithDirective = async (
  imageDataUrl: string,
  modelId: string = 'gemini-1.5-flash'
): Promise<any> => {
  const ai = getAiClient();
  const { mimeType, data } = parseDataUrl(imageDataUrl);

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      meta: { type: Type.OBJECT, properties: { medium: { type: Type.STRING }, visual_fidelity: { type: Type.STRING } } },
      atmosphere_and_context: { type: Type.OBJECT, properties: { mood: { type: Type.STRING }, lighting_source: { type: Type.STRING }, shadow_play: { type: Type.STRING } } },
      subject_core: {
        type: Type.OBJECT,
        properties: {
          identity: { type: Type.STRING },
          styling: { type: Type.STRING },
          imperfections: { type: Type.OBJECT, properties: { skin: { type: Type.STRING }, hair: { type: Type.STRING }, general: { type: Type.STRING } } }
        }
      },
      anatomical_details: { type: Type.OBJECT, properties: { posture_and_spine: { type: Type.STRING }, limb_placement: { type: Type.STRING }, hands_and_fingers: { type: Type.STRING }, head_and_gaze: { type: Type.STRING } } },
      attire_mechanics: { type: Type.OBJECT, properties: { garments: { type: Type.STRING }, fit_and_physics: { type: Type.STRING } } },
      environment_and_depth: { type: Type.OBJECT, properties: { background_elements: { type: Type.STRING }, surface_interactions: { type: Type.STRING } } },
      image_texture: { type: Type.OBJECT, properties: { quality_defects: { type: Type.STRING }, camera_characteristics: { type: Type.STRING } } }
    },
    required: ["meta", "atmosphere_and_context", "subject_core", "anatomical_details", "attire_mechanics", "environment_and_depth", "image_texture"]
  };

  const candidates = [
    modelId, // User preference first
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash', // Fallbacks just in case
    'gemini-1.5-pro'
  ];

  // Deduplicate
  const uniqueCandidates = [...new Set(candidates)];
  let lastError;

  for (const model of uniqueCandidates) {
    try {
      console.log(`Attempting analysis with model: ${model}`);
      const response = await Promise.race([
        ai.models.generateContent({
          model: model,
          contents: {
            parts: [
              { inlineData: { mimeType, data } },
              { text: VISION_STRUCT_DIRECTIVE }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2,
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out after 300s")), 300000))
      ]);

      if (!response.text) throw new Error("Empty response from API");

      // If we get here, it worked!
      const jsonText = response.text;
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.log("Raw Output:", jsonText);
        // If it's a markdown block, try to strip it
        if (jsonText.includes("```json")) {
          const match = jsonText.match(/```json\n([\s\S]*?)\n```/);
          if (match) return JSON.parse(match[1]);
        }
        throw new Error("Failed to parse JSON response");
      }

    } catch (e: any) {
      console.warn(`Model ${model} failed:`, e);
      lastError = e;
      // If it's a 404 or 400, continue to next candidate. 
      // If it's a timeout, maybe we should stop? No, try others.
      if (e.message?.includes('404') || e.message?.includes('not found') || e.message?.includes('400')) {
        continue;
      }
      // For other errors (auth, quota), maybe stop? 
      // But for now, let's try all candidates to be safe.
    }
  }

  // If all failed
  throw lastError || new Error("All model candidates failed.");

};

export const analyzeSubjectImages = async (
  headshotDataUrl: string | null,
  bodyshotDataUrl: string | null
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  if (!headshotDataUrl && !bodyshotDataUrl) throw new Error("No images provided");

  const parts = [];
  if (headshotDataUrl) {
    const { mimeType, data } = parseDataUrl(headshotDataUrl);
    parts.push({ inlineData: { mimeType, data } });
  }
  if (bodyshotDataUrl) {
    const { mimeType, data } = parseDataUrl(bodyshotDataUrl);
    parts.push({ inlineData: { mimeType, data } });
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      identity_profile: {
        type: Type.OBJECT,
        properties: {
          uid: { type: Type.STRING, description: "Inferred Name (Culturally appropriate based on visual heritage) or Creative Unique Name" },
          age_estimate: { type: Type.STRING, description: "Estimated age (e.g. '25 years old')" },
          archetype_anchor: { type: Type.STRING, description: "Broad category only (e.g. 'Young adult woman, commercial model aesthetic')" },
          facial_description: { type: Type.STRING, description: "MUST BE EMPTY STRING (SILENT)" },
          body_stack: { type: Type.STRING, description: "High density anatomical description: Somatotype, Bust, Waist, Hips, Glutes, Limbs." },
          realism_stack: { type: Type.STRING, description: "Camera physics tags: subsurface scattering, skin texture, etc." }
        },
        required: ["uid", "age_estimate", "archetype_anchor", "facial_description", "body_stack", "realism_stack"]
      }
    },
    required: ["identity_profile"]
  };

  parts.push({
    text: `${LORA_FORGE_DIRECTIVE}
    
    TASK: Analyze the provided images and generate the Identity Profile.
    REMEMBER: Facial Description must be SILENT (Empty). 
    REMEMBER: Body Stack must be ANATOMICAL ONLY. Do NOT describe clothing, fabric, or accessories. Focus on bone structure, muscle tone, and skin.
    NAME INFERENCE: Assign a fitting name based on the subject's apparent heritage (e.g. 'Yuki' for Japanese, 'Elena' for Eastern European).
    Return JSON.`
  });

  const candidates = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
  let response;
  let lastError;

  for (const model of candidates) {
    try {
      console.log(`Attempting analysis with model: ${model}`);
      response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2,
        }
      });
      break; // Success
    } catch (e: any) {
      console.warn(`Analysis model ${model} failed:`, e.message);
      lastError = e;
      if (e.message?.includes('404') || e.message?.includes('not found') || e.message?.includes('429')) {
        continue;
      }
      throw e;
    }
  }

  if (!response) throw lastError || new Error("All analysis models failed.");

  const parsed = JSON.parse(response.text || "{}");
  return parsed as AnalysisResult;
};



export const generateDatasetPrompts = async (
  params: {
    taskType: TaskType,
    subjectDescription: string, // Maps to Body Stack
    identity: IdentityContext, // backstory maps to Realism Stack, profession to Archetype
    safetyMode: SafetyMode,
    productImages?: string[],
    count: number,
    startCount: number,
    totalTarget: number,
    previousSettings?: string[],
    ugcSettings?: UGCSettings
  }
): Promise<PromptItem[]> => {
  const ai = getAiClient();

  const { taskType, subjectDescription, identity, safetyMode, productImages, count, startCount, totalTarget, previousSettings, ugcSettings } = params;

  // --- Manifest Generation ---
  const batchManifest: {
    index: number;
    absoluteIndex: number;
    meta: {
      type: string;
      index: number;
      total: number;
      label: string;
    }
  }[] = [];

  if (taskType === 'product') {
    for (let i = 0; i < count; i++) {
      const absoluteIndex = startCount + i;
      batchManifest.push({
        index: i,
        absoluteIndex,
        meta: { type: "PRODUCT AD", index: absoluteIndex + 1, total: totalTarget, label: "Optimized Ad Composition" }
      });
    }
  } else if (taskType === 'ugc') {
    for (let i = 0; i < count; i++) {
      const absoluteIndex = startCount + i;
      batchManifest.push({
        index: i,
        absoluteIndex,
        meta: { type: "UGC LIFESTYLE", index: absoluteIndex + 1, total: totalTarget, label: `Authentic ${ugcSettings?.platform || 'Social'} Content` }
      });
    }
  } else {
    // LoRA Mode - Century Protocol
    const headshotLimit = Math.max(1, Math.floor(totalTarget * 0.35));
    const halfBodyLimit = headshotLimit + Math.max(1, Math.floor(totalTarget * 0.30));
    const threeQuarterLimit = halfBodyLimit + Math.max(1, Math.floor(totalTarget * 0.20));
    const MANDATORY_SEQUENCE = ["Left 1/4 View", "Front View", "Right 1/4 View", "Left Profile", "Right Profile", "Look Up", "Look Down"];

    for (let i = 0; i < count; i++) {
      const absoluteIndex = startCount + i;
      let type = "", label = "", categoryTotal = 0, categoryIndex = 0;

      if (absoluteIndex < headshotLimit) {
        type = "HEADSHOT";
        categoryTotal = headshotLimit;
        categoryIndex = absoluteIndex + 1;
        label = absoluteIndex < MANDATORY_SEQUENCE.length ? MANDATORY_SEQUENCE[absoluteIndex] : "Varied Headshot";
      } else if (absoluteIndex < halfBodyLimit) {
        type = "HALF BODY";
        categoryTotal = halfBodyLimit - headshotLimit;
        categoryIndex = absoluteIndex - headshotLimit + 1;
        label = "Waist Up / Lifestyle";
      } else if (absoluteIndex < threeQuarterLimit) {
        type = "3/4 BODY";
        categoryTotal = threeQuarterLimit - halfBodyLimit;
        categoryIndex = absoluteIndex - halfBodyLimit + 1;
        label = "Knees Up / Environmental";
      } else {
        type = "FULL BODY";
        categoryTotal = totalTarget - threeQuarterLimit;
        categoryIndex = absoluteIndex - threeQuarterLimit + 1;
        label = "Head to Toe";
      }

      batchManifest.push({
        index: i,
        absoluteIndex,
        meta: { type, index: categoryIndex, total: categoryTotal, label }
      });
    }
  }

  const manifestString = batchManifest.map(m =>
    `Item ${m.index + 1}: ${m.meta.type} (${m.meta.label}). Metadata: ${m.meta.index}/${m.meta.total}`
  ).join("\n");

  // Anti-Repetition
  let repetitionDirective = "";

  if (previousSettings && previousSettings.length > 0) {
    // Sanitize: Take last 10, parse them to extract meaningful visual tags.
    const recentSettings = previousSettings.slice(-10).map(s => {
      try {
        const p = JSON.parse(s);
        const setting = p.background?.setting || "";
        const outfit = p.subject?.clothing?.top?.type || "";
        if (!setting && !outfit) return "";
        // STRICT SANITIZATION: Remove all special characters, quotes, brackets. Keep words only.
        const raw = `${setting} ${outfit}`;
        return raw.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      } catch (e) {
        return "";
      }
    }).filter(x => x && x.length > 3).join(", ");

    if (recentSettings.length > 0) {
      repetitionDirective = `AVOID: ${recentSettings}.`;
    }
  }

  // --- HYBRID GENERATION LOGIC ---

  let promptText = "";
  const parts: any[] = [];
  let schema: Schema = { type: Type.OBJECT, properties: {} };

  // MODE A: LORA (Vacuum Protocol)
  if (taskType === 'lora') {
    const BODY_STACK = subjectDescription;
    const REALISM_STACK = identity.backstory || "subsurface scattering, detailed skin texture, visible pores, faint skin sheen";
    const ARCHETYPE = `${identity.age_estimate || "25yo"} ${identity.profession || "woman"}`.trim();

    let clothingDirective = "";
    if (safetyMode === 'nsfw') {
      clothingDirective = `WARDROBE: REVEALING & BOLD. Focus on skin exposure suitable for the setting.
      - PRIORITIZE: Crop Tops, Halters, Low Rise Jeans, Micro Skirts, Bikini Tops, Open Backs, Deep V-Necks.
      - CONTEXTUAL: If gym -> Sports Bra/Shorts. If night -> Mini Dress. If beach -> Bikini.
      - AVOID: "Cutouts" (unless necessary), "Sheer", "Lace".
      - MUST BE UNIQUE PER ITEM.`;
    } else {
      clothingDirective = `WARDROBE: SFW/MODEST. Casual, standard. MUST BE UNIQUE PER ITEM. VARY COLORS, CUTS, AND STYLES.`;
    }

    promptText = `
        ${VACUUM_COMPILER_DIRECTIVE}
        INPUT DATA:
        ARCHETYPE: ${ARCHETYPE}
        BODY_STACK: ${BODY_STACK}
        REALISM_STACK: ${REALISM_STACK}
        ${clothingDirective}
        ${repetitionDirective}
        VARIETY PROTOCOL: ENABLED.
        - NEVER repeat an outfit.
        - NEVER repeat a setting.
        - If you used "Black Top" in Item 1, you CANNOT use it in Item 2.
        - EXPRESSION LOGIC: 10% must be emotional (Laughter, Sadness, Surprise). 90% Neutral/Smile/Alluring.
        - SYNTAX BAN: DO NOT use "(text:0.8)" weighting. Use natural language only.
        - CRITICAL: POPULATE ALL FIELDS. Do not return "none" or "not specified". Invent details if needed.
        
        TASK: Generate exactly ${count} JSON prompts following this MANIFEST:
        ${manifestString}
        OUTPUT TEMPLATE PER ITEM:
        {
          "generation_data": {
            "reference_logic": { "primary_ref": "Headshot", "secondary_ref": "Full Body" },
            "final_prompt_string": "[COMPLIED STRING: Framing + Archetype + Action + Environment + Body + Wardrobe + Realism + Tech]"
          },
          "subject": {
             "description": "...",
             "age": "...",
             "expression": "...",
             "imperfections": { "skin": "...", "hair": "...", "general": "..." },
             "clothing": { "top": { "color": "...", "type": "..." }, "bottom": { "color": "...", "type": "..." } }
          },
          "background": { "setting": "...", "elements": ["..."] },
          "photography": { "shot_type": "...", "angle": "...", "camera_style": "..." }
        }
        Return a JSON array.
      `;

    schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          generation_data: {
            type: Type.OBJECT,
            properties: {
              reference_logic: { type: Type.OBJECT, properties: { primary_ref: { type: Type.STRING }, secondary_ref: { type: Type.STRING } } },
              final_prompt_string: { type: Type.STRING, description: "MANDATORY: The full compiled prompt string." }
            },
            required: ["reference_logic", "final_prompt_string"]
          },
          subject: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              age: { type: Type.STRING },
              expression: { type: Type.STRING },
              imperfections: { type: Type.OBJECT, properties: { skin: { type: Type.STRING }, hair: { type: Type.STRING }, general: { type: Type.STRING } } },
              clothing: {
                type: Type.OBJECT,
                properties: {
                  top: { type: Type.OBJECT, properties: { color: { type: Type.STRING }, type: { type: Type.STRING } }, required: ["color", "type"] },
                  bottom: { type: Type.OBJECT, properties: { color: { type: Type.STRING }, type: { type: Type.STRING } }, required: ["color", "type"] }
                },
                required: ["top", "bottom"]
              }
            },
            required: ["description", "age", "expression", "imperfections", "clothing"]
          },
          background: {
            type: Type.OBJECT,
            properties: {
              setting: { type: Type.STRING },
              elements: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          photography: {
            type: Type.OBJECT,
            properties: {
              shot_type: { type: Type.STRING },
              angle: { type: Type.STRING },
              camera_style: { type: Type.STRING }
            }
          },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["generation_data", "subject", "background", "photography"]
      }
    };

  } else {
    // MODE B: RICH JSON (Product / Generic)

    // Product Logic
    let productDirective = "";
    if (taskType === 'product' && productImages && productImages.length > 0) {
      productImages.forEach(img => {
        const { mimeType, data } = parseDataUrl(img);
        parts.push({ inlineData: { mimeType, data } });
      });
      productDirective = `MODE: PRODUCT AD. Integrate product naturally. Invent branding if ugc.`;
    }

    // UGC Logic
    let ugcDirective = "";
    if (taskType === 'ugc' && ugcSettings) {
      const { platform, customInstruction } = ugcSettings;
      let platformRules = "";

      switch (platform) {
        case 'instagram':
          platformRules = "AESTHETIC: Authentic lifestyle, 'photo dump' style, casual snapshots, flash photography, natural imperfections. NOT curated perfection.";
          break;
        case 'tiktok':
          platformRules = "VIBE: Raw, unpolished, phone camera quality, messy, behind-the-scenes, candid motion. NOT produced.";
          break;
        case 'linkedin':
          platformRules = "PROFESSIONAL: Natural, approachable, candid workspace moments, relaxed confidence. NOT stiff or overly polished.";
          break;
        case 'youtube':
          platformRules = "THUMBNAIL QUALITY: Expressive, high energy, but grounded in reality. Real texture, not plastic.";
          break;
        default:
          platformRules = "GENERAL SOCIAL: Candid lifestyle photography, authentic moments, phone camera aesthetic.";
      }

      ugcDirective = `
        PLATFORM OPTIMIZATION: ${platform.toUpperCase()}
        ${platformRules}
        CUSTOM REQUEST: "${customInstruction || 'None'}" (IF SET, PRIORITIZE THIS REQUEST ABOVE ALL ELSE).
        `;
    }

    // Social Media Mode Logic (Text-to-Prompt)
    if (taskType === 'ugc' && ugcSettings?.mode === 'social_prompt') {
      const { customInstruction, styleMode } = ugcSettings;

      const SELECTED_DIRECTIVE = styleMode === 'studio' ? RICH_MEDIA_DIRECTIVE_STUDIO : RICH_MEDIA_DIRECTIVE_CANDID;

      promptText = `
        ${SELECTED_DIRECTIVE}

      MODE: SOCIAL MEDIA TEXT - TO - PROMPT
        USER INSTRUCTION: "${customInstruction}"

      TASK: Generate exactly ${count} JSON prompts based on the USER INSTRUCTION.
        - The user has described the Scene, Pose, Clothes, and Vibe.
        - YOU must fill in the "subject.body" and "subject.face" with GENERIC but REALISTIC details(unless specified).
        - DO NOT use the "Silent Face" protocol here.You are generating the full prompt from scratch.
        - REALISM: Mandatory.Use 'tech_specs' for camera physics.
        
        VARIETY PROTOCOL: ENABLED.
        - If the user asked for "Outfit of the day", generate ${count} DIFFERENT variations of that theme.
        - VARY the setting slightly if not fixed.
        - VARY the pose.
        
        CRITICAL: Return valid JSON objects. Do NOT stringify them.
        
        OUTPUT TEMPLATE PER ITEM:
        {
          "subject": { ... },
          "background": { ... },
          "photography": { ... },
          "tech_specs": { ... },
          "meta": { ... }
        }
        
        OUTPUT MANIFEST:
        ${manifestString}
        
        Return a JSON array of objects.
        `;

      // STRICT SCHEMA FOR SOCIAL
      schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.OBJECT, properties: {
                description: { type: Type.STRING },
                clothing: { type: Type.OBJECT }
              }
            },
            background: { type: Type.OBJECT },
            photography: { type: Type.OBJECT },
            tech_specs: { type: Type.OBJECT },
            meta: { type: Type.OBJECT },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["subject", "background", "photography"]
        }
      };

    } else if (taskType === 'ugc' || taskType === 'product') {
      // Existing Image-to-Prompt Logic (Rich Media)
      let clothingDirective = "";
      if (safetyMode === 'nsfw') {
        clothingDirective = `WARDROBE: ANATOMICAL.Fit should be "second-skin", "form-fitting".`;
      }

      const SELECTED_DIRECTIVE = (taskType === 'ugc' && ugcSettings?.styleMode === 'studio')
        ? RICH_MEDIA_DIRECTIVE_STUDIO
        : RICH_MEDIA_DIRECTIVE_CANDID;

      promptText = `
            ${SELECTED_DIRECTIVE}
            IDENTITY CONTEXT:
      Name: ${identity.name}
      Profession: ${identity.profession}
      Backstory: ${identity.backstory}

      SUBJECT: SPECIFIC.Use this PHYSICAL PROFILE: "${subjectDescription}"
            ${clothingDirective}
            VARIETY PROTOCOL: ENABLED.
            - NEVER repeat an outfit.
            - NEVER repeat a setting.

        ${ugcDirective}
            ${repetitionDirective}

            CRITICAL: Return valid JSON objects. Do NOT stringify them.
        
        OUTPUT TEMPLATE PER ITEM:
        {
          "subject": { ... },
          "background": { ... },
          "photography": { ... },
          "tech_specs": { ... },
          "meta": { ... }
        }
        
        OUTPUT MANIFEST:
        ${manifestString}
        
        Return a JSON array of objects.
        `;

      schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } },
            background: { type: Type.OBJECT },
            photography: { type: Type.OBJECT },
            tech_specs: { type: Type.OBJECT },
            meta: { type: Type.OBJECT },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["subject", "background", "photography"]
        }
      };

    }
  }

  // Add product images again if needed for Rich mode
  if (taskType === 'product' && productImages && productImages.length > 0) {
    productImages.forEach(img => {
      const { mimeType, data } = parseDataUrl(img);
      parts.push({ inlineData: { mimeType, data } });
    });
  }
  parts.push({ text: promptText });

  try {
    // Fallback Models
    const candidates = (taskType === 'ugc' && ugcSettings?.modelId)
      ? [ugcSettings.modelId]
      : ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];

    let response;
    let lastError;

    for (const model of candidates) {
      try {
        console.log(`Attempting generation with model: ${model}`);
        response = await ai.models.generateContent({
          model: model,
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 1,
            maxOutputTokens: 8192,
          }
        });
        break; // Success
      } catch (e: any) {
        console.warn(`Model ${model} failed:`, e.message);
        lastError = e;
        if (e.message?.includes('404') || e.message?.includes('not found') || e.message?.includes('429')) {
          continue; // Try next
        }
        throw e; // Critical error
      }
    }

    if (!response) throw lastError || new Error("All model candidates failed.");

    const rawData = (() => {
      const text = response.text || "[]";
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes("```")) {
          const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match) return JSON.parse(match[1]);
        }

        // STRATEGY: Find outer brackets (Handles "Here is the JSON: [...]")
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const bracketContent = text.substring(firstBracket, lastBracket + 1);
          // Try parsing just the bracket content
          try { return JSON.parse(bracketContent); } catch (e) { }

          // Try Trailing Comma fix on bracket content
          try {
            const cleaned = bracketContent.replace(/,(\s*[\]}])/g, '$1');
            return JSON.parse(cleaned);
          } catch (e) { }
        }

        // Final fallback: Aggressive cleanup on whole text
        try {
          const cleaned = text.replace(/,(\s*[\]}])/g, '$1');
          return JSON.parse(cleaned);
        } catch (e2) {
          console.error("JSON Parse Failure", text.substring(0, 500));
          throw new Error(`AI Response Malformed. Try reducing Batch Size.`);
        }
      }
    })();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawData.map((item: any, idx: number) => {
      const manifestItem = batchManifest[idx];

      let textContent = "";
      if (typeof item.text === 'string') {
        textContent = item.text;
      } else {
        textContent = JSON.stringify(item, null, 2);
      }

      return {
        id: generateId(),
        prompt: textContent,
        tags: item.tags || [],
        generationMeta: manifestItem ? manifestItem.meta : undefined
      };
    });

  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
};

export const refineSinglePrompt = async (originalPrompt: string, instruction: string): Promise<string> => {
  return originalPrompt;
}

export const sanitizePrompt = async (unsafePrompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{
          text: `TASK: Rewrite the following Image Generation Prompt to be 100 % Safe For Work and compliant with Safety Policies.
          - Remove any NSFW, violent, or explicit terms.
          - Keep the subject(Age / Ethnicity), Lighting, and Composition intact.
          - If the clothing is "revealing", change it to "modest" or "casual".
          - Return ONLY the raw string of the new prompt.

          ORIGINAL PROMPT:
          ${unsafePrompt} `
        }]
      }
    });
    return response.text || unsafePrompt;
  } catch (e) {
    console.error("Sanitization Failed:", e);
    return unsafePrompt; // If sanitization fails, return original (will likely fail again, but graceful)
  }
};
