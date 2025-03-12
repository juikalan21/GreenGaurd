import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });


// Export environment variables with proper types
export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV,
  
  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,

  
  // Google Cloud
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  GOOGLE_CLOUD_STORAGE_BUCKET: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || '',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  
  // Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Weather API
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '',
  WEATHER_API_BASE_URL: process.env.WEATHER_API_BASE_URL || 'https://api.weatherapi.com/v1',
  
  
};

export default env;