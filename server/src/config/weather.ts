import axios from 'axios';
import { env } from './env';

// Create an axios instance for weather API
const weatherApiClient = axios.create({
  baseURL: env.WEATHER_API_BASE_URL,
  params: {
    key: env.WEATHER_API_KEY,
  },
});

// Keep interfaces as they are - they define the API response structure
interface CurrentWeatherResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    precip_mm: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    vis_km: number;
    uv: number;
  };
}

// Simplified forecast interface
interface ForecastWeatherResponse extends CurrentWeatherResponse {
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        avghumidity: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
      astro: {
        sunrise: string;
        sunset: string;
      };
    }>;
  };
}

// Get current weather data
export const getCurrentWeather = async (
  location: string
): Promise<CurrentWeatherResponse> => {
  try {
    const response = await weatherApiClient.get<CurrentWeatherResponse>('/current.json', {
      params: { q: location },
    });
    
    return response.data;
  } catch (error) {
    console.error(`Weather error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

// Get forecast weather data
export const getForecastWeather = async (
  location: string,
  days: number = 7
): Promise<ForecastWeatherResponse> => {
  try {
    const response = await weatherApiClient.get<ForecastWeatherResponse>('/forecast.json', {
      params: { q: location, days },
    });
    
    return response.data;
  } catch (error) {
    console.error(`Forecast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export default { getCurrentWeather, getForecastWeather };
