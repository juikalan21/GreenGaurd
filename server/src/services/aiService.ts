import axios from 'axios';
import { env } from '../config/env';
import { generateContent, analyzeImage } from '../config/gemini';
import logger from '../config/logger';



async function fetchImageAsBase64(imageUrl: string): Promise<{data: string, mimeType: string}> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const base64Data = buffer.toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      
      return { data: base64Data, mimeType };
    } catch (error) {
      logger.error(`Error fetching image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
/**
 * Service for handling AI-related operations using Google's Gemini API
 */
export const aiService = {
  /**
   * Analyze image with AI for various agricultural purposes
   */
  async analyzeImageWithAI(
    imageUrl: string,
    analysisType: 'soil_analysis' | 'crop_health' | 'pest_disease',
    context: any
  ): Promise<any> {
    try {
      // Define prompts based on analysis type
      let prompt = '';
      
      if (analysisType === 'soil_analysis') {
        prompt = `
          Analyze this soil image and provide a detailed soil analysis report.
          
          Context:
          - Farm location: ${context.farmLocation.state}, ${context.farmLocation.district}
          - Farm size: ${context.farmSize} acres
          - Current soil type: ${context.soilType}
          - Current crops: ${context.currentCrops.join(', ')}
          
          Please provide:
          1. Estimated soil nutrient levels (N, P, K, Ca, Mg, S, Zn, Fe, Mn, Cu, B)
          2. Estimated pH and salinity
          3. Estimated soil moisture and temperature
          4. Estimated organic matter content
          5. Estimated soil compaction level
          6. Estimated microbial activity
          7. Fertilizer recommendations based on the analysis
          8. Soil amendment recommendations
          9. Recommended agricultural practices for soil improvement
          10. A detailed analysis explaining the findings and recommendations
          
          Format the response as a structured JSON object with these fields.
        `;
      } else if (analysisType === 'crop_health') {
        prompt = `
          Analyze this crop image and provide a detailed crop health assessment.
          
          Context:
          - Farm location: ${context.farmLocation.state}, ${context.farmLocation.district}
          - Crop name: ${context.cropName}
          - Crop type: ${context.cropType}
          - Planting date: ${context.plantingDate}
          - Current growth stage: ${context.growthStage}
          - Soil type: ${context.soilType}
          
          Please provide:
          1. Overall health status (excellent, good, fair, poor)
          2. Any detected issues (pests, diseases, nutrient deficiencies, etc.) with severity levels
          3. Detailed diagnosis for each detected issue
          4. Recommended actions for improving crop health
          5. Fertilizer recommendations if needed
          6. Pest control recommendations if needed
          7. Irrigation recommendations
          8. Estimated yield impact based on current health
          9. A detailed analysis explaining the findings and recommendations
          
          Format the response as a structured JSON object with these fields.
        `;
      } else if (analysisType === 'pest_disease') {
        prompt = `
          Analyze this crop image and identify any pests, diseases, or nutrient deficiencies.
          
          Context:
          - Farm location: ${context.farmLocation.state}, ${context.farmLocation.district}
          - Crop name: ${context.cropName}
          - Crop type: ${context.cropType}
          - Current growth stage: ${context.growthStage}
          
          Please provide:
          1. Identification of the pest, disease, or nutrient deficiency
          2. Confidence level of identification (0-100%)
          3. Severity level (low, medium, high)
          4. Estimated affected area percentage
          5. Common symptoms
          6. Possible causes
          7. Immediate action recommendations
          8. Preventive measures
          9. Treatment options (chemical, biological, cultural, mechanical)
          10. Risk of spread to other plants
          11. Weather conditions that may affect the issue
          12. Estimated economic impact
          13. A detailed analysis explaining the findings and recommendations
          
          Format the response as a structured JSON object with these fields.
        `;
      }
      // Fetch image and convert to base64
      const { data: imageData, mimeType } = await fetchImageAsBase64(imageUrl);

      // Call Gemini API with image
      const response = await analyzeImage(prompt, imageData, mimeType, 'gemini-2.0-flash');
      
      // Parse and return the response
      try {
        // Try to parse as JSON first
        return JSON.parse(response);
      } catch (parseError) {
        // If not valid JSON, log warning and return as text
        logger.warn(`AI response was not valid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return {
          analysis: response,
          rawResponse: true
        };
      }
    } catch (error) {
      logger.error(`AI image analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Generate crop recommendations based on soil analysis and weather data
   */
  async generateCropRecommendations(
    soilData: any,
    weatherData: any,
    preferences: any,
    farmLocation: any
  ): Promise<any> {
    try {
      const prompt = `
        Generate crop recommendations based on the following data:
        
        Soil Analysis:
        ${JSON.stringify(soilData, null, 2)}
        
        Weather Data:
        ${JSON.stringify(weatherData, null, 2)}
        
        Farmer Preferences:
        ${JSON.stringify(preferences, null, 2)}
        
        Farm Location:
        ${JSON.stringify(farmLocation, null, 2)}
        
        Please provide:
        1. Top 5 recommended crops with suitability scores (0-100)
        2. For each crop:
           - Expected yield
           - Water requirements
           - Fertilizer recommendations
           - Planting and harvest windows
           - Estimated costs and revenue
           - Potential issues and benefits
        3. A detailed analysis explaining the recommendations
        
        Format the response as a structured JSON object with these fields.
      `;

      // Call Gemini API
      const response = await generateContent(prompt, 'gemini-2.0-flash');
      
      // Parse and return the response
      try {
        // Try to parse as JSON first
        return JSON.parse(response);
      } catch (parseError) {
        // If not valid JSON, log warning and return as text
        logger.warn(`AI response was not valid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return {
          recommendations: [],
          analysis: response,
          rawResponse: true
        };
      }
    } catch (error) {
      logger.error(`AI crop recommendation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Generate irrigation schedule based on crop, soil, and weather data
   */
  async generateIrrigationSchedule(
    cropData: any,
    soilData: any,
    weatherData: any,
    waterSource: string
  ): Promise<any> {
    try {
      const prompt = `
        Generate a smart irrigation schedule based on the following data:
        
        Crop Data:
        ${JSON.stringify(cropData, null, 2)}
        
        Soil Analysis:
        ${JSON.stringify(soilData, null, 2)}
        
        Weather Data:
        ${JSON.stringify(weatherData, null, 2)}
        
        Water Source:
        ${waterSource}
        
        Please provide:
        1. A 7-day irrigation schedule with:
           - Date and time for each irrigation
           - Water amount in liters
           - Duration in minutes
           - Recommended irrigation method
        2. Water conservation recommendations
        3. Fertigation recommendations if applicable
        4. Adjustments based on weather forecast
        5. A detailed analysis explaining the schedule
        
        Format the response as a structured JSON object with these fields.
      `;

      // Call Gemini API
      const response = await generateContent(prompt, 'gemini-2.0-flash');
      
      // Parse and return the response
      try {
        // Try to parse as JSON first
        return JSON.parse(response);
      } catch (parseError) {
        // If not valid JSON, log warning and return as text
        logger.warn(`AI response was not valid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return {
          schedule: [],
          recommendations: [],
          analysis: response,
          rawResponse: true
        };
      }
    } catch (error) {
      logger.error(`AI irrigation schedule error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Generate yield forecast based on crop, soil, and weather data
   */
  async generateYieldForecast(
    cropData: any,
    soilData: any,
    weatherData: any,
    historicalData: any
  ): Promise<any> {
    try {
      const prompt = `
        Generate a yield forecast based on the following data:
        
        Crop Data:
        ${JSON.stringify(cropData, null, 2)}
        
        Soil Analysis:
        ${JSON.stringify(soilData, null, 2)}
        
        Weather Data:
        ${JSON.stringify(weatherData, null, 2)}
        
        Historical Data:
        ${JSON.stringify(historicalData, null, 2)}
        
        Please provide:
        1. Yield estimate with confidence level
        2. Comparison with historical yields
        3. Analysis of influencing factors (weather, soil, pests, diseases, management)
        4. Market projection if applicable
        5. Optimization recommendations to improve yield
        6. A detailed analysis explaining the forecast
        
        Format the response as a structured JSON object with these fields.
      `;

      // Call Gemini API
      const response = await generateContent(prompt, 'gemini-2.0-flash');
      
      // Parse and return the response
      try {
        // Try to parse as JSON first
        return JSON.parse(response);
      } catch (parseError) {
        // If not valid JSON, log warning and return as text
        logger.warn(`AI response was not valid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return {
          yieldEstimate: {},
          analysis: response,
          rawResponse: true
        };
      }
    } catch (error) {
      logger.error(`AI yield forecast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
};

export default aiService;
export const analyzeImageWithAI = aiService.analyzeImageWithAI;