import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Helper function to get a generative model
export const getGenerativeModel = (modelName: string = 'gemini-2.0-flash') => {
  return genAI.getGenerativeModel({ model: modelName });
};

// Helper function for text-only generation
export const generateContent = async (prompt: string, modelName: string = 'gemini-1.5-pro') => {
  try {
    const model = getGenerativeModel(modelName);
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error(`Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

// Helper function for image analysis
export const analyzeImage = async (
  prompt: string,
  imageData: string,
  mimeType: string,
  modelName: string = 'gemini-2.0-flash'
) => {
  try {
    const model = getGenerativeModel(modelName);
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType
        }
      }
    ]);
    
    return result.response.text();
  } catch (error) {
    console.error(`Error analyzing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export default { getGenerativeModel, generateContent, analyzeImage };
