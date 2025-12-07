
import { ImageGenerationOptions, ImageGenerationResult } from '../types';

// Helper for timeouts
const safeApiRequest = async (url: string, options: any) => {
    const TIMEOUT_MS = 90000;
    try {
        return await Promise.race([
            fetch(url, options),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request Timed Out")), TIMEOUT_MS))
        ]);
    } catch (e: any) {
        return { ok: false, status: 408, text: async () => e.message, json: async () => ({ error: e.message }) };
    }
};

const generateWavespeed = async (options: ImageGenerationOptions): Promise<ImageGenerationResult> => {
    try {
        console.log("Sending request to Wavespeed...");

        // Determine Mode: Standard Text-to-Image OR Edit (Reference Image)
        const hasRefs = options.referenceImages && options.referenceImages.length > 0;
        const baseUrl = "https://api.wavespeed.ai/api/v3/google/gemini-3-pro-image";
        const url = hasRefs ? `${baseUrl}/edit` : `${baseUrl}/text-to-image`;

        console.log(`Wavespeed Mode: ${hasRefs ? 'EDIT' : 'STANDARD'} (${url})`);

        const payload: any = {
            prompt: options.prompt, // Prompt is required
            aspect_ratio: options.aspectRatio,
            resolution: options.resolution === '4k' ? "2k" : "1k", // Docs show "1k". Wavespeed likely caps at 2k for this model.
            enable_sync_mode: true,
            enable_base64_output: true,
            output_format: "png"
        };

        if (hasRefs) {
            payload.images = options.referenceImages?.map(img => img.startsWith('data:') ? img : `data:image/png;base64,${img}`) || [];
        }

        const payloadDebug = JSON.stringify(payload);
        console.log("Wavespeed Request Payload:", payloadDebug);

        const response = await safeApiRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${options.apiKey}` },
            body: payloadDebug
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Wavespeed Error Body:", errText);
            return { ok: false, error: `Wavespeed (${response.status}): ${errText}` };
        }

        const data: any = await response.json();
        console.log("Wavespeed success:", data);

        let resultData = data.data || data;

        // --- Standardized Parsing ---
        if (typeof resultData === 'string') {
            if (resultData.startsWith('http')) return { ok: true, url: resultData };
            const b64 = resultData.replace(/^data:image\/\w+;base64,/, "");
            return { ok: true, b64_json: b64 };
        }

        if (resultData.image_url) return { ok: true, url: resultData.image_url };
        if (resultData.base64) return { ok: true, b64_json: resultData.base64 };
        if (resultData.url) return { ok: true, url: resultData.url };

        if (resultData.output) {
            if (resultData.output.url) return { ok: true, url: resultData.output.url };
            if (resultData.output.base64) return { ok: true, b64_json: resultData.output.base64 };
        }

        if (Array.isArray(resultData) && resultData[0]) {
            if (resultData[0].b64_json) return { ok: true, b64_json: resultData[0].b64_json };
            if (resultData[0].url) return { ok: true, url: resultData[0].url };
        }

        if (resultData.outputs && Array.isArray(resultData.outputs) && resultData.outputs[0]) {
            const output = resultData.outputs[0];
            if (typeof output === 'string') {
                const base64Match = output.match(/base64,(.+)$/);
                if (base64Match && base64Match[1]) return { ok: true, b64_json: base64Match[1] };
                if (output.startsWith('http')) return { ok: true, url: output };
            }
        }

        return { ok: false, error: "Unknown Wavespeed response format: " + JSON.stringify(data).substring(0, 100) };

    } catch (e: any) {
        console.error("Wavespeed Exception:", e);
        return { ok: false, error: e.message };
    }
};

const generateGoogle = async (options: ImageGenerationOptions): Promise<ImageGenerationResult> => {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${options.apiKey}`;

        let finalPrompt = options.prompt;
        if (options.resolution === '4k') finalPrompt = `4K Ultra HD, Highly Detailed, ${options.prompt}`;

        const parts: any[] = [{ text: finalPrompt }];
        if (options.referenceImages) {
            options.referenceImages.forEach(img => {
                const b64 = img.includes('base64,') ? img.split('base64,')[1] : img;
                parts.push({ inlineData: { mimeType: "image/png", data: b64 } });
            });
        }

        const payload = {
            contents: [{ parts }],
            generationConfig: {
                candidateCount: 1,
                imageConfig: { imageSize: options.resolution?.toUpperCase() || '2K', aspectRatio: options.aspectRatio }
            }
        };

        const response = await safeApiRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) return { ok: false, error: `Google (${response.status}): ${await response.text()}` };

        const data: any = await response.json();
        const cand = data.candidates?.[0];

        if (cand?.content?.parts) {
            for (const part of cand.content.parts) {
                if (part.inlineData?.data) return { ok: true, b64_json: part.inlineData.data };
                if (part.inline_data?.data) return { ok: true, b64_json: part.inline_data.data };
            }
        }

        // If we down here, no image. Check for safety/finish reasons.
        if (cand?.finishReason) {
            const reason = cand.finishReason;
            const safety = cand.safetyRatings?.map((r: any) => `${r.category}: ${r.probability}`).join(', ');
            return { ok: false, error: `Generation Blocked: ${reason} (Safety: ${safety || 'N/A'})` };
        }

        return { ok: false, error: "Invalid Google response structure: " + JSON.stringify(data).substring(0, 200) };

    } catch (e: any) {
        return { ok: false, error: e.message };
    }
};

export const generateImage = async (options: ImageGenerationOptions): Promise<ImageGenerationResult> => {
    return options.provider === 'wavespeed' ? generateWavespeed(options) : generateGoogle(options);
};
