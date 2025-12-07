
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { PromptItem, IdentityContext, TaskType, SafetyMode, AnalysisResult, UGCSettings } from "../types";
import { 
  LORA_FORGE_DIRECTIVE, 
  VACUUM_COMPILER_DIRECTIVE, 
  RICH_MEDIA_DIRECTIVE_CANDID, 
  RICH_MEDIA_DIRECTIVE_STUDIO, 
  VISION_STRUCT_DIRECTIVE 
} from "../prompts/systemPrompts";

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
      anatomical_details: {
        type: Type.OBJECT,
        properties: {
          posture_and_spine: { type: Type.STRING },
          limb_placement: { type: Type.STRING },
          hands_and_fingers: { type: Type.STRING },
          head_and_gaze: { type: Type.STRING }
        }
      },
      attire_mechanics: {
        type: Type.OBJECT,
        properties: {
          garments: { type: Type.STRING },
          fit_and_physics: { type: Type.STRING }
        }
      },
      environment_and_depth: {
        type: Type.OBJECT,
        properties: {
          background_elements: { type: Type.STRING },
          surface_interactions: { type: Type.STRING }
        }
      },
      image_texture: {
        type: Type.OBJECT,
        properties: {
          quality_defects: { type: Type.STRING },
          camera_characteristics: { type: Type.STRING }
        }
      }
    }
  };

  try {
    const result = await ai.languageModel.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: VISION_STRUCT_DIRECTIVE },
            { inlineData: { mimeType, data } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const responseText = result.response.text();
    if (!responseText) throw new Error("No response from VisionStruct");
    
    return JSON.parse(responseText);

  } catch (e: any) {
    console.error("VisionStruct Error:", e);
    throw new Error("Failed to analyze image: " + e.message);
  }
};

export const analyzeSubjectImages = async (
  headshotBase64: string,
  bodyshotBase64: string,
  modelId: string = 'gemini-1.5-pro'
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const headshot = parseDataUrl(headshotBase64);
  const bodyshot = parseDataUrl(bodyshotBase64);

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      identity_profile: {
        type: Type.OBJECT,
        properties: {
          uid: { type: Type.STRING },
          age_estimate: { type: Type.STRING },
          archetype_anchor: { type: Type.STRING },
          facial_description: { type: Type.STRING },
          body_stack: { type: Type.STRING },
          realism_stack: { type: Type.STRING }
        },
        required: ["uid", "age_estimate", "archetype_anchor", "facial_description", "body_stack", "realism_stack"]
      }
    }
  };

  try {
    const result = await ai.languageModel.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            { text: LORA_FORGE_DIRECTIVE },
            { inlineData: { mimeType: headshot.mimeType, data: headshot.data } },
            { text: "Reference 1: Headshot (Focus on Identity/Face)" },
            { inlineData: { mimeType: bodyshot.mimeType, data: bodyshot.data } },
            { text: "Reference 2: Bodyshot (Focus on Somatotype/Body Structure)" }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2 // Low temperature for factual analysis
      }
    });

    const text = result.response.text();
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as AnalysisResult;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze identity");
  }
};

export const generateDatasetPrompts = async (params: {
  taskType: TaskType;
  subjectDescription: string;
  identity: IdentityContext;
  safetyMode: SafetyMode;
  count: number;
  startCount: number;
  totalTarget: number;
  previousSettings?: string[];
  modelId?: string;
}): Promise<PromptItem[]> => {
  const ai = getAiClient();
  const modelId = params.modelId || 'gemini-1.5-pro';

  // Construct the prompt context based on Vacuum Compiler
  const context = `
    ${VACUUM_COMPILER_DIRECTIVE}
    
    IDENTITY CONTEXT:
    Name: ${params.identity.name}
    Age: ${params.identity.age_estimate}
    Profession: ${params.identity.profession}
    Backstory: ${params.identity.backstory}
    Body Description: ${params.subjectDescription}
    
    TASK: Generate ${params.count} distinct image prompts.
    START INDEX: ${params.startCount + 1}
    TOTAL TARGET: ${params.totalTarget}
    
    PREVIOUSLY GENERATED (AVOID REPEATING THESE EXACT SCENARIOS):
    ${params.previousSettings?.join("\n") || "None"}
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        prompt: { type: Type.STRING },
        category: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["prompt"]
    }
  };

  try {
    const result = await ai.languageModel.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: context }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7 // Higher temp for creativity
      }
    });

    const text = result.response.text();
    if (!text) throw new Error("No response");
    
    const rawItems = JSON.parse(text) as any[];
    
    // Map to internal PromptItem structure
    return rawItems.map((item, idx) => ({
      id: item.id || generateId(),
      prompt: item.prompt,
      category: item.category || 'general',
      tags: item.tags || [],
      generationMeta: {
        type: 'lora',
        index: params.startCount + idx,
        total: params.totalTarget,
        label: `LORA-${params.startCount + idx + 1}`
      }
    }));

  } catch (e: any) {
    console.error("Prompt Generation Error:", e);
    throw e;
  }
};
