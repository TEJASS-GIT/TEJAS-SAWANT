
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult } from "../types";

const MAX_RETRIES = 2;
const INITIAL_DELAY = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function translateToASL(text: string, retryCount = 0): Promise<TranslationResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      // Flash has much higher quota limits than Pro on the free tier
      model: "gemini-3-flash-preview",
      contents: `Expert ASL Linguist Mode. 
      Input: "${text}"
      
      Task:
      1. If Devanagari (Hindi), translate to English first.
      2. Convert English to ASL Gloss sequence.
      3. Generate 2-hand coordinate animations (-100 to 100 range).
      
      ASL Linguistic Rules:
      - Center is (0,0). Left resting is (-80, 50). Right resting is (80, 50).
      - Use 'B', 'A', '5', '1', 'C', 'S' handshapes.
      - Dominant hand (Right) moves more. Non-dominant (Left) supports.
      - Output valid JSON matching the provided schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            translatedEnglish: { type: Type.STRING },
            aslStructure: { type: Type.STRING },
            glosses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  gloss: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  handshapeDescription: { type: Type.STRING },
                  isTwoHanded: { type: Type.BOOLEAN },
                  animation: {
                    type: Type.OBJECT,
                    properties: {
                      leftHand: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            handshape: { type: Type.STRING },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            rotation: { type: Type.NUMBER },
                            duration: { type: Type.NUMBER }
                          },
                          required: ["handshape", "x", "y", "rotation", "duration"]
                        }
                      },
                      rightHand: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            handshape: { type: Type.STRING },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            rotation: { type: Type.NUMBER },
                            duration: { type: Type.NUMBER }
                          },
                          required: ["handshape", "x", "y", "rotation", "duration"]
                        }
                      }
                    },
                    required: ["leftHand", "rightHand"]
                  }
                },
                required: ["word", "gloss", "explanation", "handshapeDescription", "isTwoHanded", "animation"]
              }
            }
          },
          required: ["originalText", "aslStructure", "glosses"]
        }
      }
    });

    const rawText = response.text;
    const jsonStr = rawText.includes('```json') 
      ? rawText.split('```json')[1].split('```')[0].trim() 
      : rawText.trim();

    return JSON.parse(jsonStr);
  } catch (error: any) {
    // Detect 429 (Quota) or 503 (Busy)
    const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
    const isBusyError = error.message?.includes('503') || error.message?.includes('UNAVAILABLE');

    if ((isQuotaError || isBusyError) && retryCount < MAX_RETRIES) {
      // Try to extract retryDelay from the error if available
      let delay = INITIAL_DELAY * Math.pow(3, retryCount);
      if (error.details?.[0]?.retryDelay) {
        const seconds = parseInt(error.details[0].retryDelay);
        if (!isNaN(seconds)) delay = (seconds + 1) * 1000;
      }

      console.warn(`API Limit reached. Retrying in ${delay}ms...`);
      await sleep(delay);
      return translateToASL(text, retryCount + 1);
    }
    
    throw error;
  }
}
