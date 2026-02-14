
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult } from "../types";

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function translateToASL(text: string, retryCount = 0): Promise<TranslationResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      // Switching to Pro for better reasoning on complex linguistic transformations
      model: "gemini-3-pro-preview",
      contents: `You are an expert ASL (American Sign Language) linguist. 
      Task: 
      1. Detect if the input is in Devanagari script (e.g., Hindi). 
      2. If it is Devanagari, translate it to English first.
      3. Then, translate that English into authentic ASL Glosses.
      4. For each gloss, provide a coordinated sequence of animation keyframes for BOTH hands (Left and Right) based on original ASL linguistic data.
      
      Linguistic Rules:
      - Dominant hand (Right) performs active movements.
      - Non-dominant hand (Left) provides support or mirroring for two-handed signs.
      - If the sign is one-handed, the left hand stays at (x: -80, y: 50).
      - Coordinates: (x, y) -100 to 100. (0,0) is center.
      - Handshapes (Proxies): 'B' (flat), 'A' (fist), '5' (open), '1' (pointing).
      
      Input Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            translatedEnglish: { type: Type.STRING, description: "The English translation if input was Devanagari" },
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
    // Handle 503 Service Unavailable or 429 Too Many Requests with exponential backoff
    const isRetryable = error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('UNAVAILABLE');
    
    if (isRetryable && retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);
      console.warn(`Gemini API busy. Retrying in ${delay}ms... (Attempt ${retryCount + 1})`);
      await sleep(delay);
      return translateToASL(text, retryCount + 1);
    }
    
    throw error;
  }
}
