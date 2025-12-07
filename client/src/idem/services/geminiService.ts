
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { PromptItem, IdentityContext, TaskType, SafetyMode, AnalysisResult, UGCSettings, INIPrompt, UGCPromptCard } from "../types";
import { 
  LORA_FORGE_DIRECTIVE, 
  VACUUM_COMPILER_DIRECTIVE, 
  RICH_MEDIA_DIRECTIVE_CANDID, 
  RICH_MEDIA_DIRECTIVE_STUDIO, 
  VISION_STRUCT_DIRECTIVE,
  IMAGE_INI_COMPILER_DIRECTIVE,
  CANDID_VIEW_DIRECTIVE
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

const IDENTITY_PATTERNS = [
  /\b(dark|light|jet|deep|bright)\s+(black|brown|blonde|curly|wavy|straight|long|short|medium)\s+hair(ed)?/gi,
  /\b(long|short|medium)\s+(curly|wavy|straight|frizzy|kinky|coiled)\s+hair(ed)?/gi,
  /\b(blonde|brunette|redhead|auburn|raven|ginger|platinum|strawberry)\s+hair(ed)?/gi,
  /\b(blonde|brunette|redhead|auburn|raven|ginger|platinum|strawberry)\b(?=\s*,|\s*$|\s+(?:woman|man|person|model|subject|with|and|in))/gi,
  /\b(black|brown|golden|silver|grey|gray|white|dark|light)[- ]?hair(ed)?/gi,
  /\b(long|short|medium)[- ]?(length)?[- ]?hair(ed)?/gi,
  /\b(shoulder|waist|mid[- ]?back)[- ]?length[- ]?hair/gi,
  /\b(curly|wavy|straight|frizzy|kinky|coiled)[- ]?hair(ed)?/gi,
  /\bhair[- ]?(color|colour|style|length|texture)/gi,
  /\bcurly\s+blonde\b/gi,
  /\bblonde\s+curly\b/gi,
  /\b(voluminous|tousled|messy|sleek|shiny)\s+hair\b/gi,
  /\b(blue|green|brown|hazel|gray|grey|amber|violet)[- ]?eye[ds]?\b/gi,
  /\beye[- ]?(color|colour)/gi,
  /\balmond[- ]?shaped[- ]?eyes?/gi,
  /\b(pale|tan|tanned|fair|olive|ebony|ivory|porcelain|caramel|chocolate|mocha|bronze|copper)[- ]?(toned|skinned)\b/gi,
  /\b(pale|tan|tanned|fair|olive|ebony|ivory|porcelain|caramel|chocolate|mocha|bronze|copper)[- ]?(skin|complexion)\b/gi,
  /\bskin[- ]?(tone|color|colour)/gi,
  /\b(fair|dark|light)[- ]?complex(ion(ed)?)?/gi,
  /\b(freckled|freckles)\b/gi,
  /\b(full|thin|pouty|plump)[- ]?lips\b/gi,
  /\b(small|large|button|pointed)[- ]?nose\b/gi,
  /\b(high|prominent|defined)[- ]?cheekbones?\b/gi,
  /\b(strong|soft|angular|rounded|square|chiseled)[- ]?(jawline|jaw)\b/gi,
  /\b(asian|caucasian|african|hispanic|latina?o?|european|middle[- ]?eastern)\b/gi,
  /\bwith\s+(blonde|brunette|brown|black|red|auburn|golden)\s+hair\b/gi,
  /\bwith\s+(blue|green|brown|hazel)\s+eyes\b/gi,
  /\bwearing\s+glasses\b/gi,
  /\bclear[- ]?framed\s+glasses\b/gi,
  /\b(round|rectangular|cat[- ]?eye|aviator)\s+glasses\b/gi,
  /\bglasses\b/gi,
  /\b(young|middle[- ]?aged|elderly)\s+(woman|man|adult)\b/gi,
  /\b(slender|slim|curvy|athletic|petite)\s+(build|frame|figure)\b/gi,
  /\b(a\s+)?(beautiful|attractive|handsome|pretty|gorgeous|stunning)\s+(woman|man|lady|gentleman|girl|boy|person|model|female|male)\b/gi,
  /\b(a\s+)?(woman|man|lady|gentleman|girl|boy|female|male|person|model|subject)\s+(with|wearing|in|has|having)\b/gi,
  /\b(the\s+)?(woman|man|lady|gentleman|girl|boy|female|male|person|model|subject)\s+(is|stands|sits|looks|gazes|poses|appears)\b/gi,
  /\b(she|he|her|his)\s+(is|has|wears|wearing|stands|sits|looks|gazes|poses|appears)\b/gi,
  /\b(in\s+her|in\s+his)\s+(20s|30s|40s|50s|60s|70s|80s|teens|early|mid|late)\b/gi,
  /\b(\d+)[- ]?year[- ]?old\s*(woman|man|lady|gentleman|girl|boy|female|male|person|model)?\b/gi,
  /\baged?\s+(\d+)/gi,
  /\b(tall|short|thin|thick|heavy|overweight|underweight)\s+(woman|man|person|lady|figure|frame)\b/gi,
  /\b(muscular|toned|fit|lean|stocky)\s+(body|build|frame|physique)\b/gi,
  /\bthe\s+(woman|man|lady|gentleman|girl|boy|female|male|person|model|subject)('s)?\b/gi,
  /\ba\s+(woman|man|lady|gentleman|girl|boy|female|male|person|model)\b/gi,
  /\bfacial\s+(features?|structure|expression)\b/gi,
  /\b(her|his)\s+(face|body|figure|physique|build|frame|appearance|look|gaze|expression|features?)\b/gi,
  /\b(beautiful|attractive|handsome|pretty|gorgeous|stunning)\s+(face|appearance|features?)\b/gi,
];

export const stripIdentityDescriptions = (text: string): string => {
  let result = text;
  for (const pattern of IDENTITY_PATTERNS) {
    result = result.replace(pattern, '');
  }
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/,\s*\./g, '.');
  result = result.replace(/^\s*,\s*/g, '');
  result = result.replace(/\s*,\s*$/g, '');
  return result.trim();
};

const filterPromptItem = (item: any): any => {
  if (item.generation_data?.final_prompt_string) {
    item.generation_data.final_prompt_string = stripIdentityDescriptions(
      item.generation_data.final_prompt_string
    );
  }
  if (item.subject?.description) {
    item.subject.description = stripIdentityDescriptions(item.subject.description);
  }
  return item;
};

// Helper to extract MIME type and data from Base64 Data URI
const parseDataUrl = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data format");
  return { mimeType: matches[1], data: matches[2] };
};

