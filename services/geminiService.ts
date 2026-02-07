import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Initialize client safely (assuming env is present in runtime)
const getClient = () => {
  if (!API_KEY) {
    console.warn("Gemini API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const generateComicScript = async (premise: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key missing.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional comic book writer. 
      Create a 4-panel comic strip script based on this premise: "${premise}".
      
      Format the output strictly as JSON without markdown code blocks.
      Structure:
      [
        { "panel": 1, "description": "Visual description", "dialogue": "Character: speech" },
        ...
      ]`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return response.text || "[]";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "[]";
  }
};

export const generateSFX = async (action: string): Promise<string[]> => {
  const ai = getClient();
  if (!ai) return ["POW!", "BAM!"];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 comic book sound effects (onomatopoeia) for this action: "${action}". Return only a JSON array of strings.`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return ["BOOM", "CRASH", "SWOOSH"];
  }
};