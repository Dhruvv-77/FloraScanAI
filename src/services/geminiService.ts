import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export async function analyzeLeafImage(imageFile: File): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please add it to your secrets.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Convert File to base64
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = `
    Analyze this plant leaf image as a professional botanist and plant pathologist.
    
    CRITICAL: At the very beginning of your response, provide these two metrics EXACTLY in this format:
    MATCH_CONFIDENCE: [0-100]%
    HEALTH_SCORE: [0-100]%
    
    Followed by a detailed report in Markdown format including:
    
    1. **Identification**: Common name and Scientific name.
    2. **Health Status**: Is it healthy, or are there signs of disease, pests, or nutrient deficiencies?
    3. **Lifecycle**: Estimated lifespan of this plant species under optimal conditions.
    4. **Detailed Analysis**: Describe what you see in the leaf (color, spots, texture).
    5. **Care & Treatment**: 
       - If diseased: Identify the disease and provide clear, actionable steps to cure it.
       - If healthy: Provide maintenance tips to keep it that way.
    6. **Fun Fact**: An interesting botanical fact about this species.

    Please use clear headings and bullet points. Be concise but thorough.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: imageFile.type,
            },
          },
        ],
      },
    });
    
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze leaf image. Please try again with a clearer photo.");
  }
}