export const analyzeImageWithDirective = async (
  imageDataUrl: string,
  modelId: string = 'gemini-2.0-flash'
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
    const result = await ai.models.generateContent({
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
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const responseText = result.text;
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
  modelId: string = 'gemini-2.0-flash'
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
          name: { type: Type.STRING },
          age_estimate: { type: Type.STRING },
          archetype_anchor: { type: Type.STRING },
          facial_description: { type: Type.STRING },
          body_stack: { type: Type.STRING },
          realism_stack: { type: Type.STRING }
        },
        required: ["name", "age_estimate", "archetype_anchor", "facial_description", "body_stack", "realism_stack"]
      }
    }
  };

  try {
    const result = await ai.models.generateContent({
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
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    const text = result.text;
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
  const modelId = params.modelId || 'gemini-2.0-flash';

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
        generation_data: {
          type: Type.OBJECT,
          properties: {
            final_prompt_string: { type: Type.STRING },
            shot_type: { type: Type.STRING },
            angle: { type: Type.STRING },
            reference_logic: {
              type: Type.OBJECT,
              properties: {
                primary_ref: { type: Type.STRING },
                secondary_ref: { type: Type.STRING }
              },
              required: ["primary_ref", "secondary_ref"]
            }
          },
          required: ["final_prompt_string", "shot_type", "angle", "reference_logic"]
        },
        subject: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            age: { type: Type.STRING },
            expression: { type: Type.STRING },
            body: { type: Type.STRING },
            imperfections: {
              type: Type.OBJECT,
              properties: {
                body_texture: { type: Type.STRING },
                clothing_wear: { type: Type.STRING },
                general: { type: Type.STRING }
              },
              required: ["body_texture", "clothing_wear", "general"]
            },
            clothing: {
              type: Type.OBJECT,
              properties: {
                top: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["type", "color"]
                },
                bottom: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["type", "color"]
                }
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
          },
          required: ["shot_type", "angle", "camera_style"]
        },
        tech_specs: {
          type: Type.OBJECT,
          properties: {
            camera_physics: { type: Type.STRING },
            sensor_fidelity: { type: Type.STRING },
            lighting_physics: { type: Type.STRING }
          },
          required: ["camera_physics", "sensor_fidelity", "lighting_physics"]
        }
      },
      required: ["generation_data", "subject", "background", "photography", "tech_specs"]
    }
  };

  try {
    const result = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: context }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response");
    
    const rawItems = JSON.parse(text) as any[];
    
    // Apply identity filter to strip facial/hair/skin descriptions
    const filteredItems = rawItems.map(filterPromptItem);
    
    // Map to internal PromptItem structure - store the full JSON as text
    return filteredItems.map((item, idx) => {
      const jsonText = JSON.stringify(item);
      const shotType = item.photography?.shot_type || item.generation_data?.shot_type || 'Shot';
      const angle = item.photography?.angle || item.generation_data?.angle || '';
      return {
        id: generateId(),
        text: jsonText,
        tags: item.background?.elements || [],
        generationMeta: {
          type: shotType.toUpperCase(),
          index: params.startCount + idx + 1,
          total: params.totalTarget,
          label: angle
        }
      };
    });

  } catch (e: any) {
    console.error("Prompt Generation Error:", e);
    throw e;
  }
};

