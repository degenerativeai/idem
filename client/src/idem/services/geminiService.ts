
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { PromptItem, IdentityContext, TaskType, SafetyMode, AnalysisResult, UGCSettings, INIPrompt, UGCPromptCard, PhysicalAppearance } from "../types";
import { 
  LORA_FORGE_DIRECTIVE, 
  VACUUM_COMPILER_DIRECTIVE, 
  RICH_MEDIA_DIRECTIVE_CANDID, 
  RICH_MEDIA_DIRECTIVE_STUDIO, 
  VISION_STRUCT_DIRECTIVE,
  IMAGE_INI_COMPILER_DIRECTIVE,
  CANDID_VIEW_DIRECTIVE,
  PHYSICAL_APPEARANCE_DIRECTIVE
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
  const formEnhanceInstructions = params.safetyMode === 'nsfw' ? `
=== ENHANCE FORM MODE (ACTIVE) ===
Generate prompts that emphasize and showcase the subject's physical form and body:
- Focus on poses that highlight body curves, silhouette, and physique
- Include form-fitting, revealing, or minimal clothing options (swimwear, lingerie, athletic wear, bodycon dresses)
- Emphasize body-conscious poses: stretching, arching, leaning, athletic stances
- Include scenarios: beach, pool, fitness, bedroom, boudoir, fashion editorial
- Highlight physical attributes in the body_stack with sensual but tasteful descriptions
- Camera angles that accentuate form: low angles, dramatic lighting, artistic shadows
` : `
=== STANDARD MODE (ACTIVE) ===
Generate prompts with everyday, casual scenarios and modest clothing:
- Focus on natural, relaxed poses in everyday settings
- Include casual, professional, or modest clothing options
- Emphasize lifestyle scenarios: work, social events, outdoors, daily activities
- Keep body descriptions anatomical and professional
`;

  const context = `
    ${VACUUM_COMPILER_DIRECTIVE}
    
    ${formEnhanceInstructions}
    
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

  // Helper to parse JSON with recovery for truncated responses
  const parseJSONWithRecovery = (text: string): any[] => {
    try {
      return JSON.parse(text);
    } catch (parseError: any) {
      console.warn("JSON parse failed, attempting recovery:", parseError.message);
      
      // Try to recover partial array by finding last complete object
      const lastBracket = text.lastIndexOf('}');
      if (lastBracket > 0) {
        // Find matching array structure
        let recovered = text.substring(0, lastBracket + 1);
        // Count open brackets to close properly
        const openBrackets = (recovered.match(/\[/g) || []).length;
        const closeBrackets = (recovered.match(/\]/g) || []).length;
        recovered += ']'.repeat(openBrackets - closeBrackets);
        
        try {
          const parsed = JSON.parse(recovered);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`Recovered ${parsed.length} items from truncated response`);
            return parsed;
          }
        } catch {
          // Recovery failed
        }
      }
      throw parseError;
    }
  };

  // Generate with automatic batch size reduction on failure
  const generateWithRetry = async (batchSize: number, maxRetries: number = 2): Promise<any[]> => {
    const batchContext = context.replace(
      `TASK: Generate ${params.count} distinct image prompts.`,
      `TASK: Generate ${batchSize} distinct image prompts.`
    );
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: "user", parts: [{ text: batchContext }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.7
          }
        });

        const text = result.text;
        if (!text) throw new Error("No response");
        
        return parseJSONWithRecovery(text);
      } catch (e: any) {
        const isJsonError = e.message?.includes('JSON') || e.message?.includes('Unterminated');
        
        if (isJsonError && attempt < maxRetries) {
          // Reduce batch size and retry
          const reducedSize = Math.max(3, Math.floor(batchSize / 2));
          console.log(`JSON error on attempt ${attempt + 1}, reducing batch to ${reducedSize}`);
          batchSize = reducedSize;
          continue;
        }
        throw e;
      }
    }
    throw new Error("Max retries exceeded");
  };

  try {
    // For large batches, split into smaller chunks to avoid truncation
    const MAX_BATCH_SIZE = 10;
    let allItems: any[] = [];
    
    if (params.count <= MAX_BATCH_SIZE) {
      allItems = await generateWithRetry(params.count);
    } else {
      // Split into smaller batches
      let remaining = params.count;
      while (remaining > 0) {
        const batchSize = Math.min(remaining, MAX_BATCH_SIZE);
        const batchItems = await generateWithRetry(batchSize);
        allItems = allItems.concat(batchItems);
        remaining -= batchItems.length;
        
        // If we got fewer than requested, stop to avoid infinite loop
        if (batchItems.length < batchSize) break;
      }
    }
    
    // Apply identity filter to strip facial/hair/skin descriptions
    const filteredItems = allItems.map(filterPromptItem);
    
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

export const analyzePhysicalAppearance = async (
  headshotBase64?: string | null,
  bodyshotBase64?: string | null,
  modelId: string = 'gemini-2.0-flash'
): Promise<PhysicalAppearance | null> => {
  if (!headshotBase64 && !bodyshotBase64) return null;
  
  const ai = getAiClient();
  const parts: any[] = [{ text: PHYSICAL_APPEARANCE_DIRECTIVE }];
  
  if (headshotBase64) {
    const headshot = parseDataUrl(headshotBase64);
    parts.push({ inlineData: { mimeType: headshot.mimeType, data: headshot.data } });
    parts.push({ text: "Reference 1: Headshot - Focus on face details" });
  }
  
  if (bodyshotBase64) {
    const bodyshot = parseDataUrl(bodyshotBase64);
    parts.push({ inlineData: { mimeType: bodyshot.mimeType, data: bodyshot.data } });
    parts.push({ text: "Reference 2: Bodyshot - Focus on body proportions" });
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      age_range: { type: Type.STRING },
      celebrity_match: { type: Type.STRING, nullable: true },
      face: {
        type: Type.OBJECT,
        properties: {
          eye_color: { type: Type.STRING },
          face_shape: { type: Type.STRING },
          nose: { type: Type.STRING },
          lips: { type: Type.STRING },
          teeth: { type: Type.STRING },
          jawline: { type: Type.STRING },
          distinctive: { type: Type.STRING }
        }
      },
      hair: {
        type: Type.OBJECT,
        properties: {
          color: { type: Type.STRING },
          texture: { type: Type.STRING }
        }
      },
      body: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          bust: { type: Type.STRING },
          waist: { type: Type.STRING },
          hips: { type: Type.STRING },
          glutes: { type: Type.STRING },
          height_impression: { type: Type.STRING }
        }
      },
      skin: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING },
          marks: { type: Type.STRING }
        }
      },
      identity_summary: { type: Type.STRING }
    }
  };

  try {
    const result = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    });

    const text = result.text;
    if (!text) return null;
    
    return JSON.parse(text) as PhysicalAppearance;
  } catch (e: any) {
    console.error("Physical Appearance Analysis Error:", e);
    return null;
  }
};

const UGC_PHOTO_AUTHENTICITY_TERMS = `
PHOTOGRAPHY AUTHENTICITY TERMS - Use 1-2 of these per prompt to add realism:
- Crushed shadows (dark areas lose detail, common in phone cameras)
- Blown highlights (overexposed bright areas)
- Slight motion blur (on hands, hair, or subject movement)
- Compression artifacts (JPEG quality loss)
- Lens distortion (slight barrel distortion from wide phone lens)
- Shallow depth of field (blurred background from portrait mode)
- Harsh direct flash (flat lighting, red-eye potential)
- Mixed color temperature (warm indoor lights + cool daylight)
- High ISO noise/grain (grainy texture in low light)
- Chromatic aberration (color fringing on edges)
- Vignetting (darker corners)
- Lens flare (light streaks from bright sources)
`;

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

${UGC_PHOTO_AUTHENTICITY_TERMS}

TASK: Generate ${params.count} unique UGC (User Generated Content) image prompts for social media.

CONTENT REQUEST FROM USER:
"${params.contentDescription}"

ASPECT RATIO: ${params.aspectRatio}

CRITICAL - PROMPT FORMAT:
The fullPrompt should describe the SCENE, ACTION, and VIBE - NOT the person's physical appearance.
The image generator will use reference images to fill in the subject's physical identity.

Each fullPrompt should read like: "A young woman is taking a mirror selfie in a messy bedroom, wearing an oversized band t-shirt and cotton shorts, relaxed half-smile expression. Visible skin pores and texture, flyaway hair strands. Slight phone tilt, bathroom vanity lighting with crushed shadows. Shot on iPhone, amateur framing."

DO NOT INCLUDE in fullPrompt:
- Hair color, eye color, skin tone, body type, facial features
- Any physical description of the person's appearance
- Age-specific descriptors beyond "young woman"

MUST INCLUDE in fullPrompt:
- Action/pose (taking selfie, lounging, walking, etc.)
- Clothing/outfit description
- Facial expression (smiling, focused, candid laugh, etc.)
- Scene/setting with specific details
- Physical imperfections for realism (visible pores, skin texture, flyaways)
- Camera angle that looks unposed and candid
- Lighting that's NOT perfect (mixed lighting, harsh flash, natural but uneven)
- 1-2 photography authenticity terms from the list above

REQUIREMENTS:
1. Each prompt should be a UNIQUE scenario based on the user's content request
2. Prompts must feel authentic, like a real person took them with their phone
3. Include specific imperfections (motion blur, uneven lighting, candid expressions)
4. Vary the settings, outfits, poses, and lighting across prompts
5. Use the Candid-View-I aesthetic (amateur smartphone look, NOT professional studio)
6. ONLY the subject appears in frame - NO other people visible
7. Subject is always referred to as "a young woman" - no age variation

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
        expression: {
          type: Type.STRING,
          description: "Facial expression (candid smile, focused, mid-laugh, relaxed, etc.)"
        },
        lighting: { 
          type: Type.STRING, 
          description: "Imperfect lighting (mixed color temp, harsh flash, window light with shadows, etc.)" 
        },
        camera: { 
          type: Type.STRING, 
          description: "Camera style (iPhone 15 Pro, Pixel 8, etc.) with angle and framing notes" 
        },
        imperfections: { 
          type: Type.STRING, 
          description: "Specific UGC imperfections (visible pores, flyaway hair, motion blur, crushed shadows, etc.)" 
        },
        fullPrompt: { 
          type: Type.STRING, 
          description: "Complete prompt describing: action/pose, clothing, expression, scene/setting, skin imperfections (pores, texture), camera angle, imperfect lighting, 1-2 photo authenticity terms. NO physical appearance (hair color, eye color, body type). Subject is 'a young woman'. Must look like authentic amateur UGC." 
        }
      },
      required: ["scenario", "setting", "outfit", "pose", "expression", "lighting", "camera", "imperfections", "fullPrompt"]
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
    
    return rawItems.map((item) => {
      let finalPrompt = item.fullPrompt || '';
      
      // Ensure UGC elements are appended if missing
      const hasUGCElements = /\b(iphone|smartphone|phone camera|amateur|candid|motion blur|flyaway|pores|texture)\b/i.test(finalPrompt);
      if (!hasUGCElements && finalPrompt) {
        const ugcSuffix = `. Shot on iPhone, amateur framing, natural smartphone lighting, visible skin pores, flyaway strands, authentic candid UGC aesthetic. Solo subject in frame.`;
        finalPrompt = finalPrompt.replace(/\.?\s*$/, '') + ugcSuffix;
      }
      
      return {
        id: `ugc-${generateId()}`,
        scenario: item.scenario || '',
        setting: item.setting || '',
        outfit: item.outfit || '',
        pose: item.pose || '',
        expression: item.expression || '',
        lighting: item.lighting || '',
        camera: item.camera || '',
        imperfections: item.imperfections || '',
        fullPrompt: finalPrompt
      };
    });

  } catch (e: any) {
    console.error("UGC Prompt Generation Error:", e);
    throw new Error("Failed to generate UGC prompts: " + e.message);
  }
};