export const analyzeImageINI = async (
  imageDataUrl: string,
  modelId: string = 'gemini-2.5-pro'
): Promise<INIPrompt> => {
  const ai = getAiClient();
  const { mimeType, data } = parseDataUrl(imageDataUrl);

  try {
    const result = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: IMAGE_INI_COMPILER_DIRECTIVE },
            { inlineData: { mimeType, data } }
          ]
        }
      ],
      config: {
        temperature: 0.3
      }
    });

    const responseText = result.text;
    if (!responseText) throw new Error("No response from INI Compiler");
    
    const iniMatch = responseText.match(/```ini\s*([\s\S]*?)```/);
    const iniContent = iniMatch ? iniMatch[1] : responseText;
    
    const parseField = (field: string): string => {
      const regex = new RegExp(`\\[${field}\\]\\s*=\\s*(.*)`, 'i');
      const match = iniContent.match(regex);
      return match ? match[1].trim() : '';
    };

    return {
      desc: parseField('desc'),
      objs: parseField('objs'),
      chars: parseField('chars'),
      style: parseField('style'),
      comp: parseField('comp'),
      light: parseField('light'),
      pal: parseField('pal'),
      geom: parseField('geom'),
      micro: parseField('micro') || undefined,
      sym: parseField('sym') || undefined,
      scene: parseField('scene'),
      must: parseField('must'),
      avoid: parseField('avoid'),
      notes: parseField('notes') || undefined,
      raw: iniContent.trim()
    };

  } catch (e: any) {
    console.error("INI Compiler Error:", e);
    throw new Error("Failed to analyze image: " + e.message);
  }
};

export const convertINIToPrompt = (ini: INIPrompt, stripIdentity: boolean = false): string => {
  let parts: string[] = [];
  
  if (ini.desc) parts.push(ini.desc);
  if (ini.style) parts.push(ini.style);
  if (ini.comp) parts.push(ini.comp);
  if (ini.light) parts.push(ini.light);
  if (ini.scene) parts.push(ini.scene);
  if (ini.objs) parts.push(`Objects: ${ini.objs}`);
  if (!stripIdentity && ini.chars) parts.push(ini.chars);
  if (ini.geom) parts.push(ini.geom);
  if (ini.pal) parts.push(`Colors: ${ini.pal}`);
  if (ini.micro) parts.push(ini.micro);
  if (ini.must) parts.push(`Must include: ${ini.must}`);
  
  let prompt = parts.join('. ').replace(/\.\./g, '.');
  
  if (stripIdentity) {
    prompt = stripIdentityDescriptions(prompt);
  }
  
  return prompt;
};

export const generateUGCPrompts = async (params: {
  contentDescription: string;
  count: number;
  aspectRatio: string;
  modelId?: string;
}): Promise<UGCPromptCard[]> => {
  const ai = getAiClient();
  const modelId = params.modelId || 'gemini-2.0-flash';

  const userPrompt = `
${CANDID_VIEW_DIRECTIVE}

TASK: Generate ${params.count} unique UGC (User Generated Content) image prompts for social media.

CONTENT REQUEST FROM USER:
"${params.contentDescription}"

ASPECT RATIO: ${params.aspectRatio}

REQUIREMENTS:
1. Each prompt should be a UNIQUE scenario based on the user's content request
2. Prompts must feel authentic, like a real person took them with their phone
3. Include specific imperfections (motion blur, uneven lighting, candid expressions)
4. Vary the settings, outfits, poses, and lighting across prompts
5. Use the Candid-View-I aesthetic (amateur smartphone look, NOT professional studio)
6. Make prompts detailed enough for high-quality image generation

Generate ${params.count} prompts as a JSON array.
`;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        scenario: { 
          type: Type.STRING, 
          description: "Brief 1-2 sentence description of the candid moment being captured" 
        },
        setting: { 
          type: Type.STRING, 
          description: "Specific location/environment with realistic details" 
        },
        outfit: { 
          type: Type.STRING, 
          description: "Casual, realistic clothing appropriate for the scenario" 
        },
        pose: { 
          type: Type.STRING, 
          description: "Natural, unposed body position and action" 
        },
        lighting: { 
          type: Type.STRING, 
          description: "Natural lighting conditions (golden hour, window light, mixed, etc.)" 
        },
        camera: { 
          type: Type.STRING, 
          description: "Camera style (iPhone 15 Pro portrait mode, Pixel 8, etc.) with focal length and aperture" 
        },
        imperfections: { 
          type: Type.STRING, 
          description: "Specific curated imperfections (slight motion blur on hands, flyaway hair, etc.)" 
        },
        fullPrompt: { 
          type: Type.STRING, 
          description: "Complete, detailed image generation prompt combining all elements for authentic UGC photo" 
        }
      },
      required: ["scenario", "setting", "outfit", "pose", "lighting", "camera", "imperfections", "fullPrompt"]
    }
  };

  try {
    const result = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.85
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Candid-View-I");
    
    const rawItems = JSON.parse(text) as any[];
    
    return rawItems.map((item, idx) => ({
      id: `ugc-${generateId()}`,
      scenario: item.scenario || '',
      setting: item.setting || '',
      outfit: item.outfit || '',
      pose: item.pose || '',
      lighting: item.lighting || '',
      camera: item.camera || '',
      imperfections: item.imperfections || '',
      fullPrompt: item.fullPrompt || ''
    }));

  } catch (e: any) {
    console.error("UGC Prompt Generation Error:", e);
    throw new Error("Failed to generate UGC prompts: " + e.message);
  }
};
